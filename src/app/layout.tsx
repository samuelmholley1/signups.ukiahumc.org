import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import SectionHeader from '@/components/SectionHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ukiah United Methodist Church - Service Signups',
  description: 'Sign up to serve at Ukiah United Methodist Church - Liturgist services and Food Distribution volunteer opportunities',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UUMC Signups'
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'UUMC Service Signups',
    title: 'Ukiah United Methodist Church - Service Signups',
    description: 'Sign up to serve - Liturgist services and Food Distribution volunteers',
  },
  keywords: ['church', 'liturgist', 'signup', 'ukiah', 'methodist', 'worship', 'volunteer', 'food distribution']
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UUMC Liturgists" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('[RootLayout] Initializing app');
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[SW] Service Worker registered:', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('[SW] Service Worker registration failed:', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <SectionHeader />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}