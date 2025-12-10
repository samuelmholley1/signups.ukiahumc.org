'use client'

import { useState, useEffect } from 'react'

interface PasswordGateProps {
  children: React.ReactNode
  title?: string
  color?: 'blue' | 'green' | 'purple'
}

// Cache bust: 2025-12-10
export default function PasswordGate({ children, title = 'Liturgist Schedule', color = 'blue' }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Check if already authenticated in session storage
    const auth = sessionStorage.getItem('liturgist-auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'lovewins') {
      setIsAuthenticated(true)
      sessionStorage.setItem('liturgist-auth', 'true')
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  const gradients = {
    blue: 'from-blue-50 to-indigo-100',
    green: 'from-green-50 to-emerald-100',
    purple: 'from-purple-50 to-violet-100'
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradients[color]} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <img
            src="/logo-for-church-larger.jpg"
            alt="Ukiah United Methodist Church"
            className="w-60 h-auto rounded-lg shadow-md mx-auto mb-4"
            width={240}
            height={159}
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {title}
          </h1>
          <p className="text-gray-600 text-sm">
            Please enter the password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                error 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">
                Incorrect password. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Access Schedule
          </button>
        </form>
      </div>
    </div>
  )
}
