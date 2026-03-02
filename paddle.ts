/**
 * GolPlay — Paddle Integration Layer
 * lib/paddle.ts
 *
 * Paddle Billing (v2 API) — Payments for GolPlay SaaS commissions
 *
 * Env vars needed:
 *   PADDLE_API_KEY         — secret key (starts with pdl_live_ or pdl_test_)
 *   PADDLE_WEBHOOK_SECRET  — from Paddle dashboard → Notifications
 *   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN — client-side token (starts with live_ or test_)
 *   NEXT_PUBLIC_PADDLE_PRICE_ID     — Price ID for $1 USD one-time or subscription
 */

export const PADDLE_API_BASE = 'https://api.paddle.com'
// Uncomment for sandbox testing:
// export const PADDLE_API_BASE = 'https://sandbox-api.paddle.com'

// ─── Server-side API calls ────────────────────────────────────────────────────

export async function paddleRequest(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.detail ?? `Paddle API error ${res.status}`)
  return json
}

// ─── Create a one-time charge transaction ─────────────────────────────────────

export async function createPaddleTransaction(params: {
  statementId: string
  fieldId:     number
  fieldName:   string
  amount:      number          // USD, e.g. 30 for $30.00
  ownerEmail:  string
  month:       number
  year:        number
  successUrl:  string
}) {
  const { statementId, fieldId, fieldName, amount, ownerEmail, month, year, successUrl } = params

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const data = await paddleRequest('POST', '/transactions', {
    items: [{
      price: {
        description: `Comisión GolPlay — ${fieldName} — ${MONTHS[month - 1]} ${year}`,
        name:        `Comisión ${MONTHS[month - 1]} ${year}`,
        unit_price: {
          amount:        String(amount * 100), // Paddle uses cents
          currency_code: 'USD',
        },
        product: {
          name:        'GolPlay — Comisión mensual',
          description: 'Comisión por uso de la plataforma GolPlay ($1 USD por reserva)',
          tax_category: 'saas',
        },
        billing_cycle:    null, // one-time
        trial_period:     null,
        tax_mode:         'account_setting',
        quantity:         { minimum: 1, maximum: 1 },
      },
      quantity: 1,
    }],
    checkout: {
      url: successUrl,
    },
    customer: {
      email: ownerEmail,
    },
    custom_data: {
      statement_id: statementId,
      field_id:     String(fieldId),
    },
    currency_code: 'USD',
  })

  return {
    transactionId: data.data.id as string,
    checkoutUrl:   data.data.checkout?.url as string,
  }
}

// ─── Verify Paddle webhook signature ─────────────────────────────────────────

export async function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  // Paddle uses HMAC-SHA256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  // Paddle signature format: "ts=TIMESTAMP;h1=HASH"
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('=')),
  )
  const ts   = parts['ts']
  const hash = parts['h1']
  if (!ts || !hash) return false

  const payload = `${ts}:${rawBody}`
  const hashBuffer = Buffer.from(hash, 'hex')

  return crypto.subtle.verify(
    'HMAC',
    key,
    hashBuffer,
    encoder.encode(payload),
  )
}
