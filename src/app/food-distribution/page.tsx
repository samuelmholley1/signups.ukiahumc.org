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

interface Volunteer {
  id: string
  name: string
  email: string
  phone?: string
}

interface Signup {
  date: string
  displayDate: string
  volunteer1: Volunteer | null
  volunteer2: Volunteer | null
  volunteer3: Volunteer | null
  volunteer4: Volunteer | null
}

export default function FoodDistribution() {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showExtraColumns, setShowExtraColumns] = useState<{ [key: string]: boolean }>({})
  const [lastUpdate, setLastUpdate] = useState(Date.now()) // Force re-render trigger
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' })
  const [successModal, setSuccessModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [cancelConfirmModal, setCancelConfirmModal] = useState<{ show: boolean; recordId: string; name: string; displayDate: string }>({ show: false, recordId: '', name: '', displayDate: '' })
  const [formData, setFormData] = useState({
    selectedPerson: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'volunteer1' as 'volunteer1' | 'volunteer2' | 'volunteer3' | 'volunteer4'
  })

  useEffect(() => {
    fetchSignups()
  }, [])
  
  const fetchSignups = async () => {
    try {
      const response = await fetch(`/api/services?table=food&quarter=Q4-2025&t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await response.json()
      
      if (data.success && data.services) {
        // Transform API data to our format
        const transformed = data.services.map((service: any) => ({
          date: service.date,
          displayDate: service.displayDate,
          volunteer1: service.volunteer1 || null,
          volunteer2: service.volunteer2 || null,
          volunteer3: service.volunteer3 || null,
          volunteer4: service.volunteer4 || null
        }))
        setSignups(transformed)
        setLastUpdate(Date.now()) // Force component re-render
        console.log('✅ [FORCE UPDATE] Triggered re-render at', new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('Error fetching signups:', error)
      // Fall back to empty signups
      const initialSignups = DECEMBER_SATURDAYS.map(sat => ({
        date: sat.date,
        displayDate: sat.display,
        volunteer1: null,
        volunteer2: null,
        volunteer3: null,
        volunteer4: null
      }))
      setSignups(initialSignups)
    } finally {
      setLoading(false)
    }
  }

  const handlePersonSelect = (personName: string) => {
    setFormData(prev => ({ ...prev, selectedPerson: personName }))
    
    // Map of preset people with their contact info
    const presetPeople: { [key: string]: { email: string; phone?: string } } = {
      'Raul Chairez': { email: 'raulshealinghands3@gmail.com' },
      'Don Damp': { email: 'donalddamp@gmail.com' },
      'Edward Dick': { email: 'edwardpdick@gmail.com' },
      'Samuel Holley': { email: 'sam@samuelholley.com', phone: '714-496-7006' },
      'Billy Jenne': { email: 'billyjenne2@gmail.com' },
      'Daphne Macneil': { email: 'daphnemacneil@yahoo.com' },
      'Cathy McKeon': { email: 'cmckeon999@comcast.net' },
      'Trudy Morgan': { email: 'morganmiller@pacific.net' },
      'Vicki Okey': { email: 'vokey123@gmail.com' },
      'Bonnie Reda': { email: 'bonireda@aol.com' },
      'Michele Robbins': { email: 'shalompastor3@gmail.com' },
      'Diana Waddle': { email: 'waddlediana@yahoo.com' },
      'Test User': { email: 'sam+test@samuelholley.com' }
    }
    
    if (presetPeople[personName]) {
      setFormData(prev => ({
        ...prev,
        email: presetPeople[personName].email,
        phone: presetPeople[personName].phone || '',
        firstName: '',
        lastName: ''
      }))
    } else if (personName === 'other') {
      // Clear fields for "other"
      setFormData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      }))
    }
  }

  const handleCancelClick = (recordId: string, name: string, displayDate: string) => {
    setCancelConfirmModal({ show: true, recordId, name, displayDate })
  }

  const handleCancelConfirm = async () => {
    const { recordId, name, displayDate } = cancelConfirmModal
    setCancelConfirmModal({ show: false, recordId: '', name: '', displayDate: '' })
    
    try {
      const response = await fetch(`/api/signup?recordId=${recordId}&table=food`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('🔄 [DEBUG] Before fetchSignups (cancel) - Current signups:', signups.length, 'records')
        const beforeState = JSON.parse(JSON.stringify(signups))
        await fetchSignups()
        console.log('✅ [DEBUG] After fetchSignups (cancel) - Updated signups:', signups.length, 'records')
        
        // Verify data actually changed
        setTimeout(() => {
          const afterState = JSON.parse(JSON.stringify(signups))
          const changed = JSON.stringify(beforeState) !== JSON.stringify(afterState)
          if (!changed) {
            console.error('⚠️ [DEBUG ERROR] Data did NOT update after cancellation! Cache issue detected.')
            console.error('Before:', beforeState)
            console.error('After:', afterState)
            console.error('🔄 [DEBUG] Forcing page reload to clear cache...')
            // Nuclear option: force full page reload
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          } else {
            console.log('✅ [DEBUG] Data successfully updated after cancellation')
          }
        }, 500)
        
        setSuccessModal({ show: true, message: 'Signup cancelled successfully.' })
      } else {
        setErrorModal({ show: true, title: 'Cancellation Failed', message: data.error || 'Unable to cancel signup. Please try again.' })
      }
    } catch (error) {
      console.error('Error cancelling signup:', error)
      setErrorModal({ show: true, title: 'Network Error', message: 'Unable to connect to the server. Please try again.' })
      
      // Report error to server
      try {
        await fetch('/api/report-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            },
            context: {
              userName: name,
              explanation: 'Food distribution signup cancellation failed',
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          })
        })
      } catch (reportError) {
        console.error('Failed to report error:', reportError)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const signup = signups.find(s => s.date === selectedDate)
    if (!signup) return
    
    // Determine the name based on selection
    let fullName = ''
    if (formData.selectedPerson === 'other') {
      fullName = `${formData.firstName} ${formData.lastName}`.trim()
    } else {
      fullName = formData.selectedPerson
    }

    // Validate name is not empty
    if (!fullName || fullName.trim().length === 0) {
      setErrorModal({ show: true, title: 'Name Required', message: 'Please enter a valid name before submitting.' })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(formData.email) || formData.email.endsWith('.')) {
      setErrorModal({ show: true, title: 'Invalid Email', message: 'Please enter a valid email address.' })
      return
    }
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'food',
          serviceDate: selectedDate,
          displayDate: signup.displayDate,
          name: fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh signups from server
        console.log('🔄 [DEBUG] Before fetchSignups - Current signups:', signups.length, 'records')
        const beforeState = JSON.parse(JSON.stringify(signups))
        await fetchSignups()
        console.log('✅ [DEBUG] After fetchSignups - Updated signups:', signups.length, 'records')
        
        // Verify data actually changed
        setTimeout(() => {
          const afterState = JSON.parse(JSON.stringify(signups))
          const changed = JSON.stringify(beforeState) !== JSON.stringify(afterState)
          if (!changed) {
            console.error('⚠️ [DEBUG ERROR] Data did NOT update after signup! Cache issue detected.')
            console.error('Before:', beforeState)
            console.error('After:', afterState)
            console.error('🔄 [DEBUG] Forcing page reload to clear cache...')
            // Nuclear option: force full page reload
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          } else {
            console.log('✅ [DEBUG] Data successfully updated after signup')
          }
        }, 500)
        
        // Reset form
        setFormData({ 
          selectedPerson: '',
          firstName: '', 
          lastName: '',
          email: '', 
          phone: '', 
          role: 'volunteer1' 
        })
        setSelectedDate(null)
        setSuccessModal({ show: true, message: 'Signup successful! You will receive a confirmation email shortly.' })
      } else {
        setErrorModal({ show: true, title: 'Signup Failed', message: data.error || 'Unable to complete signup. Please try again.' })
      }
    } catch (error) {
      console.error('Error submitting signup:', error)
      setErrorModal({ show: true, title: 'Network Error', message: 'Unable to connect to the server. Please check your internet connection and try again.' })
      
      // Report error to server
      try {
        await fetch('/api/report-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            },
            context: {
              userName: fullName,
              userEmail: formData.email,
              serviceDate: signup.displayDate,
              explanation: 'Food distribution signup submission failed',
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          })
        })
      } catch (reportError) {
        console.error('Failed to report error:', reportError)
      }
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
            <div className="bg-white rounded-lg shadow-xl overflow-hidden overflow-x-auto">
              <table className="w-full table-auto" key={lastUpdate}>
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-4 py-4 text-center font-semibold whitespace-nowrap">Date</th>
                    <th className="px-4 py-4 text-center font-semibold">Volunteer #1</th>
                    <th className="px-4 py-4 text-center font-semibold">Volunteer #2</th>
                    {Object.values(showExtraColumns).some(v => v) && (
                      <>
                        <th className="px-4 py-4 text-center font-semibold">Volunteer #3</th>
                        <th className="px-4 py-4 text-center font-semibold">Volunteer #4</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((signup, index) => {
                    const bothFilled = signup.volunteer1 && signup.volunteer2
                    const hasThirdVolunteer = signup.volunteer3
                    const hasFourthVolunteer = signup.volunteer4
                    const showExtra = showExtraColumns[signup.date]
                    
                    return (
                      <tr key={signup.date} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-6 py-4 font-medium text-gray-900 align-top whitespace-nowrap">
                          {signup.displayDate}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {signup.volunteer1 ? (
                            <div>
                              <div className="mb-2">
                                <p className="font-medium text-gray-900">{signup.volunteer1.name}</p>
                                <p className="text-sm text-gray-600">{signup.volunteer1.email}</p>
                                {signup.volunteer1.phone && (
                                  <p className="text-sm text-gray-600">{signup.volunteer1.phone}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleCancelClick(signup.volunteer1!.id, signup.volunteer1!.name, signup.displayDate)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                              >
                                Cancel
                              </button>
                              {bothFilled && !showExtra && !hasThirdVolunteer && (
                                <button
                                  onClick={() => setShowExtraColumns({ ...showExtraColumns, [signup.date]: true })}
                                  className="mt-2 px-3 py-1.5 text-sm bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full transition-colors font-medium"
                                >
                                  Add a third volunteer?
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDate(signup.date)
                                setFormData({ ...formData, role: 'volunteer1' })
                              }}
                              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-full transition-colors font-medium"
                            >
                              Sign Up
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {signup.volunteer2 ? (
                            <div>
                              <div className="mb-2">
                                <p className="font-medium text-gray-900">{signup.volunteer2.name}</p>
                                <p className="text-sm text-gray-600">{signup.volunteer2.email}</p>
                                {signup.volunteer2.phone && (
                                  <p className="text-sm text-gray-600">{signup.volunteer2.phone}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleCancelClick(signup.volunteer2!.id, signup.volunteer2!.name, signup.displayDate)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
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
                              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-full transition-colors font-medium"
                            >
                              Sign Up
                            </button>
                          )}
                        </td>
                        {Object.values(showExtraColumns).some(v => v) && (
                          <>
                            <td className="px-4 py-4 align-top">
                              {showExtra || hasThirdVolunteer || hasFourthVolunteer ? (
                                signup.volunteer3 ? (
                                  <div>
                                    <div className="mb-2">
                                      <p className="font-medium text-gray-900">{signup.volunteer3.name}</p>
                                      <p className="text-sm text-gray-600">{signup.volunteer3.email}</p>
                                      {signup.volunteer3.phone && (
                                        <p className="text-sm text-gray-600">{signup.volunteer3.phone}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleCancelClick(signup.volunteer3!.id, signup.volunteer3!.name, signup.displayDate)}
                                      className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedDate(signup.date)
                                      setFormData({ ...formData, role: 'volunteer3' })
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-full transition-colors font-medium"
                                  >
                                    Sign Up
                                  </button>
                                )
                              ) : null}
                            </td>
                            <td className="px-4 py-4 align-top">
                              {showExtra || hasThirdVolunteer || hasFourthVolunteer ? (
                                signup.volunteer4 ? (
                                  <div>
                                    <div className="mb-2">
                                      <p className="font-medium text-gray-900">{signup.volunteer4.name}</p>
                                      <p className="text-sm text-gray-600">{signup.volunteer4.email}</p>
                                      {signup.volunteer4.phone && (
                                        <p className="text-sm text-gray-600">{signup.volunteer4.phone}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleCancelClick(signup.volunteer4!.id, signup.volunteer4!.name, signup.displayDate)}
                                      className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    {hasThirdVolunteer && !hasFourthVolunteer && (
                                      <button
                                        onClick={() => {
                                          setSelectedDate(signup.date)
                                          setFormData({ ...formData, role: 'volunteer4' })
                                        }}
                                        className="mt-2 px-3 py-1.5 text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-full transition-colors font-medium"
                                      >
                                        Add a fourth volunteer?
                                      </button>
                                    )}
                                  </div>
                                ) : hasThirdVolunteer ? (
                                  <button
                                    onClick={() => {
                                      setSelectedDate(signup.date)
                                      setFormData({ ...formData, role: 'volunteer4' })
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-full transition-colors font-medium"
                                  >
                                    Sign Up
                                  </button>
                                ) : null
                              ) : null}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Signup Modal */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={80}
                    height={53}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold mb-4 text-center">
                  Sign Up as Volunteer #{formData.role === 'volunteer1' ? '1' : formData.role === 'volunteer2' ? '2' : formData.role === 'volunteer3' ? '3' : '4'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {signups.find(s => s.date === selectedDate)?.displayDate}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Person *</label>
                    <select
                      required
                      value={formData.selectedPerson}
                      onChange={(e) => handlePersonSelect(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">-- Choose --</option>
                      <option value="Raul Chairez">Raul Chairez</option>
                      <option value="Don Damp">Don Damp</option>
                      <option value="Edward Dick">Edward Dick</option>
                      <option value="Samuel Holley">Samuel Holley</option>
                      <option value="Billy Jenne">Billy Jenne</option>
                      <option value="Daphne Macneil">Daphne Macneil</option>
                      <option value="Cathy McKeon">Cathy McKeon</option>
                      <option value="Trudy Morgan">Trudy Morgan</option>
                      <option value="Vicki Okey">Vicki Okey</option>
                      <option value="Bonnie Reda">Bonnie Reda</option>
                      <option value="Michele Robbins">Michele Robbins</option>
                      <option value="Test User">Test User</option>
                      <option value="Diana Waddle">Diana Waddle</option>
                      <option value="other">Other (not listed)</option>
                    </select>
                  </div>

                  {formData.selectedPerson === 'other' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={formData.selectedPerson !== 'other' && formData.selectedPerson !== ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={formData.selectedPerson !== 'other' && formData.selectedPerson !== ''}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(null)}
                      className="flex-1 px-4 py-2 border rounded-full hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Error Modal */}
          {errorModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={150}
                    height={100}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">⚠️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{errorModal.title}</h3>
                  <p className="text-gray-600">{errorModal.message}</p>
                </div>
                <button
                  onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {successModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={150}
                    height={100}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">✅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-gray-600">{successModal.message}</p>
                </div>
                <button
                  onClick={() => setSuccessModal({ show: false, message: '' })}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {cancelConfirmModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={150}
                    height={100}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">❓</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Confirm Cancellation</h3>
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to cancel <span className="font-semibold">{cancelConfirmModal.name}</span>&apos;s signup?
                  </p>
                  <p className="text-gray-600 text-sm font-medium">
                    {cancelConfirmModal.displayDate} - Food Distribution
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelConfirmModal({ show: false, recordId: '', name: '', displayDate: '' })}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors font-medium"
                  >
                    No, Keep It
                  </button>
                  <button
                    onClick={handleCancelConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PasswordGate>
  )
}
