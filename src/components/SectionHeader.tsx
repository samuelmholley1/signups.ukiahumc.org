'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SectionHeader() {
  const pathname = usePathname()
  
  // Don't show header on homepage
  if (pathname === '/') return null
  
  // Determine section
  const isLiturgists = pathname.startsWith('/liturgists')
  const isFoodDistribution = pathname.startsWith('/food-distribution')
  
  if (!isLiturgists && !isFoodDistribution) return null
  
  const sectionTitle = isLiturgists ? 'Liturgist Signups' : 'Food Distribution'
  const bgColor = isLiturgists ? 'bg-blue-600' : 'bg-green-600'
  const hoverColor = isLiturgists ? 'hover:bg-blue-700' : 'hover:bg-green-700'
  
  return (
    <header className={`${bgColor} text-white shadow-lg sticky top-0 z-40`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Section Title */}
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            {isLiturgists && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )}
            {isFoodDistribution && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {sectionTitle}
          </h1>
          
          {/* Back to All Signups Link */}
          <Link 
            href="/"
            className={`${hoverColor} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base font-medium`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to All Signups</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
