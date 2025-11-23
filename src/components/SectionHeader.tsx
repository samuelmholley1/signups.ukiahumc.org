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
  
  const sectionTitle = isLiturgists ? 'Liturgist Signups' : 'Food Distribution Signups'
  const bgColor = isLiturgists ? 'bg-blue-600' : 'bg-green-600'
  const homeLink = isLiturgists ? '/liturgists' : '/food-distribution'
  const summaryLink = isLiturgists ? '/liturgists/schedule-summary' : '/food-distribution/schedule-summary'
  const authKey = isLiturgists ? 'liturgist-auth' : 'food-distribution-auth'
  const hoverColor = isLiturgists ? 'hover:text-blue-200' : 'hover:text-green-200'
  
  const handleSignOut = () => {
    sessionStorage.removeItem(authKey)
    window.location.reload()
  }
  
  return (
    <header className={`${bgColor} text-white shadow-lg print:hidden`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              {isLiturgists && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
              {isFoodDistribution && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              <span className="hidden sm:inline">Ukiah United Methodist Church - </span>
              <span className="sm:hidden">UUMC </span>
              <a href={homeLink} className={`${hoverColor} transition-colors cursor-pointer`}>
                {sectionTitle}
              </a>
            </h1>
          </div>
          <nav className="flex items-center space-x-6">
            <a href={homeLink} className={`${hoverColor} transition-colors flex items-center gap-1`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </a>
            <a href={summaryLink} className={`${hoverColor} transition-colors flex items-center gap-1`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden sm:inline">Schedule Summary</span>
            </a>
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-1 ${hoverColor} transition-colors`}
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
