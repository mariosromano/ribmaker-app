import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Sentry — only initializes if DSN is configured in Vercel env vars
// (VITE_SENTRY_DSN). Without a DSN this is a no-op, so the app ships
// fine before the Sentry account is set up.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    // Capture 100% of errors, sample 10% of transactions
    tracesSampleRate: 0.1,
    // Don't send personally identifiable info by default
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Session Replay — captures user video so we can see what they
      // were doing when something broke. Free tier: 50 replays/mo.
      Sentry.replayIntegration({
        maskAllText: false,  // designs/specs aren't sensitive
        blockAllMedia: false,
      }),
      // Capture console.error calls too — catches things devs log
      // but never throw (e.g. fetch failures handled with toast).
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],
    // Capture all sessions where an error occurred; sample 10% of all sessions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Filter common noise
    beforeSend(event, hint) {
      const err = hint?.originalException as Error | undefined
      // Three.js WebGL context lost is recoverable, not actionable
      if (err?.message?.includes('CONTEXT_LOST_WEBGL')) return null
      // ResizeObserver loop limit — browser quirk, not a real error
      if (err?.message?.includes('ResizeObserver loop')) return null
      return event
    },
  })
}

// Fallback UI shown if the app itself crashes (white-screen of death prevention)
function FallbackUI({ error }: { error: unknown }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1f',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Something went wrong.
        </div>
        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
          We've been notified and will look into it. Try refreshing the page.
          If it keeps happening, email mario@marioromano.com.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            borderRadius: 6,
            background: '#7c9bff',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        {import.meta.env.DEV && error instanceof Error && (
          <pre style={{
            marginTop: 24,
            padding: 16,
            background: '#0a0a0a',
            color: '#ff6b6b',
            fontSize: 11,
            textAlign: 'left',
            overflow: 'auto',
            borderRadius: 6,
          }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error }) => <FallbackUI error={error} />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
