'use client'

import React, { useState, useEffect } from 'react'
import PasswordGate from '@/components/PasswordGate'

// IMMEDIATE CACHE BUST - Runs before React initializes
if (typeof window !== 'undefined') {
  const FORCE_RELOAD_FLAG = 'greeters_force_reloaded_v3'
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

// App version for cache busting
const APP_VERSION = '10.0.0'

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
  greeter3?: Greeter | null
}

// Convert month to quarter string for API
const getQuarterString = (month: number, year: number) => {
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter}-${year}`
}

// Get month name for display
const getMonthName = (month: number, year: number) => {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Generate calendar data for a specific month (greeters - Sundays)
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
      isSunday: date.getDay() === 0, // Sunday = 0
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

export default function Greeters() {
  // Use dynamic month/year - shows current month + next 2 months
  const initialMonthYear = getCurrentMonthYear()
  const [currentMonth, setCurrentMonth] = useState(initialMonthYear.month)
  const [currentYear, setCurrentYear] = useState(initialMonthYear.year)
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' })
  const [successModal, setSuccessModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [cancelConfirmModal, setCancelConfirmModal] = useState<{ show: boolean; recordId: string; name: string; displayDate: string }>({ show: false, recordId: '', name: '', displayDate: '' })
  const [formData, setFormData] = useState({
    selectedPerson: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'greeter1' as 'greeter1' | 'greeter2' | 'greeter3'
  })

  useEffect(() => {
    // Version check for cache busting
    const storedVersion = localStorage.getItem('greetersVersion_v2')
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem('greetersVersion_v2', APP_VERSION)
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)))
      }
      window.location.reload()
      return
    }
    fetchSignups()
  }, [currentMonth, currentYear])
  
  const fetchSignups = async () => {
    try {
      // Fetch data for 3 months: current month, next month, and month after
      const allSignups: any[] = []
      
      for (let i = 0; i < 3; i++) {
        let targetMonth = currentMonth + i
        let targetYear = currentYear
        
        if (targetMonth > 11) {
          targetMonth -= 12
          targetYear++
        }
        
        const quarterString = getQuarterString(targetMonth, targetYear)
        const response = await fetch(`/api/services?table=greeters&quarter=${quarterString}&t=${Date.now()}`, {
          cache: 'no-store'
        })
        const data = await response.json()
        
        if (data.success && data.services) {
          // Filter to target month only (Sundays)
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
      setSignups(allSignups)
      
      setTimeout(() => {
        setLastUpdate(Date.now())
      }, 0)
    } catch (error) {
      console.error('Error fetching signups:', error)
      setSignups([])
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setSelectedDate(null) // Close any open modal
    
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    }
  }

  // Navigation helper functions for calendar widget
  const handlePreviousMonth = () => handleMonthChange('prev')
  const handleNextMonth = () => handleMonthChange('next')

  // Generate calendar data for 3 months
  const calendarMonths = []
  for (let i = 0; i < 3; i++) {
    let targetMonth = currentMonth + i
    let targetYear = currentYear
    
    if (targetMonth > 11) {
      targetMonth -= 12
      targetYear++
    }
    
    calendarMonths.push(generateCalendarData(signups, targetMonth, targetYear))
  }

  const handlePersonSelect = (personName: string) => {
    setFormData(prev => ({ ...prev, selectedPerson: personName }))
    
    // Map of preset people with their contact info
    const presetPeople: { [key: string]: { email: string; phone?: string; ccEmail?: string } } = {
      'Julie Apostolu': { email: 'forestlove@comcast.net', phone: '707-357-6035' },
      'Kay Lieberknecht': { email: 'kay.hoofin.it@gmail.com', phone: '707-621-3662' },
      'Daphne Macneil': { email: 'daphnemacneil@yahoo.com', phone: '707-972-8552' },
      'Diana Waddle': { email: 'waddlediana@yahoo.com', phone: '707-367-4732' },
      'Annie Gould': { email: 'annia@pacific.net', phone: '707-513-9634' },
      'Mikey Pitts': { email: 'mikeypitts@hotmail.com', phone: '206-707-3885' },
      'Chad Raugewitz': { email: 'raugewitz@att.net', phone: '707-391-4920', ccEmail: 'craugewitz@uusd.net' },
      'Mike Webster': { email: 'webster@pacific.net', phone: '707-513-8163' },
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
      if (signup.greeter3?.id === recordId) return { ...signup, greeter3: null }
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
    
    // Check if this person has a ccEmail (Chad Raugewitz)
    const presetPeople: { [key: string]: { email: string; phone?: string; ccEmail?: string } } = {
      'Julie Apostolu': { email: 'forestlove@comcast.net', phone: '707-357-6035' },
      'Kay Lieberknecht': { email: 'kay.hoofin.it@gmail.com', phone: '707-621-3662' },
      'Daphne Macneil': { email: 'daphnemacneil@yahoo.com', phone: '707-972-8552' },
      'Diana Waddle': { email: 'waddlediana@yahoo.com', phone: '707-367-4732' },
      'Annie Gould': { email: 'annia@pacific.net', phone: '707-513-9634' },
      'Mikey Pitts': { email: 'mikeypitts@hotmail.com', phone: '206-707-3885' },
      'Chad Raugewitz': { email: 'raugewitz@att.net', phone: '707-391-4920', ccEmail: 'craugewitz@uusd.net' },
      'Mike Webster': { email: 'webster@pacific.net', phone: '707-513-8163' },
      'Samuel Holley': { email: 'sam@samuelholley.com', phone: '714-496-7006' },
      'Test User': { email: 'sam+test@samuelholley.com' }
    }
    const ccEmail = formData.selectedPerson !== 'other' && presetPeople[formData.selectedPerson]?.ccEmail
    
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
          role: formData.role,
          ...(ccEmail && { ccEmail })
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
    <PasswordGate title="Greeter Signups" color="purple">
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 py-4 sm:py-6 md:py-8 px-2 sm:px-4">
        
        {/* Calendar Widget - Collapsible (Hidden on mobile) */}
        {calendarOpen ? (
          <div className="hidden md:block fixed top-20 left-4 z-50">
            {/* Close Button */}
            <button
              onClick={() => setCalendarOpen(false)}
              className="w-full bg-purple-600 text-white rounded-t-lg px-4 py-3 shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
              title="Close calendar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close Calendar
            </button>
            
            {/* Calendar */}
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-b-lg border-2 border-gray-200 dark:border-gray-700 w-64 lg:w-72 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="p-3 lg:p-4">
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2">
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100">Greeters</h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousMonth}
                        className="text-purple-600 hover:text-purple-800 p-0.5"
                        title="Previous month"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <p className="text-xs text-purple-600 font-medium">{getMonthName(currentMonth, currentYear)}</p>
                      <button
                        onClick={handleNextMonth}
                        className="text-purple-600 hover:text-purple-800 p-0.5"
                        title="Next month"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              
                {/* Render 3 months */}
                {calendarMonths.map((monthData, monthIndex) => (
                  <div key={monthIndex} className="mb-4">
                    <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{monthData.monthName}</h2>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 py-1">
                          {day}
                        </div>
                      ))}
                      {monthData.days.map((day: any, index: number) => (
                        <div
                          key={index}
                          className={`text-center py-1 rounded text-xs transition-colors relative ${
                            !day ? '' :
                            day.isSunday && day.hasSignup ? 'bg-purple-100 font-medium' :
                            day.isSunday ? 'bg-orange-100 font-medium' :
                            day.isToday ? 'bg-blue-100 font-bold' :
                            'text-gray-600'
                          }`}
                          title={
                            day?.isSunday && day?.hasSignup ? `Greeter Service: ${day.signupData?.displayDate}` : 
                            day?.isSunday ? 'Greeter Service Day' : ''
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
            className="hidden md:flex fixed top-20 left-4 z-50 bg-purple-600 text-white rounded-lg px-4 py-3 shadow-lg hover:bg-purple-700 transition-colors items-center gap-2"
            title="Open calendar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-sm">Open Calendar</span>
          </button>
        )}

        <div className={`max-w-4xl mx-auto px-1 sm:px-2 transition-all duration-300 ${calendarOpen ? 'md:ml-40 lg:ml-48 xl:ml-60' : ''}`}>
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <img
              src="/logo-for-church-larger.jpg"
              alt="Ukiah United Methodist Church"
              width={320}
              height={213}
              className="mx-auto rounded-lg shadow-md mb-4 w-80 md:w-[300px]"
            />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Greeter Signups
            </h1>
            
            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
              <button
                onClick={handlePreviousMonth}
                className="px-3 py-2 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
                aria-label="Previous month"
              >
                <span className="text-lg md:text-xl">←</span>
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 font-semibold min-w-[140px] md:min-w-[200px] text-center">
                {(() => {
                  const month3 = (currentMonth + 2) % 12
                  const year3 = currentMonth + 2 > 11 ? currentYear + 1 : currentYear
                  return `${getMonthName(currentMonth, currentYear).split(' ')[0]} - ${getMonthName(month3, year3)}`
                })()}
              </p>
              
              <button
                onClick={handleNextMonth}
                className="px-3 py-2 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
                aria-label="Next month"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="text-lg md:text-xl">→</span>
              </button>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mb-2">Sundays</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-fit mx-auto">
              <div>
                <table className="w-auto" key={lastUpdate}>
                  <thead className="bg-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-center font-semibold whitespace-nowrap text-base md:text-sm">Date</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Greeter #1</th>
                      <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Greeter #2</th>
                      {(() => {
                        const hasGreeter3 = signups.some(s => s.greeter3)
                        return hasGreeter3 ? (
                          <th className="px-4 py-4 text-center font-semibold text-base md:text-sm w-64">Greeter #3</th>
                        ) : null
                      })()}
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-200">
                  {signups.map((signup, index) => {
                    const hasGreeter3 = signup.greeter3 !== undefined && signup.greeter3 !== null
                    const showGreeter3Column = signups.some(s => s.greeter3)
                    return (
                      <tr key={signup.date} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 align-top whitespace-nowrap text-base">
                          {signup.displayDate}
                        </td>
                        <td className="px-4 py-4 align-top w-64">
                          {signup.greeter1 ? (
                            <div>
                              <div className="mb-2 text-center">
                                <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.greeter1.name}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.greeter1.email}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.greeter1.phone ? 'visible' : 'hidden' }}>
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
                                className="px-5 py-3 md:px-4 md:py-2 bg-purple-600 text-white hover:bg-purple-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
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
                                <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.greeter2.name}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.greeter2.email}</p>
                                <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.greeter2.phone ? 'visible' : 'hidden' }}>
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
                                className="px-5 py-3 md:px-4 md:py-2 bg-purple-600 text-white hover:bg-purple-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                        </td>
                        {showGreeter3Column && (
                          <td className="px-4 py-4 align-top w-64">
                            {signup.greeter3 ? (
                              <div>
                                <div className="mb-2 text-center">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 text-base">{signup.greeter3.name}</p>
                                  <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{signup.greeter3.email}</p>
                                  <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400" style={{ visibility: signup.greeter3.phone ? 'visible' : 'hidden' }}>
                                    {signup.greeter3.phone || '111-111-1111'}
                                  </p>
                                </div>
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleCancelClick(signup.greeter3!.id, signup.greeter3!.name, signup.displayDate)}
                                    className="px-4 py-2.5 md:px-3 md:py-1 text-base md:text-sm bg-red-100 text-red-700 hover:bg-red-200 min-h-[44px] rounded-full transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : hasGreeter3 ? (
                              <div className="flex justify-center">
                                <button
                                  onClick={() => {
                                    setSelectedDate(signup.date)
                                    setFormData({ ...formData, role: 'greeter3' })
                                  }}
                                  className="px-5 py-3 md:px-4 md:py-2 bg-purple-600 text-white hover:bg-purple-700 text-base md:text-sm min-h-[44px] rounded-full transition-colors font-medium"
                                >
                                  Sign Up
                                </button>
                              </div>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                </table>
Bon              </div>
            </div>
          )}
          {/* Greeter Responsibilities */}
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6 text-left mt-4 sm:mt-6 md:mt-8">
              <h2 className="text-xl font-bold text-purple-600 mb-4">What does the Greeter do?</h2>
              <p className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Principle Responsibility: Welcoming and assisting people to feel comfortable at our services
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Before the service: Arrive by 9:30</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Greet people as they come in (1 usher at the front and 1 usher at Chapel door is ideal)</li>
                    <li>Check their names off on the clipboard. Write people not listed on the last page</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">During the service:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>For the "Praising" song, assist the acolyte by lighting the taper</li>
                    <li>Take the offering basket up and put it on the alter during the Doxology</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">After the service:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Count the attendees and fill in the totals on the clipboard. Clipboard goes into office on Debbie's desk</li>
                    <li>Gather up leftover bulletins etc from pews. Save unused Newcomer forms</li>
                    <li>Turn off the lights (behind the curtain & power strip behind the band)</li>
                    <li>Lock the doors (stage & chapel)</li>
                  </ul>
                </div>
              </div>
            </div>
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
                  Sign Up as Greeter #{formData.role === 'greeter1' ? '1' : '2'}
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
                      className="flex-1 px-4 py-2 border rounded-full hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 dark:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
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
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-medium"
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
                    {cancelConfirmModal.displayDate} - Greeter
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
