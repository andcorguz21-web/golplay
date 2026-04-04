/**
 * POST /api/paddle/webhook
 *
 * Recibe eventos de Paddle y actualiza monthly_statements en Supabase.
 *
 * Eventos manejados:
 *   - transaction.completed  → marcar statement como paid
 *   - transaction.payment_failed → marcar statement como failed
 *
 * Config en Paddle Dashboard → Notifications:
 *   URL: https://golplay.app/api/paddle/webhook
 *   Events: transaction.completed, transaction.payment_failed
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { verifyPaddleWebhook } from '@/paddle'

// Necesitamos el raw body para verificar la firma
export const config = { api: { bodyParser: false } }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end',  () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody  = await getRawBody(req)
  const signature = req.headers['paddle-signature'] as string

  // 1. Verificar firma
  const valid = await verifyPaddleWebhook(rawBody, signature ?? '')
  if (!valid) {
    console.warn('Paddle webhook: firma inválida')
    return res.status(401).json({ error: 'Firma inválida' })
  }

  const event = JSON.parse(rawBody)
  const { event_type, data } = event

  console.log(`Paddle webhook: ${event_type}`, data?.id)

  // 2. Obtener statement_id desde custom_data
  const statementId = data?.custom_data?.statement_id
  if (!statementId) {
    // Evento sin statement_id — ignorar silenciosamente
    return res.status(200).json({ ok: true })
  }

  // 3. Manejar eventos
  if (event_type === 'transaction.completed') {
    const { error } = await supabase
      .from('monthly_statements')
      .update({
        status:           'paid',
        paid_at:          new Date().toISOString(),
        transaction_id:   data.id,
        payment_method:   data?.payments?.[0]?.method_details?.type ?? 'card',
      })
      .eq('id', statementId)

    if (error) {
      console.error('Supabase update error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log(`✅ Statement ${statementId} marcado como pagado`)
  }

  else if (event_type === 'transaction.payment_failed') {
    await supabase
      .from('monthly_statements')
      .update({ status: 'failed' })
      .eq('id', statementId)

    console.log(`❌ Statement ${statementId} marcado como fallido`)
  }

  return res.status(200).json({ ok: true })
}
