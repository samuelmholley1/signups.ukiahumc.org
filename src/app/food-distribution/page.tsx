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
    fetchSignups()
  }, [])
  
  const fetchSignups = async () => {
    try {
      const response = await fetch('/api/services?table=food&quarter=Q4-2025')
      const data = await response.json()
      
      if (data.success && data.services) {
        // Transform API data to our format
        const transformed = data.services.map((service: any) => ({
          date: service.date,
          displayDate: service.displayDate,
          volunteer1: service.volunteer1 || null,
          volunteer2: service.volunteer2 || null
        }))
        setSignups(transformed)
      }
    } catch (error) {
      console.error('Error fetching signups:', error)
      // Fall back to empty signups
      const initialSignups = DECEMBER_SATURDAYS.map(sat => ({
        date: sat.date,
        displayDate: sat.display,
        volunteer1: null,
        volunteer2: null
      }))
      setSignups(initialSignups)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const signup = signups.find(s => s.date === selectedDate)
    if (!signup) return
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'food',
          serviceDate: selectedDate,
          displayDate: signup.displayDate,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh signups from server
        await fetchSignups()
        // Reset form
        setFormData({ name: '', email: '', phone: '', role: 'volunteer1' })
        setSelectedDate(null)
        alert('Signup successful!')
      } else {
        alert(data.error || 'Signup failed')
      }
    } catch (error) {
      console.error('Error submitting signup:', error)
      alert('Error submitting signup. Please try again.')
    }
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
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Date</th>
                    <th className="px-6 py-4 text-left font-semibold">Volunteer #1</th>
                    <th className="px-6 py-4 text-left font-semibold">Volunteer #2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((signup, index) => (
                    <tr key={signup.date} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {signup.displayDate}
                      </td>
                      <td className="px-6 py-4">
                        {signup.volunteer1 ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{signup.volunteer1.name}</p>
                              <p className="text-sm text-gray-600">{signup.volunteer1.email}</p>
                            </div>
                            <button
                              onClick={() => {/* TODO: Cancel */}}
                              className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDate(signup.date)
                              setFormData({ ...formData, role: 'volunteer1' })
                            }}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium"
                          >
                            Sign Up
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {signup.volunteer2 ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{signup.volunteer2.name}</p>
                              <p className="text-sm text-gray-600">{signup.volunteer2.email}</p>
                            </div>
                            <button
                              onClick={() => {/* TODO: Cancel */}}
                              className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDate(signup.date)
                              setFormData({ ...formData, role: 'volunteer2' })
                            }}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium"
                          >
                            Sign Up
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
