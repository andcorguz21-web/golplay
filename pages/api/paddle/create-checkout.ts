/**
 * POST /api/paddle/create-checkout
 *
 * Crea una transacción en Paddle y devuelve la URL de checkout.
 * El frontend abre esa URL en un overlay de Paddle (Paddle.js).
 *
 * Body: { statementId: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createPaddleTransaction } from '@/paddle'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { statementId } = req.body
  if (!statementId) return res.status(400).json({ error: 'statementId requerido' })

  // 1. Obtener el statement con datos del campo y owner
  const { data: statement, error: stErr } = await supabase
    .from('monthly_statements')
    .select(`
      id, field_id, month, year, amount_due, status,
      fields ( name, owner_email )
    `)
    .eq('id', statementId)
    .single()

  if (stErr || !statement) {
    return res.status(404).json({ error: 'Statement no encontrado' })
  }

  if (statement.status === 'paid') {
    return res.status(400).json({ error: 'Este statement ya fue pagado' })
  }

  const fieldName  = (statement.fields as any)?.name       ?? 'Cancha'
  const ownerEmail = (statement.fields as any)?.owner_email ?? ''

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golplay.app'
  const successUrl = `${appUrl}/admin/payments?paid=${statementId}`

  try {
    const { transactionId, checkoutUrl } = await createPaddleTransaction({
      statementId: statement.id,
      fieldId:     statement.field_id,
      fieldName,
      amount:      Number(statement.amount_due),
      ownerEmail,
      month:       statement.month,
      year:        statement.year,
      successUrl,
    })

    // 2. Guardar el transaction_id en Supabase (estado: processing)
    await supabase
      .from('monthly_statements')
      .update({
        status:         'processing',
        transaction_id: transactionId,
      })
      .eq('id', statementId)

    return res.status(200).json({ checkoutUrl, transactionId })

  } catch (e: any) {
    console.error('Paddle create-checkout error:', e)
    return res.status(500).json({ error: e.message ?? 'Error al crear el checkout' })
  }
}
