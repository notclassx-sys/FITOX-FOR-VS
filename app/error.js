export const dynamic = 'force-dynamic'

'use client'

export default function Error({ error, reset }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 720, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ color: '#475569', marginBottom: 16 }}>An unexpected error occurred. You can try again or refresh the page.</p>
        {error?.message && (
          <pre style={{ textAlign: 'left', background: '#f8fafc', padding: 12, borderRadius: 8, color: '#0f172a', overflowX: 'auto' }}>
            {error.message}
          </pre>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => reset?.()}
            style={{
              background: '#4f46e5',
              color: 'white',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
