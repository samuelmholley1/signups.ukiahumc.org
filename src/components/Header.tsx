'use client'

export default function Header() {
  const handleSignOut = () => {
    sessionStorage.removeItem('liturgist-auth')
    window.location.reload()
  }

  return (
    <header className="bg-blue-600 text-white shadow-lg print:hidden">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold">UUMC Liturgist Signup</h1>
          </div>
          <nav className="flex items-center space-x-6">
            <a href="/" className="hover:text-blue-200 transition-colors">
              Home
            </a>
            <a href="/schedule-summary" className="hover:text-blue-200 transition-colors">
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