import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Env ───────────────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret'

// ── Database mock ─────────────────────────────────────────────────────────────
const mockDbWrite = vi.fn()

vi.mock('../../src/config/database.js', () => ({
  db: { write: (...args) => mockDbWrite(...args), query: (...args) => mockDbWrite(...args) },
  cache: {
    set: vi.fn(),
    setPresence: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('../../src/middlewares/audit.middleware.js', () => ({
  writeAuditLog: vi.fn(),
}))

// ── Helper to simulate Koa context ────────────────────────────────────────────
function createCtx(overrides = {}) {
  const ctx = {
    state: {
      user: {
        id: 'user-uuid-123',
        role: 'user',
        companyId: 'company-uuid-456',
      },
    },
    request: { body: {} },
    status: 200,
    body: null,
    app: { context: { io: null } },
    ...overrides,
  }
  return ctx
}

// ── Import the route handler ──────────────────────────────────────────────────
// We import the router module to get access to the route handler directly.
// The Koa router stores matched middleware internally. Instead of booting a full
// server, we extract the handler function from the router stack.  This keeps the
// test fast and isolated.
const routerModule = await import('../../src/routes/users.routes.js')
const router = routerModule.default

// Utility: find the handler registered for POST /me/fcm-token
function findFcmHandler() {
  const layer = router.stack.find(
    (l) => l.methods.includes('POST') && l.path === '/me/fcm-token',
  )
  if (!layer) throw new Error('POST /me/fcm-token route not found in router stack')
  // The last middleware in the stack array is the actual handler
  return layer.stack[layer.stack.length - 1]
}

// ─────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────
describe('POST /api/users/me/fcm-token', () => {
  let handler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = findFcmHandler()

    // Default mock: UPDATE succeeds
    mockDbWrite.mockResolvedValue({ rowCount: 1 })
  })

  // ───── Happy path ─────────────────────────────────────────────────
  it('saves a valid FCM token and responds with success', async () => {
    const validToken = 'a'.repeat(150) // typical FCM token is ~150 chars
    const ctx = createCtx({ request: { body: { token: validToken } } })

    await handler(ctx)

    expect(ctx.body).toEqual({ success: true })
    expect(mockDbWrite).toHaveBeenCalledWith(
      'UPDATE users SET fcm_token = $2, updated_at = NOW() WHERE id = $1',
      ['user-uuid-123', validToken],
    )
  })

  // ───── Minimum length token ───────────────────────────────────────
  it('accepts a token of exactly 20 characters (minimum valid length)', async () => {
    const minToken = 'x'.repeat(20)
    const ctx = createCtx({ request: { body: { token: minToken } } })

    await handler(ctx)

    expect(ctx.status).not.toBe(400)
    expect(ctx.body).toEqual({ success: true })
  })

  // ───── Validation: empty token ────────────────────────────────────
  it('rejects an empty string token with 400', async () => {
    const ctx = createCtx({ request: { body: { token: '' } } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(ctx.body.message).toMatch(/inválido/i)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: missing token ──────────────────────────────────
  it('rejects when token is not provided at all', async () => {
    const ctx = createCtx({ request: { body: {} } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: null token ─────────────────────────────────────
  it('rejects a null token with 400', async () => {
    const ctx = createCtx({ request: { body: { token: null } } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: non-string token ───────────────────────────────
  it('rejects a numeric token with 400', async () => {
    const ctx = createCtx({ request: { body: { token: 12345678901234567890 } } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: too short token ────────────────────────────────
  it('rejects a token shorter than 20 characters', async () => {
    const ctx = createCtx({ request: { body: { token: 'short' } } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: too long token ─────────────────────────────────
  it('rejects a token longer than 4096 characters', async () => {
    const ctx = createCtx({ request: { body: { token: 'x'.repeat(4097) } } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Validation: missing body entirely ──────────────────────────
  it('handles missing request body gracefully', async () => {
    const ctx = createCtx({ request: { body: undefined } })

    await handler(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.success).toBe(false)
    expect(mockDbWrite).not.toHaveBeenCalled()
  })

  // ───── Uses the authenticated user ID ─────────────────────────────
  it('uses the user ID from auth state, not from body', async () => {
    const validToken = 'a'.repeat(100)
    const ctx = createCtx({ request: { body: { token: validToken, userId: 'hacker-id' } } })

    await handler(ctx)

    // Should use ctx.state.user.id, NOT body.userId
    expect(mockDbWrite).toHaveBeenCalledWith(
      expect.any(String),
      ['user-uuid-123', validToken],
    )
  })
})
