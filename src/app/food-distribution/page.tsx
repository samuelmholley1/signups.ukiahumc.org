'use client'

import React, { useState, useEffect } from 'react'
import PasswordGate from '@/components/PasswordGate'

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

// Helper to convert month/year to quarter string
const getQuarterString = (month: number, year: number): string => {
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter}-${year}`
}

// Helper to get month name
const getMonthName = (month: number, year: number): string => {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Generate calendar data for a specific month (food distribution - Saturdays)
const generateCalendarData = (signups: Signup[], month: number, year: number) => {
  const now = new Date()
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const todayString = pacificTime.toISOString().split('T')[0]
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()
  
  const calendarDays = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateString = date.toISOString().split('T')[0]
    const hasSignup = signups.find((s: Signup) => s.date === dateString)
    
    calendarDays.push({
      day,
      date: dateString,
      isToday: dateString === todayString,
      isSaturday: date.getDay() === 6, // Saturday = 6
      hasSignup: !!hasSignup,
      signupData: hasSignup
    })
  }
  
  return {
    monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    days: calendarDays
  }
}

export default function FoodDistribution() {
  // Get current month/year dynamically (Pacific Time)
  const getCurrentMonthYear = () => {
    const now = new Date()
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    return {
      month: pacificTime.getMonth(), // 0-11
      year: pacificTime.getFullYear()
    }
  }
  
  const { month: initialMonth, year: initialYear } = getCurrentMonthYear()
  
  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [currentYear, setCurrentYear] = useState(initialYear)
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now()) // Force re-render trigger
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true) // Calendar widget state
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
  }, [currentMonth, currentYear])
  
  const fetchSignups = async () => {
    try {
      const quarterString = getQuarterString(currentMonth, currentYear)
      const response = await fetch(`/api/services?table=food&quarter=${quarterString}&t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await response.json()
      
      if (data.success && data.services) {
        // Filter to only show current month
        const monthStart = new Date(currentYear, currentMonth, 1)
        const monthEnd = new Date(currentYear, currentMonth + 1, 0)
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const monthEndStr = monthEnd.toISOString().split('T')[0]
        
        // Transform API data to our format and filter by month
        const transformed = data.services
          .filter((service: any) => service.date >= monthStartStr && service.date <= monthEndStr)
          .map((service: any) => ({
            date: service.date,
            displayDate: service.displayDate,
            volunteer1: service.volunteer1 || null,
            volunteer2: service.volunteer2 || null,
            volunteer3: service.volunteer3 || null,
            volunteer4: service.volunteer4 || null
          }))
        
        console.log('🔍 [FETCH] Raw API response:', JSON.stringify(data.services, null, 2))
        console.log('🔍 [FETCH] Transformed data:', JSON.stringify(transformed, null, 2))
        console.log('🔍 [FETCH] Current signups state BEFORE update:', JSON.stringify(signups, null, 2))
        
        setSignups(transformed)
        
        // CRITICAL: Use setTimeout to ensure state updates are processed first
        // This forces the key update to happen AFTER React processes the new signups
        setTimeout(() => {
          const newTimestamp = Date.now()
          setLastUpdate(newTimestamp)
          console.log('✅ [FORCE UPDATE] Triggered re-render at', new Date().toLocaleTimeString())
          console.log('📊 [FORCE UPDATE] New signups data:', transformed.length, 'records')
          console.log('🔑 [FORCE UPDATE] New key timestamp:', newTimestamp)
          console.log('🔍 [FORCE UPDATE] Transformed data that SHOULD be in state:', JSON.stringify(transformed, null, 2))
        }, 0)
      }
    } catch (error) {
      console.error('Error fetching signups:', error)
      // Fall back to empty signups - API should provide the dates
      setSignups([])
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
      'Daphne Macneil': { email: 'daphnemacneil@yahoo.com', phone: '707-972-8552' },
      'Cathy McKeon': { email: 'cmckeon999@comcast.net' },
      'Trudy Morgan': { email: 'morganmiller@pacific.net', phone: '707-367-0783' },
      'Vicki Okey': { email: 'vokey123@gmail.com' },
      'Bonnie Reda': { email: 'bonireda@aol.com' },
      'Michele Robbins': { email: 'shalompastor3@gmail.com' },
      'Diana Waddle': { email: 'waddlediana@yahoo.com', phone: '707-367-4732' },
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
    if (isCancelling) return // Prevent double-clicks
    
    const { recordId, name, displayDate } = cancelConfirmModal
    setCancelConfirmModal({ show: false, recordId: '', name: '', displayDate: '' })
    setIsCancelling(true)
    
    // Immediately optimistically remove the signup from UI to prevent double-clicks
    setSignups(prev => prev.map(signup => {
      if (signup.volunteer1?.id === recordId) return { ...signup, volunteer1: null }
      if (signup.volunteer2?.id === recordId) return { ...signup, volunteer2: null }
      if (signup.volunteer3?.id === recordId) return { ...signup, volunteer3: null }
      if (signup.volunteer4?.id === recordId) return { ...signup, volunteer4: null }
      return signup
    }))
    
    try {
      const response = await fetch(`/api/signup?recordId=${recordId}&table=food`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('🔄 [CANCEL] Fetching fresh data from server after cancellation...')
        console.log('🔍 [CANCEL] API response:', JSON.stringify(data, null, 2))
        await fetchSignups()
        console.log('✅ [CANCEL] Fetch complete, UI should update momentarily')
        
        setSuccessModal({ show: true, message: 'Signup cancelled successfully.' })
      } else {
        // Check if it's a "not found" error (already deleted)
        const isNotFound = data.error?.includes('NOT_FOUND') || data.error?.includes('not found') || data.error?.includes('404')
        if (isNotFound) {
          // Record already deleted, just refresh to sync state
          console.log('📋 [CANCEL] Record already deleted, syncing UI...')
          await fetchSignups()
          setSuccessModal({ show: true, message: 'Signup was already cancelled.' })
        } else {
          // Real error, revert optimistic update by refetching
          await fetchSignups()
          setErrorModal({ show: true, title: 'Cancellation Failed', message: data.error || 'Unable to cancel signup. Please try again.' })
        }
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
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return // Prevent double-submission
    
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
    
    setIsSubmitting(true)
    
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
        console.log('🔄 [SIGNUP] Fetching fresh data from server after signup...')
        console.log('🔍 [SIGNUP] API response:', JSON.stringify(data, null, 2))
        await fetchSignups()
        console.log('✅ [SIGNUP] Fetch complete, UI should update momentarily')
        
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
        // Check if it's a duplicate slot error
        if (data.code === 'SLOT_TAKEN') {
          setErrorModal({ show: true, title: 'Slot Already Filled', message: data.error })
          // Refresh to show current state
          await fetchSignups()
        } else {
          setErrorModal({ show: true, title: 'Signup Failed', message: data.error || 'Unable to complete signup. Please try again.' })
        }
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
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigation functions
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Generate calendar data for current month
  const calendarData = generateCalendarData(signups, currentMonth, currentYear)

  return (
    <PasswordGate title="Food Distribution Signups" color="green">
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
        
        {/* Calendar Widget - Collapsible (Hidden on mobile) */}
        {calendarOpen ? (
          <div className="hidden md:block fixed top-20 left-4 z-50">
            {/* Close Button */}
            <button
              onClick={() => setCalendarOpen(false)}
              className="w-full bg-green-600 text-white rounded-t-lg px-4 py-3 shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
              title="Close calendar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close Calendar
            </button>
            
            {/* Calendar */}
            <div className="bg-white shadow-xl rounded-b-lg border-2 border-gray-200 w-72 lg:w-80">
              <div className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-white z-10 pb-2">
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-gray-800">Food Distribution</h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousMonth}
                        className="text-green-600 hover:text-green-800 p-0.5"
                        title="Previous month"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <p className="text-xs text-green-600 font-medium">{getMonthName(currentMonth, currentYear)}</p>
                      <button
                        onClick={handleNextMonth}
                        className="text-green-600 hover:text-green-800 p-0.5"
                        title="Next month"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-center font-medium text-gray-600 py-1">
                      {day}
                    </div>
                  ))}
                  {calendarData.days.map((day, index) => (
                    <div
                      key={index}
                      className={`text-center py-1 rounded text-xs transition-colors relative ${
                        !day ? '' :
                        day.isSaturday && day.hasSignup ? 'bg-green-100 font-medium' :
                        day.isSaturday ? 'bg-orange-100 font-medium' :
                        day.isToday ? 'bg-blue-100 font-bold' :
                        'text-gray-600'
                      }`}
                      title={
                        day?.isSaturday && day?.hasSignup ? `Food Distribution: ${day.signupData?.displayDate}` : 
                        day?.isSaturday ? 'Food Distribution Day' : ''
                      }
                    >
                      {day?.day || ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCalendarOpen(true)}
            className="hidden md:flex fixed top-20 left-4 z-50 bg-green-600 text-white rounded-lg px-4 py-3 shadow-lg hover:bg-green-700 transition-colors items-center gap-2"
            title="Open calendar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-sm">Open Calendar</span>
          </button>
        )}

        <div className={`max-w-4xl mx-auto transition-all duration-300 ${calendarOpen ? 'md:ml-72 lg:ml-80' : ''}`}>
          <div className="text-center mb-8">
            <img
              src="/logo-for-church-larger.jpg"
              alt="Ukiah United Methodist Church"
              width={320}
              height={213}
              className="mx-auto rounded-lg shadow-md mb-4 w-80 md:w-[300px]"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Food Distribution Signups
            </h1>
            
            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={handlePreviousMonth}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">←</span>
                <span>Previous</span>
              </button>
              
              <p className="text-lg md:text-base text-gray-600 font-semibold min-w-[200px]">
                {getMonthName(currentMonth, currentYear)} - Saturdays
              </p>
              
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>Next</span>
                <span className="text-xl">→</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden w-fit mx-auto">
              <div>
                <table className="w-auto" key={lastUpdate}>
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-center font-semibold whitespace-nowrap text-base md:text-sm">Date</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Volunteer #1</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Volunteer #2</th>
                      {(() => {
                        const shouldShowVol3 = signups.some(s => s.volunteer1 && s.volunteer2)
                        console.log('🔍 [VOL3 COLUMN CHECK]', {
                          shouldShow: shouldShowVol3,
                          signups: signups.map(s => ({
                            date: s.displayDate,
                            hasVol1: !!s.volunteer1,
                            hasVol2: !!s.volunteer2,
                            bothFilled: !!(s.volunteer1 && s.volunteer2)
                          }))
                        })
                        return shouldShowVol3 ? (
                          <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64 hidden lg:table-cell">Volunteer #3</th>
                        ) : null
                      })()}
                      {(() => {
                        const shouldShowVol4 = signups.some(s => s.volunteer3)
                        console.log('🔍 [VOL4 COLUMN CHECK]', {
                          shouldShow: shouldShowVol4,
                          signups: signups.map(s => ({
                            date: s.displayDate,
                            hasVol3: !!s.volunteer3
                          }))
                        })
                        return shouldShowVol4 ? (
                          <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64 hidden lg:table-cell">Volunteer #4</th>
                        ) : null
                      })()}
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((signup, index) => {
                    const bothFilled = signup.volunteer1 && signup.volunteer2
                    const hasThirdVolunteer = signup.volunteer3
                    const hasFourthVolunteer = signup.volunteer4
                    const showExtraVolunteers = bothFilled || hasThirdVolunteer || hasFourthVolunteer
                    
                    return (
                      <React.Fragment key={signup.date}>
                      <tr className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-4 font-medium text-gray-900 align-top whitespace-nowrap text-base">
                          {signup.displayDate}
                        </td>
                        <td className="px-4 py-4 align-top w-64">
                          {signup.volunteer1 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 text-base">{signup.volunteer1.name}</p>
                                <p className="text-base md:text-sm text-gray-600">{signup.volunteer1.email}</p>
                                <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.volunteer1.phone ? 'visible' : 'hidden' }}>
                                  {signup.volunteer1.phone || '111-111-1111'}
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCancelClick(signup.volunteer1!.id, signup.volunteer1!.name, signup.displayDate)}
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
                                  setFormData({ ...formData, role: 'volunteer1' })
                                }}
                                className="px-5 py-3 md:px-4 md:py-2 bg-green-600 text-white hover:bg-green-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top w-64">
                          {signup.volunteer2 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 text-base">{signup.volunteer2.name}</p>
                                <p className="text-base md:text-sm text-gray-600">{signup.volunteer2.email}</p>
                                <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.volunteer2.phone ? 'visible' : 'hidden' }}>
                                  {signup.volunteer2.phone || '111-111-1111'}
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCancelClick(signup.volunteer2!.id, signup.volunteer2!.name, signup.displayDate)}
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
                                  setFormData({ ...formData, role: 'volunteer2' })
                                }}
                                className="px-5 py-3 md:px-4 md:py-2 bg-green-600 text-white hover:bg-green-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Volunteer 3 & 4 - Desktop only */}
                        {signups.some(s => s.volunteer1 && s.volunteer2) && (
                          <td className="px-4 py-4 align-top w-64 hidden lg:table-cell">
                            {signup.volunteer3 ? (
                                <div>
                                  <div className="mb-2 text-center">
                                    <p className="font-medium text-gray-900 text-base">{signup.volunteer3.name}</p>
                                    <p className="text-base md:text-sm text-gray-600">{signup.volunteer3.email}</p>
                                    <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.volunteer3.phone ? 'visible' : 'hidden' }}>
                                      {signup.volunteer3.phone || '111-111-1111'}
                                    </p>
                                  </div>
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => handleCancelClick(signup.volunteer3!.id, signup.volunteer3!.name, signup.displayDate)}
                                      className="px-4 py-2.5 md:px-3 md:py-1 text-base md:text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : bothFilled ? (
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedDate(signup.date)
                                      setFormData({ ...formData, role: 'volunteer3' })
                                    }}
                                    className="px-5 py-3 md:px-4 md:py-2 bg-green-600 text-white hover:bg-green-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                                  >
                                    Sign Up
                                  </button>
                                </div>
                              ) : null}
                          </td>
                        )}
                        {signups.some(s => s.volunteer3) && (
                          <td className="px-4 py-4 align-top w-64 hidden lg:table-cell">
                            {signup.volunteer4 ? (
                                <div>
                                  <div className="mb-2 text-center">
                                    <p className="font-medium text-gray-900 text-base">{signup.volunteer4.name}</p>
                                    <p className="text-base md:text-sm text-gray-600">{signup.volunteer4.email}</p>
                                    <p className="text-base md:text-sm text-gray-600" style={{ visibility: signup.volunteer4.phone ? 'visible' : 'hidden' }}>
                                      {signup.volunteer4.phone || '111-111-1111'}
                                    </p>
                                  </div>
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => handleCancelClick(signup.volunteer4!.id, signup.volunteer4!.name, signup.displayDate)}
                                      className="px-4 py-2.5 md:px-3 md:py-1 text-base md:text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : hasThirdVolunteer ? (
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedDate(signup.date)
                                      setFormData({ ...formData, role: 'volunteer4' })
                                    }}
                                    className="px-5 py-3 md:px-4 md:py-2 bg-green-600 text-white hover:bg-green-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                                  >
                                    Sign Up
                                  </button>
                                </div>
                              ) : null}
                          </td>
                        )}
                      </tr>
                      
                      {/* Volunteer 3 & 4 - Mobile row (shown below main row on tablets/phones) */}
                      {showExtraVolunteers && (
                        <tr className={`lg:hidden ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-t-0`}>
                          <td className="px-4 py-2 text-xs text-gray-500 font-medium"></td>
                          <td colSpan={2} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Volunteer 3 Mobile Card */}
                              {(signup.volunteer3 || bothFilled) && (
                                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                  <div className="text-xs font-semibold text-gray-700 mb-2 text-center">Volunteer #3</div>
                                  {signup.volunteer3 ? (
                                    <div>
                                      <div className="mb-2">
                                        <p className="font-medium text-gray-900 text-sm">{signup.volunteer3.name}</p>
                                        <p className="text-xs text-gray-600">{signup.volunteer3.email}</p>
                                        {signup.volunteer3.phone && (
                                          <p className="text-xs text-gray-600">{signup.volunteer3.phone}</p>
                                        )}
                                      </div>
                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => handleCancelClick(signup.volunteer3!.id, signup.volunteer3!.name, signup.displayDate)}
                                          className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors w-full"
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
                                          setFormData({ ...formData, role: 'volunteer3' })
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 text-sm min-h-[44px] rounded-full transition-colors font-medium w-full"
                                      >
                                        Sign Up
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Volunteer 4 Mobile Card */}
                              {(signup.volunteer4 || hasThirdVolunteer) && (
                                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                  <div className="text-xs font-semibold text-gray-700 mb-2 text-center">Volunteer #4</div>
                                  {signup.volunteer4 ? (
                                    <div>
                                      <div className="mb-2">
                                        <p className="font-medium text-gray-900 text-sm">{signup.volunteer4.name}</p>
                                        <p className="text-xs text-gray-600">{signup.volunteer4.email}</p>
                                        {signup.volunteer4.phone && (
                                          <p className="text-xs text-gray-600">{signup.volunteer4.phone}</p>
                                        )}
                                      </div>
                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => handleCancelClick(signup.volunteer4!.id, signup.volunteer4!.name, signup.displayDate)}
                                          className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors w-full"
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
                                          setFormData({ ...formData, role: 'volunteer4' })
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 text-sm min-h-[44px] rounded-full transition-colors font-medium w-full"
                                      >
                                        Sign Up
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
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
