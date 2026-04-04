// pages/api/home-fields.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { data: fields, error: fieldsError } = await supabase
      .from('fields')
      .select('id, name, price, location')
      .eq('active', true)
      .order('name')

    if (fieldsError) throw fieldsError

    const { data: images } = await supabase
      .from('fields_images')
      .select('field_id, url')
      .order('is_main', { ascending: false })

    const map = new Map<number, any>()

    fields.forEach((f) => {
      map.set(f.id, {
        ...f,
        images: [],
      })
    })

    images?.forEach((img) => {
      const field = map.get(img.field_id)
      if (field && img.url) field.images.push(img.url)
    })

    const grouped: Record<string, any[]> = {}
    Array.from(map.values()).forEach((f) => {
      const loc = f.location || 'Sin ubicación'
      if (!grouped[loc]) grouped[loc] = []
      grouped[loc].push(f)
    })

    res.status(200).json(grouped)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
