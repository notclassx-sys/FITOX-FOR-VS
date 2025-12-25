import './globals.css'

export const metadata = {
  title: 'FITOX ',
  description: 'AI HABBIT TRACKER ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}