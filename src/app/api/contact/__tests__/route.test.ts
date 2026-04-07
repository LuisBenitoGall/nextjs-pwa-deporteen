import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: 'test-id' }))
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })))

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setSmtpEnv() {
  process.env.SMTP_HOST = 'smtp.test.com'
  process.env.SMTP_PORT = '587'
  process.env.SMTP_USER = 'user@test.com'
  process.env.SMTP_PASS = 'secret'
  process.env.CONTACT_TO = 'dest@test.com'
}

function clearSmtpEnv() {
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.CONTACT_TO
}

const validAnonymousPayload = {
  name: 'Luis',
  email: 'luis@example.com',
  subject: 'Pregunta sobre suscripción',
  message: 'Hola, tengo una pregunta.',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/contact', () => {
  let POST: (req: Request) => Promise<Response>

  beforeEach(async () => {
    // Import fresh each time so env changes take effect
    vi.resetModules()
    mockSendMail.mockClear()
    ;({ POST } = await import('../route'))
  })

  afterEach(() => clearSmtpEnv())

  it('returns 200 immediately when honeypot field is filled', async () => {
    const res = await POST(jsonRequest({ ...validAnonymousPayload, website: 'spam' }))
    expect(res.status).toBe(200)
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing (anonymous)', async () => {
    const res = await POST(jsonRequest({ subject: 'Hola', message: 'Texto' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.errors).toHaveProperty('name')
    expect(body.errors).toHaveProperty('email')
  })

  it('returns 400 when subject is missing', async () => {
    const res = await POST(jsonRequest({ name: 'Luis', email: 'l@x.com', message: 'Texto' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.errors).toHaveProperty('subject')
  })

  it('returns 400 when message is missing', async () => {
    const res = await POST(jsonRequest({ name: 'Luis', email: 'l@x.com', subject: 'Asunto' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.errors).toHaveProperty('message')
  })

  it('returns 500 when SMTP env vars are missing', async () => {
    // No SMTP env set
    const res = await POST(jsonRequest(validAnonymousPayload))
    expect(res.status).toBe(500)
  })

  it('returns { ok: true } on successful send', async () => {
    setSmtpEnv()
    const res = await POST(jsonRequest(validAnonymousPayload))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSendMail).toHaveBeenCalledOnce()
  })

  it('skips name/email validation when logged_in=true', async () => {
    setSmtpEnv()
    const res = await POST(
      jsonRequest({ logged_in: 'true', subject: 'Consulta', message: 'Hola' })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('sends an email with the correct subject', async () => {
    setSmtpEnv()
    await POST(jsonRequest(validAnonymousPayload))
    const callArgs = mockSendMail.mock.calls[0][0]
    expect(callArgs.subject).toContain('Pregunta sobre suscripción')
  })

  it('escapes HTML characters in email body to prevent injection', async () => {
    setSmtpEnv()
    await POST(jsonRequest({
      name: '<script>alert(1)</script>',
      email: 'x@x.com',
      subject: '"><img src=x>',
      message: '</pre><b>injected</b>',
    }))
    const { html } = mockSendMail.mock.calls[0][0]
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('</pre><b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;&gt;&lt;img')
    expect(html).toContain('&lt;/pre&gt;&lt;b&gt;')
  })

  it('accepts application/x-www-form-urlencoded content type', async () => {
    setSmtpEnv()
    const body = new URLSearchParams({
      name: 'Ana',
      email: 'ana@example.com',
      subject: 'Asunto test',
      message: 'Mensaje test',
    }).toString()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
