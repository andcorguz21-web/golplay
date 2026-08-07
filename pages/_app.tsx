import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/layout.css'
import '../styles/golplay-tokens.css'
import '../styles/playtomic-ui.css'
import 'leaflet/dist/leaflet.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href="/logo-golplay1.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo-golplay1.svg" />
        <meta name="theme-color" content="#3a5bf0" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}