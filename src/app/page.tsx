import Image from 'next/image'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Church Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/logo-for-church-larger.jpg" 
            alt="Ukiah United Methodist Church" 
            className="w-80 md:w-96 h-auto rounded-lg shadow-2xl"
          />
        </div>

        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Welcome to Church Signups
          </h1>
          <p className="text-gray-600 text-center text-lg mb-8">
            Choose the service you'd like to sign up for:
          </p>

          {/* Signup Buttons */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Liturgist Signups */}
            <Link href="/liturgists">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h2 className="text-xl font-bold text-white mb-1">Liturgists</h2>
                  <p className="text-blue-100 text-sm">Lead worship services</p>
                </div>
              </div>
            </Link>

            {/* Greeter Signups */}
            <Link href="/greeters">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="text-xl font-bold text-white mb-1">Greeters</h2>
                  <p className="text-purple-100 text-sm">Welcome congregation</p>
                </div>
              </div>
            </Link>

            {/* Food Distribution Signups */}
            <Link href="/food-distribution">
              <div className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-bold text-white mb-1">Food Distribution</h2>
                  <p className="text-green-100 text-sm">Help distribute food</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm">
          <p className="mb-1">
            <strong>Ukiah United Methodist Church</strong>
          </p>
          <p className="mb-1">
            270 N. Pine St., Ukiah, CA 95482 | 707.462.3360
          </p>
          <p className="text-xs">
            <a 
              href="https://ukiahumc.org" 
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ukiahumc.org
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
