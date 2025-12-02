'use client'

import React, { useState, useEffect } from 'react'
import PasswordGate from '@/components/PasswordGate'

interface Greeter {
  id: string
  name: string
  email: string
  phone?: string
}

interface Signup {
  date: string
  displayDate: string
  greeter1: Greeter | null
  greeter2: Greeter | null
}

export default function Greeters() {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' })
  const [successModal, setSuccessModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [cancelConfirmModal, setCancelConfirmModal] = useState<{ show: boolean; recordId: string; name: string; displayDate: string }>({ show: false, recordId: '', name: '', displayDate: '' })
  const [formData, setFormData] = useState({
    selectedPerson: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'greeter1' as 'greeter1' | 'greeter2'
  })

  useEffect(() => {
    fetchSignups()
  }, [])
  
  const fetchSignups = async () => {
    try {
      const response = await fetch(`/api/services?table=greeters&quarter=Q1-2026&t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await response.json()
      
      if (data.success && data.services) {
        // Transform API data to our format
        const transformed = data.services.map((service: any) => ({
          date: service.date,
          displayDate: service.displayDate,
          greeter1: service.greeter1 || null,
          greeter2: service.greeter2 || null
        }))
        
        setSignups(transformed)
        
        setTimeout(() => {
          setLastUpdate(Date.now())
        }, 0)
      }
    } catch (error) {
      console.error('Error fetching signups:', error)
      setSignups([])
    } finally {
      setLoading(false)
    }
  }

  const handlePersonSelect = (personName: string) => {
    setFormData(prev => ({ ...prev, selectedPerson: personName }))
    
    // Map of preset people with their contact info (same as food distribution for now)
    const presetPeople: { [key: string]: { email: string; phone?: string } } = {
      'Kay Lieberknecht': { email: 'kay.hoofin.it@gmail.com', phone: '707-489-1148' },
      'Linda Nagel': { email: 'lindab.nagel@gmail.com', phone: '707-462-3185' },
      'Doug Pratt': { email: 'dmpratt@sbcglobal.net' },
      'Gwen Hardage-Vergeer': { email: 'gwenehv@gmail.com', phone: '707-354-0803' },
      'Lori Bialkowsky': { email: 'lbialkowsky@hotmail.com' },
      'Samuel Holley': { email: 'sam@samuelholley.com', phone: '714-496-7006' },
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
    if (isCancelling) return
    
    const { recordId, name, displayDate } = cancelConfirmModal
    setCancelConfirmModal({ show: false, recordId: '', name: '', displayDate: '' })
    setIsCancelling(true)
    
    setSignups(prev => prev.map(signup => {
      if (signup.greeter1?.id === recordId) return { ...signup, greeter1: null }
      if (signup.greeter2?.id === recordId) return { ...signup, greeter2: null }
      return signup
    }))
    
    try {
      const response = await fetch(`/api/signup?recordId=${recordId}&table=greeters`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchSignups()
        setSuccessModal({ show: true, message: 'Signup cancelled successfully.' })
      } else {
        const isNotFound = data.error?.includes('NOT_FOUND') || data.error?.includes('not found') || data.error?.includes('404')
        if (isNotFound) {
          await fetchSignups()
          setSuccessModal({ show: true, message: 'Signup was already cancelled.' })
        } else {
          await fetchSignups()
          setErrorModal({ show: true, title: 'Cancellation Failed', message: data.error || 'Unable to cancel signup. Please try again.' })
        }
      }
    } catch (error) {
      console.error('Error cancelling signup:', error)
      setErrorModal({ show: true, title: 'Network Error', message: 'Unable to connect to the server. Please try again.' })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return
    
    const signup = signups.find(s => s.date === selectedDate)
    if (!signup) return
    
    let fullName = ''
    if (formData.selectedPerson === 'other') {
      fullName = `${formData.firstName} ${formData.lastName}`.trim()
    } else {
      fullName = formData.selectedPerson
    }

    if (!fullName || fullName.trim().length === 0) {
      setErrorModal({ show: true, title: 'Name Required', message: 'Please enter a valid name before submitting.' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(formData.email) || formData.email.endsWith('.')) {
      setErrorModal({ show: true, title: 'Invalid Email', message: 'Please enter a valid email address.' })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'greeters',
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
        await fetchSignups()
        
        setFormData({ 
          selectedPerson: '',
          firstName: '', 
          lastName: '',
          email: '', 
          phone: '', 
          role: 'greeter1' 
        })
        setSelectedDate(null)
        setSuccessModal({ show: true, message: 'Signup successful! You will receive a confirmation email shortly.' })
      } else {
        if (data.code === 'SLOT_TAKEN') {
          setErrorModal({ show: true, title: 'Slot Already Filled', message: data.error })
          await fetchSignups()
        } else {
          setErrorModal({ show: true, title: 'Signup Failed', message: data.error || 'Unable to complete signup. Please try again.' })
        }
      }
    } catch (error) {
      console.error('Error submitting signup:', error)
      setErrorModal({ show: true, title: 'Network Error', message: 'Unable to connect to the server. Please check your internet connection and try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PasswordGate 
      description={
        <div className="text-left max-w-md">
          <h2 className="text-xl font-bold text-blue-600 mb-4">What does the Greeter do?</h2>
          <p className="font-semibold text-gray-800 mb-3">
            Principle Responsibility: Welcoming and assisting people to feel comfortable at our services
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Before the service: Arrive by 9:30</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Greet people as they come in (1 usher at the front and 1 usher at Chapel door is ideal)</li>
                <li>Check their names off on the clipboard. Write people not listed on the last page</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-2">During the service:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>For the "Praising" song, assist the acolyte by lighting the taper</li>
                <li>Take the offering basket up and put it on the alter during the Doxology</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-2">After the service:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Count the attendees and fill in the totals on the clipboard. Clipboard goes into office on Debbie's desk</li>
                <li>Gather up leftover bulletins etc from pews. Save unused Newcomer forms</li>
                <li>Turn off the lights (behind the curtain & power strip behind the band)</li>
                <li>Lock the doors (stage & chapel)</li>
              </ul>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <img
              src="/logo-for-church-larger.jpg"
              alt="Ukiah United Methodist Church"
              width={320}
              height={213}
              className="mx-auto rounded-lg shadow-md mb-4 w-80 md:w-[300px]"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Greeter Signups
            </h1>
            <p className="text-lg md:text-base text-gray-600">Q1 2026 - Sundays</p>
            
            {/* Greeter Responsibilities - Keeping here too for after login */}
            <div className="mt-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-left">
              <h2 className="text-xl font-bold text-blue-600 mb-4">What does the Greeter do?</h2>
              <p className="font-semibold text-gray-800 mb-3">
                Principle Responsibility: Welcoming and assisting people to feel comfortable at our services
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Before the service: Arrive by 9:30</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Greet people as they come in (1 usher at the front and 1 usher at Chapel door is ideal)</li>
                    <li>Check their names off on the clipboard. Write people not listed on the last page</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">During the service:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>For the "Praising" song, assist the acolyte by lighting the taper</li>
                    <li>Take the offering basket up and put it on the alter during the Doxology</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">After the service:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Count the attendees and fill in the totals on the clipboard. Clipboard goes into office on Debbie's desk</li>
                    <li>Gather up leftover bulletins etc from pews. Save unused Newcomer forms</li>
                    <li>Turn off the lights (behind the curtain & power strip behind the band)</li>
                    <li>Lock the doors (stage & chapel)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <a 
              href="/greeters/schedule-summary" 
              target="_blank"
              className="inline-block mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              📋 View Schedule Summary
            </a>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden w-fit mx-auto">
              <div>
                <table className="w-auto" key={lastUpdate}>
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-center font-semibold whitespace-nowrap text-base md:text-sm">Date</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Greeter #1</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Greeter #2</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((signup, index) => (
                      <tr key={signup.date} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-4 font-medium text-gray-900 align-top whitespace-nowrap text-base">
                          {signup.displayDate}
                        </td>
                        <td className="px-4 py-4 align-top w-64">
                          {signup.greeter1 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 text-base">{signup.greeter1.name}</p>
                                <p className="text-base md:text-sm text-gray-600">{signup.greeter1.email}</p>
                                <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.greeter1.phone ? 'visible' : 'hidden' }}>
                                  {signup.greeter1.phone || '111-111-1111'}
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCancelClick(signup.greeter1!.id, signup.greeter1!.name, signup.displayDate)}
                                  className="px-4 py-2.5 md:px-3 md:py-1 text-base md:text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  setSelectedDate(signup.date)
                                  setFormData({ ...formData, role: 'greeter1' })
                                }}
                                className="px-5 py-3 md:px-4 md:py-2 bg-blue-600 text-white hover:bg-blue-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top w-64">
                          {signup.greeter2 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 text-base">{signup.greeter2.name}</p>
                                <p className="text-base md:text-sm text-gray-600">{signup.greeter2.email}</p>
                                <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.greeter2.phone ? 'visible' : 'hidden' }}>
                                  {signup.greeter2.phone || '111-111-1111'}
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCancelClick(signup.greeter2!.id, signup.greeter2!.name, signup.displayDate)}
                                  className="px-4 py-2.5 md:px-3 md:py-1 text-base md:text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  setSelectedDate(signup.date)
                                  setFormData({ ...formData, role: 'greeter2' })
                                }}
                                className="px-5 py-3 md:px-4 md:py-2 bg-blue-600 text-white hover:bg-blue-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signup Modal */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-center mb-4">
                  <img
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={80}
                    height={53}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold mb-4 text-center">
                  Sign Up as Greeter #{formData.role === 'greeter1' ? '1' : '2'}
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
                      <option value="Kay Lieberknecht">Kay Lieberknecht</option>
                      <option value="Linda Nagel">Linda Nagel</option>
                      <option value="Doug Pratt">Doug Pratt</option>
                      <option value="Gwen Hardage-Vergeer">Gwen Hardage-Vergeer</option>
                      <option value="Lori Bialkowsky">Lori Bialkowsky</option>
                      <option value="Samuel Holley">Samuel Holley</option>
                      <option value="Test User">Test User</option>
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
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
                  <img
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
                  <img
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
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
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
                  <img
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
                    {cancelConfirmModal.displayDate} - Greeter
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
