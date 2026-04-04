import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'GolPlay',
  description: 'Reservá tu cancha fácil y rápido',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {/* TOASTER GLOBAL */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '14px',
              background: '#111827',
              color: '#fff',
              fontSize: '15px',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#fff',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
