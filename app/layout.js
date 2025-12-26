import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'FITOX',
  description: 'AI HABBIT TRACKER',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="w-full border-b bg-white/80 backdrop-blur dark:bg-slate-900/75 dark:border-slate-700">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <img src="/logo.png" alt="FITOX" className="h-8 w-auto" />
              <span className="font-semibold text-lg">FITOX</span>
            </Link>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}