import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'

vi.mock('../../src/config/database.js', () => ({
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

vi.mock('../../src/repositories/user.repository.js', () => ({
  createAdminUser: vi.fn(),
  createUserWithSeatLock: vi.fn(),
  findActiveBasicByUsernameOrEmail: vi.fn(),
  findActiveByEmail: vi.fn(),
  findActiveByUsernameOrEmail: vi.fn(),
  findActiveById: vi.fn(),
  findById: vi.fn(),
  findByUsernameOrEmail: vi.fn(),
  findProfileById: vi.fn(),
  getTwoFactorInfo: vi.fn(),
  listAdminsByCompany: vi.fn(),
  setTwoFactorSecret: vi.fn(),
  updateLastSeen: vi.fn(),
  updatePassword: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
}))

vi.mock('../../src/repositories/company.repository.js', () => ({
  createTrialCompany: vi.fn(),
  getPlanInfo: vi.fn(),
}))

vi.mock('../../src/repositories/invite.repository.js', () => ({
  getInviteForJoin: vi.fn(),
  getInviteWithCompanyByCode: vi.fn(),
  incrementInviteUses: vi.fn(),
}))

const { registerSchema } = await import('../../src/schemas/auth.schema.js')
const {
  register,
  login,
} = await import('../../src/services/auth.service.js')
const userRepo = await import('../../src/repositories/user.repository.js')
const companyRepo = await import('../../src/repositories/company.repository.js')

describe('Auth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects weak passwords via Zod', () => {
    const result = registerSchema.safeParse({
      companyName: 'Acme',
      username: 'user',
      email: 'user@acme.com',
      password: '123',
      fullName: 'User',
    })

    expect(result.success).toBe(false)
  })

  it('register returns JWT tokens', async () => {
    userRepo.findByUsernameOrEmail.mockResolvedValue(null)
    companyRepo.createTrialCompany.mockResolvedValue({ id: 'company-1' })
    userRepo.createAdminUser.mockResolvedValue({
      id: 'user-1',
      username: 'user',
      email: 'user@acme.com',
      full_name: 'User',
      role: 'admin',
      company_id: 'company-1',
    })

    const result = await register({
      companyName: 'Acme',
      username: 'user',
      email: 'user@acme.com',
      password: '123456',
      fullName: 'User',
    })

    expect(result.tokens?.accessToken).toBeTruthy()
    expect(result.tokens?.refreshToken).toBeTruthy()

    const decoded = jwt.verify(result.tokens.accessToken, process.env.JWT_SECRET)
    expect(decoded.id).toBe('user-1')
    expect(decoded.role).toBe('admin')
  })

  it('login returns JWT tokens', async () => {
    const password = '123456'
    const passwordHash = await bcrypt.hash(password, 10)

    userRepo.findActiveByUsernameOrEmail.mockResolvedValue({
      id: 'user-1',
      username: 'user',
      email: 'user@acme.com',
      password_hash: passwordHash,
      role: 'admin',
      company_id: 'company-1',
      is_two_factor_enabled: false,
    })
    companyRepo.getPlanInfo.mockResolvedValue(null)

    const result = await login({ username: 'user', password })

    expect(result.tokens?.accessToken).toBeTruthy()
    expect(result.tokens?.refreshToken).toBeTruthy()

    const decoded = jwt.verify(result.tokens.accessToken, process.env.JWT_SECRET)
    expect(decoded.id).toBe('user-1')
  })
})
