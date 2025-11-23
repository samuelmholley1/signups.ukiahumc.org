'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import PasswordGate from '@/components/PasswordGate'

// December 2025 Saturdays
const DECEMBER_SATURDAYS = [
  { date: '2025-12-06', display: 'December 6, 2025' },
  { date: '2025-12-13', display: 'December 13, 2025' },
  { date: '2025-12-20', display: 'December 20, 2025' },
  { date: '2025-12-27', display: 'December 27, 2025' },
]

interface Signup {
  date: string
  displayDate: string
  volunteer1: { name: string; email: string; phone?: string } | null
  volunteer2: { name: string; email: string; phone?: string } | null
}

export default function FoodDistribution() {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'volunteer1' as 'volunteer1' | 'volunteer2'
  })

  useEffect(() => {
    // Initialize signups for all December Saturdays
    const initialSignups = DECEMBER_SATURDAYS.map(sat => ({
      date: sat.date,
      displayDate: sat.display,
      volunteer1: null,
      volunteer2: null
    }))
    setSignups(initialSignups)
    setLoading(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // TODO: Submit to Airtable
    console.log('Submitting:', { date: selectedDate, ...formData })
    
    // Update local state
    setSignups(prev => prev.map(signup => 
      signup.date === selectedDate 
        ? {
            ...signup,
            [formData.role]: {
              name: formData.name,
              email: formData.email,
              phone: formData.phone
            }
          }
        : signup
    ))
    
    // Reset form
    setFormData({ name: '', email: '', phone: '', role: 'volunteer1' })
    setSelectedDate(null)
  }

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Image
              src="/logo-for-church-larger.jpg"
              alt="Ukiah United Methodist Church"
              width={300}
              height={200}
              className="mx-auto rounded-lg shadow-md mb-4"
            />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Food Distribution Signups
            </h1>
            <p className="text-gray-600">December 2025 - Saturdays</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {signups.map(signup => (
                <div key={signup.date} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {signup.displayDate}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-green-700 mb-2">Volunteer #1</h4>
                      {signup.volunteer1 ? (
                        <div className="text-sm">
                          <p className="font-medium">{signup.volunteer1.name}</p>
                          <p className="text-gray-600">{signup.volunteer1.email}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDate(signup.date)
                            setFormData({ ...formData, role: 'volunteer1' })
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          + Sign Up
                        </button>
                      )}
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-green-700 mb-2">Volunteer #2</h4>
                      {signup.volunteer2 ? (
                        <div className="text-sm">
                          <p className="font-medium">{signup.volunteer2.name}</p>
                          <p className="text-gray-600">{signup.volunteer2.email}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDate(signup.date)
                            setFormData({ ...formData, role: 'volunteer2' })
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          + Sign Up
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Signup Modal */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">
                  Sign Up as {formData.role === 'volunteer1' ? 'Volunteer #1' : 'Volunteer #2'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {signups.find(s => s.date === selectedDate)?.displayDate}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(null)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </PasswordGate>
  )
}
