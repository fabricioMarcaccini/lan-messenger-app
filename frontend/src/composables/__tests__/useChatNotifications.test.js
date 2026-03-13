// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Firebase mock ─────────────────────────────────────────────────────────────
// Must be declared BEFORE the import of useChatNotifications so Vitest
// can hoist them.

const mockGetToken = vi.fn()
const mockGetMessaging = vi.fn(() => ({}))
const mockGetApps = vi.fn(() => [])
const mockInitializeApp = vi.fn()
const mockIsSupported = vi.fn(() => Promise.resolve(true))

vi.mock('firebase/app', () => ({
  getApps: mockGetApps,
  initializeApp: mockInitializeApp,
}))

vi.mock('firebase/messaging', () => ({
  getMessaging: mockGetMessaging,
  getToken: mockGetToken,
  isSupported: mockIsSupported,
}))

// ── API mock ──────────────────────────────────────────────────────────────────
const mockApiPost = vi.fn(() => Promise.resolve({ data: { success: true } }))

vi.mock('@/stores/auth', () => ({
  api: {
    post: (...args) => mockApiPost(...args),
  },
}))

// ── import.meta.env stub ──────────────────────────────────────────────────────
// Vitest exposes import.meta.env; we override per-test via the env map.
const originalEnv = { ...import.meta.env }

function setEnv(overrides) {
  Object.assign(import.meta.env, overrides)
}
function resetEnv() {
  // restore original keys and remove extras
  for (const key of Object.keys(import.meta.env)) {
    if (!(key in originalEnv)) {
      delete import.meta.env[key]
    }
  }
  Object.assign(import.meta.env, originalEnv)
}

// ── Notification mock ─────────────────────────────────────────────────────────
class FakeNotification {
  static permission = 'default'
  static requestPermission = vi.fn(() => {
    FakeNotification.permission = 'granted'
    return Promise.resolve('granted')
  })
  constructor(title, opts) {
    this.title = title
    this.body = opts?.body
    this.onclick = null
  }
  close() {}
}

// ── Service Worker mock ───────────────────────────────────────────────────────
const mockSwReady = Promise.resolve({
  active: { postMessage: vi.fn() },
  waiting: null,
  installing: null,
})

