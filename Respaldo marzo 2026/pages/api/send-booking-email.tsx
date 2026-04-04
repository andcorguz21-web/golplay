import nodemailer from 'nodemailer';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  const { email, fieldName, date, hour } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const html = `
    <h2>Reserva confirmada ⚽</h2>
    <p><strong>Cancha:</strong> ${fieldName}</p>
    <p><strong>Fecha:</strong> ${date}</p>
    <p><strong>Hora:</strong> ${hour}</p>
    <p>Gracias por usar GolPlay</p>
  `;

  await transporter.sendMail({
    from: `"GolPlay" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reserva confirmada - GolPlay',
    html,
  });

  await transporter.sendMail({
    from: `"GolPlay" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: 'Nueva reserva recibida',
    html,
  });

  res.json({ ok: true });
}
