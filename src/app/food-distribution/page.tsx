'use client'

import React, { useState, useEffect } from 'react'
import PasswordGate from '@/components/PasswordGate'

// IMMEDIATE CACHE BUST - Runs before React initializes
if (typeof window !== 'undefined') {
  const FORCE_RELOAD_FLAG = 'food_force_reloaded_v3'
  const hasReloaded = sessionStorage.getItem(FORCE_RELOAD_FLAG)
  
  if (!hasReloaded) {
    console.log('[CACHE BUST] Forcing reload - clearing all caches')
    sessionStorage.setItem(FORCE_RELOAD_FLAG, 'true')
    localStorage.clear()
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister())
      })
    }
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
    
    // Hard reload
    window.location.reload()
  }
}

// CRITICAL: Increment this to force ALL users to hard reload
const APP_VERSION = '10.0.0'

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

// Get current month and year
const getCurrentMonthYear = () => {
  const now = new Date()
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const month = pacificTime.getMonth()
  const year = pacificTime.getFullYear()
  
  return { month, year }
}

// Preset food distribution volunteer contact info - single source of truth
const FOOD_DIST_PRESET_PEOPLE: { [key: string]: { email: string; phone?: string } } = {
  'Marly Anderson': { email: 'mnanderson75@yahoo.com', phone: '707-272-8710' },
  'Raul Chairez': { email: 'raulshealinghands3@gmail.com' },
  'Don Damp': { email: 'donalddamp@gmail.com' },
  'Edward Dick': { email: 'edwardpdick@gmail.com' },
  'Samuel Holley': { email: 'sam@samuelholley.com', phone: '714-496-7006' },
  'Billy Jenne': { email: 'billyjenne2@gmail.com' },
  'Daphne Macneil': { email: 'daphnemacneil@yahoo.com', phone: '707-972-8552' },
  'Noreen McDonald': { email: 'norio@xmission.com', phone: '801-664-4626' },
  'Cathy McKeon': { email: 'cmckeon999@comcast.net' },
  'Trudy Morgan': { email: 'morganmiller@pacific.net', phone: '707-367-0783' },
  'Vicki Okey': { email: 'vokey123@gmail.com' },
  'Bonnie Reda': { email: 'bonireda@aol.com' },
  'Michele Robbins': { email: 'shalompastor3@gmail.com' },
  'Diana Waddle': { email: 'waddlediana@yahoo.com', phone: '707-367-4732' },
  'Bev Williams': { email: 'grandma3410@gmail.com' },
  'Test User': { email: 'sam+test@samuelholley.com' }
}

