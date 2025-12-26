import './globals.css'
import Link from 'next/link'
export const dynamic = 'force-dynamic'
import Logo from '../components/ui/logo'

export const metadata = {
  title: 'FITOX',
  description: 'AI HABBIT TRACKER',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* top header removed per request */}

        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}