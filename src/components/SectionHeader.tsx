'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SectionHeader() {
  const pathname = usePathname()
  
  // Don't show header on homepage or inventory
  if (pathname === '/' || pathname.startsWith('/inventory')) return null
  
  // Determine section
  const isLiturgists = pathname.startsWith('/liturgists')
  const isFoodDistribution = pathname.startsWith('/food-distribution')
  
  if (!isLiturgists && !isFoodDistribution) return null
  
  const sectionTitle = isLiturgists ? 'Liturgist Signup' : 'Food Distribution'
  const bgColor = isLiturgists ? 'bg-blue-600' : 'bg-green-600'
  const homeLink = isLiturgists ? '/liturgists' : '/food-distribution'
  const summaryLink = isLiturgists ? '/liturgists/schedule-summary' : '/food-distribution/schedule-summary'
  const authKey = isLiturgists ? 'liturgist-auth' : 'food-distribution-auth'
  
  const handleSignOut = () => {
    sessionStorage.removeItem(authKey)
    window.location.reload()
  }
  
  return (
    <header className={`${bgColor} text-white shadow-lg print:hidden`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold">
              <span className="hidden sm:inline">Ukiah United Methodist Church - </span>
              <span className="sm:hidden">UUMC </span>
              {sectionTitle}
            </h1>
          </div>
          <nav className="flex items-center space-x-6">
            <a href={homeLink} className="hover:text-blue-200 transition-colors">
              Home
            </a>
            <a href={summaryLink} className="hover:text-blue-200 transition-colors">
              Schedule Summary
            </a>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 hover:text-blue-200 transition-colors"
              title="Sign out and return to password page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