export default function FoodDistribution() {
  // Use dynamic month/year with 25th advance logic
  const initialMonthYear = getCurrentMonthYear()
  const [currentMonth, setCurrentMonth] = useState(initialMonthYear.month)
  const [currentYear, setCurrentYear] = useState(initialMonthYear.year)
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
    // AGGRESSIVE VERSION CHECK - Force reload if version mismatch
    const storedVersion = localStorage.getItem('foodDistributionVersion_v2')
    if (storedVersion !== APP_VERSION) {
      console.log(`Version mismatch: stored=${storedVersion}, current=${APP_VERSION}. Forcing reload...`)
      localStorage.setItem('foodDistributionVersion_v2', APP_VERSION)
      
      // Clear all caches and force reload
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name))
        })
      }
      
      // Force hard reload
      window.location.reload()
      return
    }
    
    fetchSignups()
  }, [currentMonth, currentYear])
  
  const fetchSignups = async () => {
    try {
      // Fetch data for 2 months: current month and next month
      const allSignups: any[] = []
      
      for (let i = 0; i < 2; i++) {
        let targetMonth = currentMonth + i
        let targetYear = currentYear
        
        if (targetMonth > 11) {
          targetMonth -= 12
          targetYear++
        }
        
        const quarterString = getQuarterString(targetMonth, targetYear)
        const response = await fetch(`/api/services?table=food&quarter=${quarterString}&t=${Date.now()}`, {
          cache: 'no-store'
        })
        const data = await response.json()
        
        if (data.success && data.services) {
          // Filter to target month only (Saturdays)
          const filteredSignups = data.services.filter((service: any) => {
            // Parse date string as YYYY-MM-DD to avoid timezone issues
            const [year, month, day] = service.date.split('-').map(Number)
            return month - 1 === targetMonth && year === targetYear
          })
          allSignups.push(...filteredSignups)
        }
      }
      
      // Sort by date
      allSignups.sort((a, b) => a.date.localeCompare(b.date))
      
      console.log('🔍 [FETCH] After fetching 2 months:', allSignups.length, 'food distribution events')
      
      setSignups(allSignups)
      
      // CRITICAL: Use setTimeout to ensure state updates are processed first
      // This forces the key update to happen AFTER React processes the new signups
      setTimeout(() => {
        const newTimestamp = Date.now()
        setLastUpdate(newTimestamp)
        console.log('✅ [FORCE UPDATE] Triggered re-render at', new Date().toLocaleTimeString())
        console.log('📊 [FORCE UPDATE] New signups data:', allSignups.length, 'records')
        console.log('🔑 [FORCE UPDATE] New key timestamp:', newTimestamp)
      }, 0)
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
    
    if (FOOD_DIST_PRESET_PEOPLE[personName]) {
      setFormData(prev => ({
        ...prev,
        email: FOOD_DIST_PRESET_PEOPLE[personName].email,
        phone: FOOD_DIST_PRESET_PEOPLE[personName].phone || '',
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

  // Generate calendar data for 2 months
  const calendarMonths = []
  for (let i = 0; i < 2; i++) {
    let targetMonth = currentMonth + i
    let targetYear = currentYear
    
    if (targetMonth > 11) {
      targetMonth -= 12
      targetYear++
    }
    
    calendarMonths.push(generateCalendarData(signups, targetMonth, targetYear))
  }

  return (
    <PasswordGate title="Food Distribution Signups" color="green">
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-4 sm:py-6 md:py-8 px-2 sm:px-4">
        
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
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-800 shadow-xl rounded-b-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 w-72 lg:w-80 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-800 z-10 pb-2">
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 dark:text-gray-100">Food Distribution</h1>
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
                        onClick={handleNextMonth} aria-label="Next month"
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
              
                {/* Render 2 months */}
                {calendarMonths.map((monthData, monthIndex) => (
                  <div key={monthIndex} className="mb-4">
                    <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{monthData.monthName}</h2>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400 py-1">
                          {day}
                        </div>
                      ))}
                      {monthData.days.map((day: any, index: number) => (
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
                ))}
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

        <div className={`max-w-4xl mx-auto px-1 sm:px-2 transition-all duration-300 ${calendarOpen ? 'md:ml-48 lg:ml-60 xl:ml-72' : ''}`}>
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <img
              src="/logo-for-church-larger.jpg"
              alt="Ukiah United Methodist Church"
              width={320}
              height={213}
              className="mx-auto rounded-lg shadow-md mb-4 w-64 md:w-80 lg:w-[300px]"
            />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 mb-2">
              Food Distribution Signups
            </h1>
            
            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
              <button
                onClick={handlePreviousMonth}
                className="px-3 py-2 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
                aria-label="Previous month"
              >
                <span className="text-lg md:text-xl">←</span>
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 dark:text-gray-400 font-semibold min-w-[140px] md:min-w-[200px] text-center">
                {(() => {
                  const month2 = (currentMonth + 1) % 12
                  const year2 = currentMonth + 1 > 11 ? currentYear + 1 : currentYear
                  return `${getMonthName(currentMonth, currentYear).split(' ')[0]} - ${getMonthName(month2, year2)}`
                })()}
              </p>
              
              <button
                onClick={handleNextMonth}
                className="px-3 py-2 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
                aria-label="Next month"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="text-lg md:text-xl">→</span>
              </button>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mb-2">Saturdays</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : signups.length === 0 ? (
            <div className="p-8 text-center bg-blue-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-400 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No Saturdays Found</h3>
              <p className="text-gray-600 dark:text-gray-300">There are no Saturday food distributions in {getMonthName(currentMonth, currentYear)}.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try navigating to a different month.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl overflow-x-auto w-full md:w-auto md:mx-auto">
              <div>
                <table className="w-full md:w-auto" key={lastUpdate}>
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-center font-semibold whitespace-nowrap text-sm md:text-base">Date</th>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-center font-semibold text-sm md:text-base md:w-64">Volunteer #1</th>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-center font-semibold text-sm md:text-base md:w-64">Volunteer #2</th>
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
                        <td className="px-2 md:px-4 py-3 md:py-4 font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 align-top whitespace-nowrap text-sm md:text-base">
                          {signup.displayDate}
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-4 align-top">
                          {signup.volunteer1 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.volunteer1.name}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer1.email}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer1.phone ? 'visible' : 'hidden' }}>
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
                        <td className="px-2 md:px-4 py-3 md:py-4 align-top">
                          {signup.volunteer2 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-sm md:text-base">{signup.volunteer2.name}</p>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer2.email}</p>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer2.phone ? 'visible' : 'hidden' }}>
                                  {signup.volunteer2.phone || '111-111-1111'}
                                </p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCancelClick(signup.volunteer2!.id, signup.volunteer2!.name, signup.displayDate)}
                                  className="px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
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
                                className="px-4 py-2.5 md:px-5 md:py-3 bg-green-600 text-white hover:bg-green-700 text-sm md:text-base min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Volunteer 3 & 4 - Desktop only */}
                        {signups.some(s => s.volunteer1 && s.volunteer2) && (
                          <td className="px-2 md:px-4 py-3 md:py-4 align-top hidden lg:table-cell">
                            {signup.volunteer3 ? (
                                <div>
                                  <div className="mb-2 text-center">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.volunteer3.name}</p>
                                    <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer3.email}</p>
                                    <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer3.phone ? 'visible' : 'hidden' }}>
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
                                    <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.volunteer4.name}</p>
                                    <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer4.email}</p>
                                    <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer4.phone ? 'visible' : 'hidden' }}>
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
                      
                      {/* Volunteer 3 & 4 - Mobile row (aligned under Vol 1 & 2) */}
                      {showExtraVolunteers && (
                        <tr className={`lg:hidden ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-t-2 border-green-200`}>
                          <td className="px-2 py-2 text-xs text-gray-500 font-medium"></td>
                          
                          {/* Volunteer 3 - Under Volunteer 1 */}
                          <td className="px-2 md:px-4 py-3 md:py-4 align-top">
                            {(signup.volunteer3 || bothFilled) && (
                              <>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 text-center">Vol #3</div>
                                {signup.volunteer3 ? (
                                  <div>
                                    <div className="mb-2 text-center">
                                      <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-sm">{signup.volunteer3.name}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer3.email}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer3.phone ? 'visible' : 'hidden' }}>
                                        {signup.volunteer3.phone || '111-111-1111'}
                                      </p>
                                    </div>
                                    <div className="flex justify-center">
                                      <button
                                        onClick={() => handleCancelClick(signup.volunteer3!.id, signup.volunteer3!.name, signup.displayDate)}
                                        className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
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
                                      className="px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 text-sm min-h-[44px] rounded-full transition-colors font-medium"
                                    >
                                      Sign Up
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          
                          {/* Volunteer 4 - Under Volunteer 2 */}
                          <td className="px-2 md:px-4 py-3 md:py-4 align-top">
                            {(signup.volunteer4 || hasThirdVolunteer) && (
                              <>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 text-center">Vol #4</div>
                                {signup.volunteer4 ? (
                                  <div>
                                    <div className="mb-2 text-center">
                                      <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-sm">{signup.volunteer4.name}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.volunteer4.email}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.volunteer4.phone ? 'visible' : 'hidden' }}>
                                        {signup.volunteer4.phone || '111-111-1111'}
                                      </p>
                                    </div>
                                    <div className="flex justify-center">
                                      <button
                                        onClick={() => handleCancelClick(signup.volunteer4!.id, signup.volunteer4!.name, signup.displayDate)}
                                        className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
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
                                      className="px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 text-sm min-h-[44px] rounded-full transition-colors font-medium"
                                    >
                                      Sign Up
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
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
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 max-w-md w-full">
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
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
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
                      {Object.keys(FOOD_DIST_PRESET_PEOPLE).sort().map(name => {
                        const personEmail = FOOD_DIST_PRESET_PEOPLE[name].email.toLowerCase().trim()
                        const currentSignup = signups.find(s => s.date === selectedDate)
                        const busyEmails = [
                          currentSignup?.volunteer1?.email,
                          currentSignup?.volunteer2?.email,
                          currentSignup?.volunteer3?.email,
                          currentSignup?.volunteer4?.email
                        ].filter(Boolean).map(e => e!.toLowerCase().trim())
                        const isBusy = busyEmails.includes(personEmail)
                        
                        return (
                          <option 
                            key={name} 
                            value={name}
                            disabled={isBusy}
                            style={isBusy ? { color: '#9ca3af', fontStyle: 'italic' } : {}}
                          >
                            {name}{isBusy ? ' (Already signed up for this shift)' : ''}
                          </option>
                        )
                      })}
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
                      className="flex-1 px-4 py-2 border rounded-full hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 dark:bg-gray-700"
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
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 max-w-md w-full shadow-2xl">
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">{errorModal.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{errorModal.message}</p>
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
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 max-w-md w-full shadow-2xl">
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">Success!</h3>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{successModal.message}</p>
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
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-center mb-4">
                  <img
                    src="/logo-for-church-larger.jpg"
                    alt="UUMC"
                    width={150}
                    height={100}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-center mb-3 sm:mb-4 md:mb-6">
                  <div className="text-5xl mb-3">❓</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-3">Confirm Cancellation</h3>
                  <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Are you sure you want to cancel <span className="font-semibold">{cancelConfirmModal.name}</span>&apos;s signup?
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-sm font-medium">
                    {cancelConfirmModal.displayDate} - Food Distribution
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelConfirmModal({ show: false, recordId: '', name: '', displayDate: '' })}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 dark:text-gray-100 dark:text-gray-100 rounded-full hover:bg-gray-300 transition-colors font-medium"
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