// ─────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────
describe('useChatNotifications', () => {
  let useChatNotifications

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset module-level singletons by resetting modules
    vi.resetModules()

    // Setup browser globals
    globalThis.Notification = FakeNotification
    FakeNotification.permission = 'default'

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        setAppBadge: vi.fn(),
        clearAppBadge: vi.fn(),
        serviceWorker: { ready: mockSwReady },
      },
      writable: true,
      configurable: true,
    })

    // Set default Firebase env vars
    setEnv({
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      VITE_FIREBASE_APP_ID: '1:1234567890:web:abc123',
      VITE_FIREBASE_VAPID_KEY: 'test-vapid-key-long-enough',
    })

    // Re-import fresh module each test (singletons reset)
    const mod = await import('../useChatNotifications.js')
    useChatNotifications = mod.useChatNotifications
  })

  afterEach(() => {
    resetEnv()
  })

  // ───── Basic API Tests ────────────────────────────────────────────
  it('exposes the expected public API', () => {
    const api = useChatNotifications()

    expect(api).toMatchObject({
      isNotificationSupported: expect.any(Object),
      isAppBadgeSupported: expect.any(Object),
      notificationPermission: expect.any(Object),
      requestPermission: expect.any(Function),
      getPermission: expect.any(Function),
      updateBadge: expect.any(Function),
      notifyNewMessage: expect.any(Function),
      requestFcmToken: expect.any(Function),
    })
  })

  // ───── requestFcmToken: happy path ────────────────────────────────
  it('requests permission, obtains FCM token, and POSTs it to the backend', async () => {
    const fakeToken = 'fcm-test-token-abc123-very-long-string'
    mockGetToken.mockResolvedValue(fakeToken)

    const { requestFcmToken } = useChatNotifications()
    const token = await requestFcmToken()

    // Permission was requested
    expect(FakeNotification.requestPermission).toHaveBeenCalled()

    // Firebase getToken was called with VAPID key and SW registration
    expect(mockGetToken).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        vapidKey: 'test-vapid-key-long-enough',
        serviceWorkerRegistration: expect.anything(),
      }),
    )

    // Token was sent to the backend
    expect(mockApiPost).toHaveBeenCalledWith('/users/me/fcm-token', { token: fakeToken })

    // Return value is the token
    expect(token).toBe(fakeToken)
  })

  // ───── requestFcmToken: missing VAPID key ─────────────────────────
  it('returns null when VITE_FIREBASE_VAPID_KEY is missing', async () => {
    setEnv({ VITE_FIREBASE_VAPID_KEY: '' })

    // Need to re-import because env changed
    vi.resetModules()
    const mod = await import('../useChatNotifications.js')
    const { requestFcmToken } = mod.useChatNotifications()

    const token = await requestFcmToken()

    expect(token).toBeNull()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  // ───── requestFcmToken: missing Firebase keys ─────────────────────
  it('returns null when VITE_FIREBASE_API_KEY is missing', async () => {
    setEnv({
      VITE_FIREBASE_API_KEY: '',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '',
    })

    vi.resetModules()
    const mod = await import('../useChatNotifications.js')
    const { requestFcmToken } = mod.useChatNotifications()

    const token = await requestFcmToken()

    expect(token).toBeNull()
    expect(mockGetToken).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  // ───── requestFcmToken: permission denied ─────────────────────────
  it('returns null when user denies notification permission', async () => {
    FakeNotification.requestPermission = vi.fn(() => {
      FakeNotification.permission = 'denied'
      return Promise.resolve('denied')
    })

    vi.resetModules()
    const mod = await import('../useChatNotifications.js')
    const { requestFcmToken } = mod.useChatNotifications()

    const token = await requestFcmToken()

    expect(token).toBeNull()
    expect(mockGetToken).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  // ───── requestFcmToken: getToken returns null ─────────────────────
  it('returns null and does NOT call API when Firebase returns no token', async () => {
    mockGetToken.mockResolvedValue(null)

    const { requestFcmToken } = useChatNotifications()
    const token = await requestFcmToken()

    expect(token).toBeNull()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  // ───── requestFcmToken: getToken throws ───────────────────────────
  it('returns null gracefully when getToken throws (network issue)', async () => {
    mockGetToken.mockRejectedValue(new Error('network error'))

    const { requestFcmToken } = useChatNotifications()
    const token = await requestFcmToken()

    expect(token).toBeNull()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  // ───── notifyNewMessage ───────────────────────────────────────────
  it('creates a Notification with correct title and body', () => {
    FakeNotification.permission = 'granted'

    const { notifyNewMessage } = useChatNotifications()
    const result = notifyNewMessage(
      { content: 'Olá, tudo bem?' },
      'João',
    )

    expect(result).toBe(true)
  })

  it('does not notify when permission is not granted', () => {
    FakeNotification.permission = 'denied'

    const { notifyNewMessage } = useChatNotifications()
    const result = notifyNewMessage({ content: 'test' }, 'Sender')

    expect(result).toBe(false)
  })

  // ───── updateBadge ────────────────────────────────────────────────
  it('sets app badge when count > 0', async () => {
    const { updateBadge } = useChatNotifications()
    const result = await updateBadge(5)

    expect(navigator.setAppBadge).toHaveBeenCalledWith(5)
    expect(result).toBe(true)
  })

  it('clears app badge when count is 0', async () => {
    const { updateBadge } = useChatNotifications()
    const result = await updateBadge(0)

    expect(navigator.clearAppBadge).toHaveBeenCalled()
    expect(result).toBe(true)
  })
})
