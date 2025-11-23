'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import PasswordGate from '@/components/PasswordGate'
import { reportError } from '@/lib/errorReporting'

// App version for cache busting - increment when you make changes
const APP_VERSION = '2.2.0'

interface Service {
  id: string
  date: string
  displayDate: string
  volunteer1: any | null
  volunteer2: any | null
  attendance: any[]
  notes?: string
}

// Generate calendar data for a specific month
const generateCalendarData = (services: Service[], mainServiceDate: string, month: number, year: number) => {
  // Use Pacific Time for today check
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
    const hasService = services.find((s: Service) => s.date === dateString)
    
    calendarDays.push({
      day,
      date: dateString,
      isToday: dateString === todayString,
      isMainService: dateString === mainServiceDate,
      isSunday: date.getDay() === 0,
      hasService: !!hasService,
      serviceData: hasService
    })
  }
  
  return {
    monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    days: calendarDays
  }
}

export default function Home() {
  const [hoveredService, setHoveredService] = useState<string | null>(null)
  const [selectedSignup, setSelectedSignup] = useState<{serviceId: string} | null>(null)
  const [signupForm, setSignupForm] = useState({
    selectedPerson: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'volunteer1' as 'volunteer1' | 'volunteer2'
  })
  const [isClient, setIsClient] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [currentQuarter, setCurrentQuarter] = useState('Q4-2025')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarQuarter, setCalendarQuarter] = useState(() => {
    // Start with current quarter
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    
    if (month >= 0 && month <= 2) return { quarter: 1, year }
    if (month >= 3 && month <= 5) return { quarter: 2, year }
    if (month >= 6 && month <= 8) return { quarter: 3, year }
    return { quarter: 4, year }
  })
  
  // Calculate current quarter dynamically
  const getCurrentQuarter = () => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    
    if (month >= 0 && month <= 2) return `Q1-${year}`
    if (month >= 3 && month <= 5) return `Q2-${year}`
    if (month >= 6 && month <= 8) return `Q3-${year}`
    return `Q4-${year}`
  }
  
  const CURRENT_QUARTER = getCurrentQuarter()
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  } | null>(null)
  
  // Check if viewing a locked future quarter
  const isLockedQuarter = currentQuarter === 'Q1-2026'

  useEffect(() => {
    setIsClient(true)
    
    // Check version and force reload if outdated
    const storedVersion = localStorage.getItem('appVersion')
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log('New version detected, clearing cache and reloading...')
      localStorage.setItem('appVersion', APP_VERSION)
      // Unregister service worker and reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister())
        }).then(() => {
          window.location.reload()
        })
      } else {
        window.location.reload()
      }
      return
    } else if (!storedVersion) {
      localStorage.setItem('appVersion', APP_VERSION)
    }
    
    fetchServices()
    
    // Setup SSE connection for real-time updates (only for current unlocked quarter)
    let eventSource: EventSource | null = null
    
    if (!isLockedQuarter && typeof window !== 'undefined') {
      console.log(`[SSE Client] Connecting to SSE for quarter: ${currentQuarter}`)
      eventSource = new EventSource(`/api/sse?quarter=${currentQuarter}`)
      
      eventSource.onopen = () => {
        console.log('[SSE Client] Connection established')
      }
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE Client] Received update:', data)
          
          if (data.type === 'data-update' || data.type === 'test') {
            console.log('[SSE Client] Data updated, refreshing services')
            fetchServices(true) // Silent refresh
          } else if (data.type === 'connected') {
            console.log('[SSE Client] Connected successfully:', data.message)
          }
        } catch (error) {
          console.error('[SSE Client] Error parsing SSE message:', error)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('[SSE Client] Connection error:', error)
        eventSource?.close()
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!isLockedQuarter) {
            console.log('[SSE Client] Attempting to reconnect...')
            // The effect will run again and recreate the connection
          }
        }, 5000)
      }
    }
    
    // Cleanup SSE connection on unmount or quarter change
    return () => {
      if (eventSource) {
        console.log('[SSE Client] Closing SSE connection')
        eventSource.close()
      }
    }
  }, [currentQuarter, isLockedQuarter])

  const fetchServices = async (silent = false) => {
    if (!silent) {
      setRefreshing(true)
    }
    
    try {
      const response = await fetch(`/api/services?quarter=${currentQuarter}`, {
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      if (data.success) {
        setServices(data.services)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      // Don't report background refresh errors - they auto-retry every 5 seconds
      // Only report errors from user-triggered actions (signup, cancel)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  const handleQuarterChange = (direction: 'prev' | 'next') => {
    // Close any open signup modal when changing quarters (prevent state leak)
    setSelectedSignup(null)
    setSignupForm({
      selectedPerson: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'volunteer1'
    })
    
    if (direction === 'next' && currentQuarter === 'Q4-2025') {
      setCurrentQuarter('Q1-2026')
    } else if (direction === 'prev' && currentQuarter === 'Q1-2026') {
      setCurrentQuarter('Q4-2025')
    } else if (direction === 'prev' && currentQuarter === 'Q4-2025') {
      setCurrentQuarter('Q3-2025')
    } else if (direction === 'next' && currentQuarter === 'Q3-2025') {
      setCurrentQuarter('Q4-2025')
    }
  }
  
  const handleCalendarQuarterChange = (direction: 'prev' | 'next') => {
    setCalendarQuarter(prev => {
      if (direction === 'next') {
        if (prev.quarter === 4) {
          return { quarter: 1, year: prev.year + 1 }
        }
        return { quarter: prev.quarter + 1, year: prev.year }
      } else {
        if (prev.quarter === 1) {
          return { quarter: 4, year: prev.year - 1 }
        }
        return { quarter: prev.quarter - 1, year: prev.year }
      }
    })
  }

  // Add scroll behavior to highlight service when scrolling
  const scrollToService = (serviceId: string) => {
    // Only run on client side
    if (isClient && typeof window !== 'undefined') {
      const element = document.getElementById(`service-${serviceId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHoveredService(serviceId)
        setTimeout(() => setHoveredService(null), 2000)
      }
    }
  }

  const today = new Date().toISOString().split('T')[0]
  
  // Determine the "main" service based on Pacific Time
  // If it's Sunday before 12pm, highlight this Sunday. After 12pm Sunday, highlight next Sunday.
  const getMainServiceDate = () => {
    const now = new Date()
    // Convert to Pacific Time
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const dayOfWeek = pacificTime.getDay()
    const hour = pacificTime.getHours()
    
    // If it's Sunday (0) and before noon, use today
    if (dayOfWeek === 0 && hour < 12) {
      const year = pacificTime.getFullYear()
      const month = String(pacificTime.getMonth() + 1).padStart(2, '0')
      const day = String(pacificTime.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Otherwise find the next Sunday
    let nextSunday = new Date(pacificTime)
    // If it's Sunday after noon, start from tomorrow
    if (dayOfWeek === 0 && hour >= 12) {
      nextSunday.setDate(nextSunday.getDate() + 1)
    }
    while (nextSunday.getDay() !== 0) {
      nextSunday.setDate(nextSunday.getDate() + 1)
    }
    const year = nextSunday.getFullYear()
    const month = String(nextSunday.getMonth() + 1).padStart(2, '0')
    const day = String(nextSunday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const mainServiceDate = getMainServiceDate()
  
  // Generate calendar data for all 3 months in the quarter
  const getQuarterMonths = (quarter: number, year: number) => {
    const startMonth = (quarter - 1) * 3
    return [startMonth, startMonth + 1, startMonth + 2]
  }
  
  const quarterMonths = getQuarterMonths(calendarQuarter.quarter, calendarQuarter.year)
  const calendarDataForQuarter = quarterMonths.map(month => 
    generateCalendarData(services, mainServiceDate, month, calendarQuarter.year)
  )

  const handleSignup = (serviceId: string, preferredRole?: 'volunteer1' | 'volunteer2') => {
    const service = services.find(s => s.id === serviceId)
    
    // Determine which role to sign up for
    let roleToSignup: 'volunteer1' | 'volunteer2' = preferredRole || 'volunteer1'
    
    // For Christmas Eve, handle all four roles
    const isChristmasEve = service?.displayDate?.includes('Christmas Eve')
    
    if (isChristmasEve) {
      // If preferred role is already taken, find first available role
      if (roleToSignup === 'volunteer1' && service?.volunteer1) {
        if (!service?.volunteer2) {
          roleToSignup = 'volunteer2'
        }
      } else if (roleToSignup === 'volunteer2' && service?.volunteer2) {
        if (!service?.volunteer1) {
          roleToSignup = 'volunteer1'
        }
        if (!service?.volunteer1) {
          roleToSignup = 'volunteer1'
        } else if (!service?.volunteer2) {
          roleToSignup = 'volunteer2'
        }
        if (!service?.volunteer1) {
          roleToSignup = 'volunteer1'
        } else if (!service?.volunteer2) {
          roleToSignup = 'volunteer2'
        }
      }
      
      // Check if all four roles are taken for Christmas Eve
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Service Full',
          message: 'All positions (Volunteer #1, Volunteer #2, First Backup, and Second Backup) are filled for Christmas Eve. Please choose a different Sunday.'
        })
        return
      }
    } else {
      if (roleToSignup === 'volunteer1' && service?.volunteer1) {
        roleToSignup = 'volunteer1'
      }
      
      // Check if both roles are taken for regular services
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Service Full',
          message: 'Both the Volunteer #1 and Backup positions are filled for this service. Please choose a different Sunday.'
        })
        return
      }
    }
    
    setSignupForm(prev => ({ ...prev, role: roleToSignup }))
    setSelectedSignup({ serviceId })
  }

  const handleCancelSignup = async (recordId: string, personName: string, displayDate: string, role: string) => {
    // Show confirmation modal with person's name
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Cancel Signup',
      message: `Are you sure you want to cancel ${personName}'s ${role} signup for ${displayDate}?`,
      onConfirm: async () => {
        setModalState(null)
        
        try {
          const response = await fetch(`/api/signup?recordId=${recordId}`, {
            method: 'DELETE',
          })

          const data = await response.json()

          if (response.ok) {
            setModalState({
              isOpen: true,
              type: 'success',
              title: 'Cancelled Successfully',
              message: `${personName}'s signup has been cancelled.`
            })
            // Refresh services to show updated availability
            await fetchServices()
          } else {
            setModalState({
              isOpen: true,
              type: 'error',
              title: 'Cancellation Failed',
              message: data.error || 'Failed to cancel signup. Please try again.'
            })
          }
        } catch (error) {
          console.error('Error cancelling signup:', error)
          
          // Report error to admin
          await reportError(error, {
            userName: personName,
            serviceDate: displayDate,
            action: 'Cancel Signup'
          })
          
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'An error occurred while cancelling the signup. Please try again.'
          })
        }
      }
    })
  }
  
  // Handle person selection from dropdown
  const handlePersonSelect = (personName: string) => {
    setSignupForm(prev => ({ ...prev, selectedPerson: personName }))
    
    if (personName !== 'other') {
      const volunteer1 = volunteer1s.find(l => l.name === personName)
      if (volunteer1) {
        setSignupForm(prev => ({
          ...prev,
          email: volunteer1.email,
          phone: '', // We don't have phone in the volunteer1 data
          firstName: '',
          lastName: ''
        }))
      }
    } else {
      // Clear fields for "other"
      setSignupForm(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      }))
    }
  }

    const handleSubmitSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSignup || isSubmitting) return

    const service = services.find((s: Service) => s.id === selectedSignup.serviceId)
    if (!service) return
    
    // Determine the name based on selection
    let fullName = ''
    if (signupForm.selectedPerson === 'other') {
      fullName = `${signupForm.firstName} ${signupForm.lastName}`.trim()
    } else {
      fullName = signupForm.selectedPerson
    }

    // Validate name is not empty (CRITICAL: prevents spaces-only names)
    if (!fullName || fullName.trim().length === 0) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter a valid name before submitting.'
      })
      return
    }

    // Enhanced email validation (reject trailing dots, invalid domains)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(signupForm.email) || signupForm.email.endsWith('.')) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address before submitting.'
      })
      return
    }

    // Phone number validation (optional field, but must be valid format if provided)
    if (signupForm.phone && signupForm.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\(\)\+\.]+$/
      if (!phoneRegex.test(signupForm.phone)) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Invalid Phone Number',
          message: 'Please enter a valid phone number (digits, spaces, dashes, and parentheses only).'
        })
        return
      }
      // Ensure at least 10 digits for US phone numbers
      const digitsOnly = signupForm.phone.replace(/\D/g, '')
      if (digitsOnly.length < 10) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Incomplete Phone Number',
          message: 'Please enter a complete phone number with at least 10 digits.'
        })
        return
      }
    }

    // Prevent double submission
    setIsSubmitting(true)

    // Submit to Airtable via API
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceDate: service.date,
          displayDate: service.displayDate,
          name: fullName,
          email: signupForm.email,
          phone: signupForm.phone || '',
          attendanceStatus: '', // No longer used
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Success message includes role and date, and any special notes
        const roleLabel = signupForm.role === 'volunteer1' ? 'Volunteer #1' : 'Backup Volunteer'
        const specialNote = service.notes ? `\n\n${service.notes}` : ''
        
        // Close modal first
        setSelectedSignup(null)
        setSignupForm({
          selectedPerson: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'volunteer1'
        })
        
        // Show success modal
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Signup Successful!',
          message: `Thank you! You are signed up as ${roleLabel} for ${service.displayDate}.${specialNote}`
        })
        
        // Force immediate refresh to show updated data
        await fetchServices()
        
        // Refresh again after 1 second to ensure Airtable sync
        setTimeout(() => {
          fetchServices(true)
        }, 1000)
      } else {
        console.error('Signup failed:', data)
        
        // Report error to admin
        await reportError(new Error(data.error || 'Signup failed'), {
          userName: fullName,
          userEmail: signupForm.email,
          serviceDate: service.displayDate,
          action: 'Submit Signup'
        })
        
        setModalState({
          isOpen: true,
          type: 'error',
          title: 'Signup Failed',
          message: `${data.error}\n\n${data.details || 'Please try again or contact the church office.'}`
        })
      }
    } catch (error) {
      console.error('Signup error:', error)
      
      // Report error to admin
      await reportError(error, {
        userName: fullName,
        userEmail: signupForm.email,
        serviceDate: service.displayDate,
        action: 'Submit Signup'
      })
      
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Signup Error',
        message: `An error occurred: ${error}\n\nPlease try again or contact the church office.`
      })
    } finally {
      // Re-enable submit button after request completes
      setIsSubmitting(false)
    }
  }

  const selectedService = selectedSignup ? services.find((s: Service) => s.id === selectedSignup.serviceId) : null

  if (loading) {
    return (
      <PasswordGate>
        <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        </main>
      </PasswordGate>
    )
  }

  return (
    <PasswordGate>
      {/* Custom Modal for Alerts/Confirmations */}
      {modalState?.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
            {/* Church Logo */}
            <div className="flex justify-center mb-3">
              <img 
                src="/logo-for-church-larger.jpg" 
                alt="Church Logo" 
                className="w-44 h-auto rounded-lg shadow-lg"
              />
            </div>
            
            {/* Icon */}
            <div className="flex items-center justify-center mb-4">
              {modalState.type === 'success' && (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {modalState.type === 'error' && (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {modalState.type === 'warning' && (
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              {modalState.type === 'confirm' && (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-3">
              {modalState.title}
            </h3>
            
            {/* Message */}
            <p className="text-gray-700 text-center mb-6 whitespace-pre-line">
              {modalState.message}
            </p>
            
            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              {modalState.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setModalState(null)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={modalState.onConfirm}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalState(null)}
                  className={`px-8 py-2.5 rounded-lg font-medium transition-colors ${
                    modalState.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    modalState.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      
      {/* Live Update Indicator */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-center py-1 text-xs">
          <span className="animate-pulse">● Updating...</span>
        </div>
      )}
      
      {/* Pinned Calendar - Collapsible (Hidden on mobile) */}
      {calendarOpen ? (
        <div className="hidden md:block fixed top-20 left-4 z-50">
          {/* Close Button - Above Calendar */}
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
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-gray-800">Food Distribution Schedule</h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCalendarQuarterChange('prev')}
                        className="text-green-600 hover:text-green-800 p-0.5"
                        title="Previous quarter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <p className="text-xs text-green-600 font-medium">Q{calendarQuarter.quarter} {calendarQuarter.year}</p>
                      <button
                        onClick={() => handleCalendarQuarterChange('next')}
                        className="text-green-600 hover:text-green-800 p-0.5"
                        title="Next quarter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCalendarOpen(false)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-2 transition-colors shadow-sm border border-red-200"
                  title="Close calendar"
                  aria-label="Close calendar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            
            {/* Render all 3 months in the quarter */}
            {calendarDataForQuarter.map((calendarData, monthIndex) => (
              <div key={monthIndex} className={monthIndex > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                <h2 className="text-xs font-bold text-gray-700 mb-2">{calendarData.monthName}</h2>
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
                        day.isMainService ? 'bg-green-600 text-white font-bold cursor-pointer hover:bg-green-700' :
                        day.isSunday && day.hasService ? (
                          hoveredService === day.serviceData?.id ? 'bg-yellow-300 font-bold border border-yellow-500' : 'bg-green-100 font-medium cursor-pointer hover:bg-green-200'
                        ) :
                        day.isSunday ? 'bg-orange-100 font-medium' :
                        'text-gray-600'
                      }`}
                      title={
                        day?.isMainService ? `Next Service: ${day.serviceData?.displayDate}` :
                        day?.serviceData?.notes ? `${day.serviceData?.notes}` :
                        day?.isSunday && day?.hasService ? `Service on ${day.serviceData?.displayDate}` : ''
                      }
                      onClick={day?.hasService && isClient ? () => scrollToService(day.serviceData!.id) : undefined}
                    >
                      {day?.day || ''}
                      {day?.isMainService && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[9px] text-green-200 whitespace-nowrap font-semibold">
                          NEXT
                        </div>
                      )}
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

      <div className={`container mx-auto px-4 py-8 max-w-4xl transition-all duration-300 ${calendarOpen ? 'md:ml-72 lg:ml-80 xl:ml-96 xl:pl-12' : ''}`}>
        {/* Church Logo at Top */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo-for-church-larger.jpg" 
            alt="Ukiah United Methodist Church" 
            className="w-64 md:w-80 h-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Signup Modal */}
        {selectedSignup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Sign up for {selectedService?.displayDate}
              </h3>
              
              {/* Status Info Box */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Volunteer #1:</span>
                    {selectedService?.volunteer1 ? (
                      <span className="text-green-700 font-semibold">✓ Filled by {selectedService.volunteer1.name}</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Available</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Backup Volunteer:</span>
                    ) : (
                      <span className="text-gray-500">Available</span>
                    )}
                  </div>
                  {selectedService?.displayDate?.includes('Christmas Eve') && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Volunteer #2:</span>
                        {selectedService?.volunteer2 ? (
                          <span className="text-green-700 font-semibold">✓ Filled by {selectedService.volunteer2.name}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Available</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Second Backup:</span>
                        ) : (
                          <span className="text-gray-500">Available</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <form onSubmit={handleSubmitSignup} className="space-y-4">
                {/* Person Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Your Name *
                  </label>
                  <select
                    required
                    value={signupForm.selectedPerson}
                    onChange={(e) => handlePersonSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select --</option>
                    {volunteer1s.map((volunteer1) => (
                      <option key={volunteer1.email} value={volunteer1.name}>
                        {volunteer1.name}
                      </option>
                    ))}
                    <option value="other">Other (not listed)</option>
                  </select>
                </div>

                {/* Show First/Last Name fields if Other selected */}
                {signupForm.selectedPerson === 'other' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.firstName}
                        onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.lastName}
                        onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </>
                )}

                {/* Role Selection */}
                {signupForm.selectedPerson && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sign up as: *
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                        signupForm.role === 'volunteer1' 
                          ? 'bg-green-50 border-green-500 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${selectedService?.volunteer1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="role"
                          value="volunteer1"
                          checked={signupForm.role === 'volunteer1'}
                          onChange={(e) => setSignupForm({ ...signupForm, role: 'volunteer1' })}
                          disabled={!!selectedService?.volunteer1}
                          className="mr-3 w-4 h-4 text-green-600"
                        />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${signupForm.role === 'volunteer1' ? 'text-green-900' : 'text-gray-700'}`}>
                            Volunteer #1
                            {signupForm.role === 'volunteer1' && (
                              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Selected</span>
                            )}
                          </span>
                          {selectedService?.volunteer1 && (
                            <span className="ml-2 text-xs text-red-600 font-medium">
                              (Taken by {selectedService.volunteer1.name})
                            </span>
                          )}
                        </div>
                      </label>
                      
                      {/* Volunteer #2 - Only show for Christmas Eve */}
                      {selectedService?.displayDate?.includes('Christmas Eve') && (
                        <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                          signupForm.role === 'volunteer2' 
                            ? 'bg-green-50 border-green-500 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                        } ${selectedService?.volunteer2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="role"
                            value="volunteer2"
                            checked={signupForm.role === 'volunteer2'}
                            onChange={(e) => setSignupForm({ ...signupForm, role: 'volunteer2' })}
                            disabled={!!selectedService?.volunteer2}
                            className="mr-3 w-4 h-4 text-green-600"
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${signupForm.role === 'volunteer2' ? 'text-green-900' : 'text-gray-700'}`}>
                              Volunteer #2 (Christmas Eve)
                              {signupForm.role === 'volunteer2' && (
                                <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Selected</span>
                              )}
                            </span>
                            {selectedService?.volunteer2 && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (Taken by {selectedService.volunteer2.name})
                              </span>
                            )}
                          </div>
                        </label>
                      )}
                      
                      {/* Second Backup - Only show for Christmas Eve */}
                      {selectedService?.displayDate?.includes('Christmas Eve') && (
                        <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                            ? 'bg-green-50 border-green-500 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                          <input
                            type="radio"
                            name="role"
                            className="mr-3 w-4 h-4 text-green-600"
                          />
                          <div className="flex-1">
                              Second Backup Volunteer (Christmas Eve)
                                <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Selected</span>
                              )}
                            </span>
                              <span className="ml-2 text-xs text-red-600 font-medium">
                              </span>
                            )}
                          </div>
                        </label>
                      )}
                      
                      <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                          ? 'bg-green-50 border-green-500 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                        <input
                          type="radio"
                          name="role"
                          className="mr-3 w-4 h-4 text-green-600"
                        />
                        <div className="flex-1">
                            Backup Volunteer
                              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Selected</span>
                            )}
                          </span>
                            <span className="ml-2 text-xs text-orange-600 font-medium">
                            </span>
                          )}
                        </div>
                      </label>
                    </div>
                    
                    {/* Explanation text */}
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <strong>Note:</strong> Positions update every 5 seconds. Grayed out options have already been filled. If your preferred role is unavailable, choose a different Sunday or select the available role.
                    </div>
                    
                    {/* Check if all positions are filled */}
                    {(() => {
                      const isChristmasEve = selectedService?.displayDate?.includes('Christmas Eve')
                      const allPositionsFilled = isChristmasEve 
                      
                      return allPositionsFilled && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          <strong>⚠️ All positions are filled.</strong> Please choose a different Sunday.
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Contact Info (populated or editable) */}
                {signupForm.selectedPerson && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        autoComplete="off"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        readOnly={signupForm.selectedPerson !== 'other'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="123-456-7890"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedService?.displayDate?.includes('Christmas Eve') 
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      isSubmitting || (selectedService?.displayDate?.includes('Christmas Eve') 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSignup(null)
                      setSignupForm({
                        selectedPerson: '',
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        role: 'volunteer1'
                      })
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upcoming Services */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                Food Distribution - {currentQuarter.replace('-', ' ')}
              </h2>
              {lastUpdated && !isLockedQuarter && (
                <p className="text-xs text-gray-500 ml-8 mt-1">
                  Live updates • Last refreshed: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuarterChange('prev')}
                disabled={currentQuarter === CURRENT_QUARTER}
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
                  currentQuarter === CURRENT_QUARTER
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Quarter
              </button>
              <button
                onClick={() => handleQuarterChange('next')}
                disabled={currentQuarter === 'Q1-2026'}
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
                  currentQuarter === 'Q1-2026'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Next Quarter
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Locked Quarter Notice */}
          {isLockedQuarter && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <h3 className="font-bold text-amber-900 text-lg mb-1">Sign-ups Open in December</h3>
                  <p className="text-sm text-amber-800">
                    Q1 2026 sign-ups will open in the month before the quarter begins. 
                    Check back in December 2025 to sign up for services in January-March 2026.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {services.map((service: Service) => {
              const isMainService = service.date === mainServiceDate
              
              return (
                <div 
                  key={service.id}
                  id={`service-${service.id}`}
                  className={`border rounded-lg p-3 transition-all ${
                    isLockedQuarter 
                      ? 'border-gray-300 bg-gray-100 opacity-60'
                      : isMainService
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : hoveredService === service.id 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onMouseEnter={() => !isLockedQuarter && setHoveredService(service.id)}
                  onMouseLeave={() => !isLockedQuarter && setHoveredService(null)}
                >
                  {/* Date and Special Badges */}
                  <div className="flex items-center space-x-2 mb-3">
                    <p className="font-semibold text-gray-800 text-sm">
                      {service.displayDate.replace(/, \d{4}/, '')}
                    </p>
                    {isMainService && (
                      <span className="text-xs font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded">NEXT SERVICE</span>
                    )}
                    {service.notes && (() => {
                      // Check if it's Christmas Eve
                      if (service.notes.includes('Christmas Eve')) {
                        return (
                          <span className="text-xs font-semibold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                            🕯️ CHRISTMAS EVE • Volunteer lights 5 candles
                          </span>
                        )
                      }
                      
                      // Extract info from Advent notes
                      const weekMatch = service.notes.match(/Advent Week (\d)/)
                      const countMatch = service.notes.match(/\((\d) candles?\)/)
                      
                      if (weekMatch && countMatch) {
                        const week = weekMatch[1]
                        const count = countMatch[1]
                        const candleText = count === '1' ? '1 candle' : `${count} candles`
                        
                        return (
                          <span className="text-xs font-semibold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                            🕯️ ADVENT WEEK {week} • Volunteer lights {candleText}
                          </span>
                        )
                      }
                      
                      return null
                    })()}
                  </div>
                  
                  {/* Service Rows - Different layout for Christmas Eve */}
                  {service.displayDate?.includes('Christmas Eve') ? (
                    <div className="space-y-2 text-sm">
                      {/* Volunteer Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Volunteer:</span>
                          {service.volunteer1 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.volunteer1.name}>
                                {service.volunteer1.name}
                              </span>
                              {service.volunteer1.email && (
                                <span className="text-green-700 text-xs truncate" title={service.volunteer1.email}>
                                  {service.volunteer1.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'volunteer1')}
                              disabled={isLockedQuarter}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.volunteer1 && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.volunteer1!.id, service.volunteer1!.name, service.displayDate, 'Volunteer')}
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* First Backup Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Backup:</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              </span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Sign Up</span>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Volunteer #2 Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Volunteer #2:</span>
                          {service.volunteer2 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.volunteer2.name}>
                                {service.volunteer2.name}
                              </span>
                              {service.volunteer2.email && (
                                <span className="text-green-700 text-xs truncate" title={service.volunteer2.email}>
                                  {service.volunteer2.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'volunteer2')}
                              disabled={isLockedQuarter}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.volunteer2 && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.volunteer2!.id, service.volunteer2!.name, service.displayDate, 'Volunteer #2')}
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Second Backup Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Backup:</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              </span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              disabled={isLockedQuarter}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular Service Layout */
                    <div className="space-y-2 text-sm">
                      {/* Volunteer Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Volunteer:</span>
                          {service.volunteer1 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.volunteer1.name}>
                                {service.volunteer1.name}
                              </span>
                              {service.volunteer1.email && (
                                <span className="text-green-700 text-xs truncate" title={service.volunteer1.email}>
                                  {service.volunteer1.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'volunteer1')}
                              disabled={isLockedQuarter}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.volunteer1 && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.volunteer1!.id, service.volunteer1!.name, service.displayDate, 'Volunteer')}
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Backup Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 whitespace-nowrap">Backup:</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              </span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              disabled={isLockedQuarter}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              disabled={isLockedQuarter}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">What Does a Volunteer Do?</h3>
          <div className="prose prose-blue max-w-none text-sm">
            <p className="text-gray-600 mb-4">
              As a volunteer1, you'll help lead our congregation in worship by:
            </p>
            <ul className="text-gray-600 space-y-1 mb-4 text-sm">
              <li>• Reading the Call to Worship</li>
              <li>• Leading the Responsive Reading</li>
              <li>• Reading the Scripture lesson(s)</li>
              <li>• Assisting with other liturgical elements as needed</li>
            </ul>
            <p className="text-gray-600 text-sm">
              The bulletin and readings will be provided to you in advance. 
              If you have any questions, please contact the church office.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 mt-8 text-sm">
          <p className="mb-1">
            <strong>Ukiah United Methodist Church</strong>
          </p>
          <p className="mb-1">
            270 N. Pine St., Ukiah, CA 95482 | 707.462.3360
          </p>
          <p className="text-xs">
            <a 
              href="https://ukiahumc.org" 
              className="text-green-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ukiahumc.org
            </a>
          </p>
        </footer>
      </div>
    </main>
    </PasswordGate>
  )
}