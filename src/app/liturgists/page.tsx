'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import PasswordGate from '@/components/PasswordGate'
import { getAllLiturgists } from '@/admin/liturgists'
import { reportError } from '@/lib/errorReporting'

// IMMEDIATE CACHE BUST - Runs before React initializes
if (typeof window !== 'undefined') {
  const FORCE_RELOAD_FLAG = 'liturgists_force_reloaded_v3'
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

// App version for cache busting - increment when you make changes
const APP_VERSION = '10.0.0'

interface Service {
  id: string
  date: string
  displayDate: string
  liturgist: any | null
  liturgist2?: any | null  // Second liturgist for special services like Christmas Eve
  backup: any | null
  backup2?: any | null  // Second backup for special services like Christmas Eve
  attendance: any[]
  notes?: string
}

// Get current month and year with 25th-of-month advance logic
const getCurrentMonthYear = () => {
  const now = new Date()
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const day = pacificTime.getDate()
  let month = pacificTime.getMonth()
  let year = pacificTime.getFullYear()
  
  console.log('[LITURGISTS] getCurrentMonthYear DEBUG:', {
    rawDate: now.toISOString(),
    pacificDate: pacificTime.toLocaleString(),
    day,
    monthBefore: month,
    yearBefore: year
  })
  
  // On/after 25th, advance to next month
  if (day >= 25) {
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }
  
  console.log('[LITURGISTS] After 25th logic:', { monthAfter: month, yearAfter: year })
  
  return { month, year }
}

// Convert month to quarter string for API
const getQuarterString = (month: number, year: number) => {
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter}-${year}`
}

// Get month name for display
const getMonthName = (month: number, year: number) => {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
    role: 'liturgist' as 'liturgist' | 'liturgist2' // | 'backup' | 'backup2'
  })
  const [isClient, setIsClient] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(true)
  
  // Use dynamic month/year with 25th advance logic
  const initialMonthYear = getCurrentMonthYear()
  const [currentMonth, setCurrentMonth] = useState(initialMonthYear.month)
  const [currentYear, setCurrentYear] = useState(initialMonthYear.year)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  } | null>(null)
  
  const liturgists = getAllLiturgists()

  useEffect(() => {
    setIsClient(true)
    
    // Check version and force reload if outdated
    const storedVersion = localStorage.getItem('appVersion_v2')
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log('New version detected, clearing cache and reloading...')
      localStorage.setItem('appVersion_v2', APP_VERSION)
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
      localStorage.setItem('appVersion_v2', APP_VERSION)
    }
    
    fetchServices()
    
    // Setup SSE connection for real-time updates
    let eventSource: EventSource | null = null
    const currentQuarter = getQuarterString(currentMonth, currentYear)
    
    if (typeof window !== 'undefined') {
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
          console.log('[SSE Client] Attempting to reconnect...')
          // The effect will run again and recreate the connection
        }, 5000)
      }
    }
    
    // Cleanup SSE connection on unmount or month change
    return () => {
      if (eventSource) {
        console.log('[SSE Client] Closing SSE connection')
        eventSource.close()
      }
    }
  }, [currentMonth, currentYear])

  const fetchServices = async (silent = false) => {
    if (!silent) {
      setRefreshing(true)
    }
    
    console.log('[LITURGISTS] fetchServices called with currentMonth:', currentMonth, 'currentYear:', currentYear)
    
    try {
      const quarter = getQuarterString(currentMonth, currentYear)
      console.log('[LITURGISTS] Fetching quarter:', quarter)
      const response = await fetch(`/api/services?quarter=${quarter}`, {
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      console.log('[LITURGISTS] API returned', data.services?.length, 'services')
      if (data.success) {
        // Filter to current month only
        const filteredServices = data.services.filter((service: any) => {
          // Parse date string as YYYY-MM-DD to avoid timezone issues
          const [year, month, day] = service.date.split('-').map(Number)
          const matches = month - 1 === currentMonth && year === currentYear
          if (!matches) {
            console.log('[LITURGISTS] Filtered out:', service.displayDate, 'serviceMonth:', month - 1, 'targetMonth:', currentMonth)
          }
          return matches
        })
        console.log('[LITURGISTS] After filtering:', filteredServices.length, 'services for month', currentMonth)
        setServices(filteredServices)
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
  
  const handleMonthChange = (direction: 'prev' | 'next') => {
    // Close any open signup modal when changing months (prevent state leak)
    setSelectedSignup(null)
    setSignupForm({
      selectedPerson: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'liturgist'
    })
    
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
  
  // Generate calendar data for current month only
  const calendarData = generateCalendarData(services, mainServiceDate, currentMonth, currentYear)

  const handleSignup = (serviceId: string, preferredRole?: 'liturgist' | 'liturgist2' /* | 'backup' | 'backup2' */) => {
    const service = services.find(s => s.id === serviceId)
    
    // Determine which role to sign up for
    let roleToSignup: 'liturgist' | 'liturgist2' /* | 'backup' | 'backup2' */ = preferredRole || 'liturgist'
    
    // For Christmas Eve, handle all four roles
    const isChristmasEve = service?.displayDate?.includes('Christmas Eve')
    
    if (isChristmasEve) {
      // If preferred role is already taken, find first available role
      if (roleToSignup === 'liturgist' && service?.liturgist) {
        if (!service?.liturgist2) {
          roleToSignup = 'liturgist2'
        } // else if (!service?.backup) {
        //   roleToSignup = 'backup'
        // } else if (!service?.backup2) {
        //   roleToSignup = 'backup2'
        // }
      } else if (roleToSignup === 'liturgist2' && service?.liturgist2) {
        if (!service?.liturgist) {
          roleToSignup = 'liturgist'
        } // else if (!service?.backup) {
        //   roleToSignup = 'backup'
        // } else if (!service?.backup2) {
        //   roleToSignup = 'backup2'
        // }
      } // else if (roleToSignup === 'backup' && service?.backup) {
      //   if (!service?.liturgist) {
      //     roleToSignup = 'liturgist'
      //   } else if (!service?.liturgist2) {
      //     roleToSignup = 'liturgist2'
      //   } else if (!service?.backup2) {
      //     roleToSignup = 'backup2'
      //   }
      // } else if (roleToSignup === 'backup2' && service?.backup2) {
      //   if (!service?.liturgist) {
      //     roleToSignup = 'liturgist'
      //   } else if (!service?.liturgist2) {
      //     roleToSignup = 'liturgist2'
      //   } else if (!service?.backup) {
      //     roleToSignup = 'backup'
      //   }
      // }
      
      // Check if all roles are taken for Christmas Eve (liturgist + liturgist2 only now)
      if (service?.liturgist && service?.liturgist2) { // && service?.backup && service?.backup2) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Service Full',
          message: 'All positions (Main Liturgist and Second Liturgist) are filled for Christmas Eve. Please choose a different Sunday.'
        })
        return
      }
    } else {
      // Regular service logic (liturgist only)
      // if (roleToSignup === 'liturgist' && service?.liturgist) {
      //   roleToSignup = 'backup'
      // } else if (roleToSignup === 'backup' && service?.backup) {
      //   roleToSignup = 'liturgist'
      // }
      
      // Check if liturgist position is taken for regular services
      if (service?.liturgist) { // && service?.backup) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Service Full',
          message: 'The Main Liturgist position is filled for this service. Please choose a different Sunday.'
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
      const liturgist = liturgists.find(l => l.name === personName)
      if (liturgist) {
        setSignupForm(prev => ({
          ...prev,
          email: liturgist.email,
          phone: '', // We don't have phone in the liturgist data
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
          role: signupForm.role, // Send internal role value: 'liturgist', 'liturgist2', or 'backup'
          attendanceStatus: '', // No longer used
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Success message includes role and date, and any special notes
        const roleLabel = signupForm.role === 'liturgist' ? 'Main Liturgist' : 'Backup Liturgist'
        const specialNote = service.notes ? `\n\n${service.notes}` : ''
        
        // Close modal first
        setSelectedSignup(null)
        setSignupForm({
          selectedPerson: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'liturgist'
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
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">Loading services...</p>
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
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full">
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 text-center mb-3">
              {modalState.title}
            </h3>
            
            {/* Message */}
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-center mb-6 whitespace-pre-line">
              {modalState.message}
            </p>
            
            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              {modalState.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setModalState(null)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 dark:text-gray-100 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 transition-colors"
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
                    'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      
      {/* Live Update Indicator */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-center py-1 text-xs">
          <span className="animate-pulse">● Updating...</span>
        </div>
      )}
      
      {/* Pinned Calendar - Collapsible (Hidden on mobile) */}
      {calendarOpen ? (
        <div className="hidden md:block fixed top-20 left-4 z-50">
          {/* Close Button - Above Calendar */}
          <button
            onClick={() => setCalendarOpen(false)}
            className="w-full bg-blue-600 text-white rounded-t-lg px-4 py-3 shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
            title="Close calendar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close Calendar
          </button>
          
          {/* Calendar */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-xl rounded-b-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 w-64 lg:w-72">
            <div className="p-3 lg:p-4">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 z-10 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 dark:text-gray-100">Liturgist Schedule</h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMonthChange('prev')} aria-label="Previous month"
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Previous month"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <p className="text-xs text-blue-600 font-medium">{getMonthName(currentMonth, currentYear)}</p>
                      <button
                        onClick={() => handleMonthChange('next')} aria-label="Next month"
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Next month"
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
            
            {/* Render single month */}
            <div>
              <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">{calendarData.monthName}</h2>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400 py-1">
                    {day}
                  </div>
                ))}
                {calendarData.days.map((day, index) => (
                  <div
                    key={index}
                    className={`text-center py-1 rounded text-xs transition-colors relative ${
                      !day ? '' :
                      day.isMainService ? 'bg-purple-600 text-white font-bold cursor-pointer hover:bg-purple-700' :
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
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[9px] text-purple-200 whitespace-nowrap font-semibold">
                        NEXT
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <button
          onClick={() => setCalendarOpen(true)}
          className="hidden md:flex fixed top-20 left-4 z-50 bg-blue-600 text-white rounded-lg px-4 py-3 shadow-lg hover:bg-blue-700 transition-colors items-center gap-2"
          title="Open calendar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-semibold text-sm">Open Calendar</span>
        </button>
      )}

      <div className={`container mx-auto px-1 sm:px-2 md:px-4 py-4 sm:py-6 md:py-8 max-w-4xl transition-all duration-300 ${calendarOpen ? 'md:ml-48 lg:ml-60 xl:ml-72' : ''}`}>
        {/* Church Logo at Top */}
        <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
          <img 
            src="/logo-for-church-larger.jpg" 
            alt="Ukiah United Methodist Church" 
            className="w-48 sm:w-64 md:w-80 lg:w-96 h-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Signup Modal */}
        {selectedSignup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100 mb-2">
                Sign up for {selectedService?.displayDate}
              </h3>
              
              {/* Status Info Box */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">Main Liturgist:</span>
                    {selectedService?.liturgist ? (
                      <span className="text-green-700 font-semibold">✓ Filled by {selectedService.liturgist.name}</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Available</span>
                    )}
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">Backup Liturgist:</span>
                    {selectedService?.backup ? (
                      <span className="text-orange-700 font-semibold">✓ Filled by {selectedService.backup.name}</span>
                    ) : (
                      <span className="text-gray-500">Available</span>
                    )}
                  </div> */}
                  {selectedService?.displayDate?.includes('Christmas Eve') && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">Second Liturgist:</span>
                        {selectedService?.liturgist2 ? (
                          <span className="text-green-700 font-semibold">✓ Filled by {selectedService.liturgist2.name}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Available</span>
                        )}
                      </div>
                      {/* <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">Second Backup:</span>
                        {selectedService?.backup2 ? (
                          <span className="text-orange-700 font-semibold">✓ Filled by {selectedService.backup2.name}</span>
                        ) : (
                          <span className="text-gray-500">Available</span>
                        )}
                      </div> */}
                    </>
                  )}
                </div>
              </div>
              
              <form onSubmit={handleSubmitSignup} className="space-y-4">
                {/* Person Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Select Your Name *
                  </label>
                  <select
                    required
                    value={signupForm.selectedPerson}
                    onChange={(e) => handlePersonSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select --</option>
                    {liturgists.map((liturgist) => (
                      <option key={liturgist.email} value={liturgist.name}>
                        {liturgist.name}
                      </option>
                    ))}
                    <option value="other">Other (not listed)</option>
                  </select>
                </div>

                {/* Show First/Last Name fields if Other selected */}
                {signupForm.selectedPerson === 'other' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.firstName}
                        onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.lastName}
                        onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {/* Role Selection */}
                {signupForm.selectedPerson && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      Sign up as: *
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                        signupForm.role === 'liturgist' 
                          ? 'bg-blue-50 border-blue-500 shadow-sm' 
                          : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300'
                      } ${selectedService?.liturgist ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="role"
                          value="liturgist"
                          checked={signupForm.role === 'liturgist'}
                          onChange={(e) => setSignupForm({ ...signupForm, role: 'liturgist' })}
                          disabled={!!selectedService?.liturgist}
                          className="mr-3 w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${signupForm.role === 'liturgist' ? 'text-blue-900' : 'text-gray-700'}`}>
                            Main Liturgist
                            {signupForm.role === 'liturgist' && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Selected</span>
                            )}
                          </span>
                          {selectedService?.liturgist && (
                            <span className="ml-2 text-xs text-red-600 font-medium">
                              (Taken by {selectedService.liturgist.name})
                            </span>
                          )}
                        </div>
                      </label>
                      
                      {/* Second Liturgist - Only show for Christmas Eve */}
                      {selectedService?.displayDate?.includes('Christmas Eve') && (
                        <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                          signupForm.role === 'liturgist2' 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300'
                        } ${selectedService?.liturgist2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="role"
                            value="liturgist2"
                            checked={signupForm.role === 'liturgist2'}
                            onChange={(e) => setSignupForm({ ...signupForm, role: 'liturgist2' })}
                            disabled={!!selectedService?.liturgist2}
                            className="mr-3 w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${signupForm.role === 'liturgist2' ? 'text-blue-900' : 'text-gray-700'}`}>
                              Second Liturgist (Christmas Eve)
                              {signupForm.role === 'liturgist2' && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Selected</span>
                              )}
                            </span>
                            {selectedService?.liturgist2 && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (Taken by {selectedService.liturgist2.name})
                              </span>
                            )}
                          </div>
                        </label>
                      )}
                      
                      {/* Second Backup - Only show for Christmas Eve */}
                      {/* {selectedService?.displayDate?.includes('Christmas Eve') && (
                        <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                          signupForm.role === 'backup2' 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300'
                        } ${selectedService?.backup2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="role"
                            value="backup2"
                            checked={signupForm.role === 'backup2'}
                            onChange={(e) => setSignupForm({ ...signupForm, role: 'backup2' })}
                            disabled={!!selectedService?.backup2}
                            className="mr-3 w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${signupForm.role === 'backup2' ? 'text-blue-900' : 'text-gray-700'}`}>
                              Second Backup Liturgist (Christmas Eve)
                              {signupForm.role === 'backup2' && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Selected</span>
                              )}
                            </span>
                            {selectedService?.backup2 && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (Taken by {selectedService.backup2.name})
                              </span>
                            )}
                          </div>
                        </label>
                      )} */}
                      
                      {/* <label className={`flex items-center p-3 border-2 rounded-lg transition-all ${
                        signupForm.role === 'backup' 
                          ? 'bg-blue-50 border-blue-500 shadow-sm' 
                          : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300'
                      } ${selectedService?.backup ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="role"
                          value="backup"
                          checked={signupForm.role === 'backup'}
                          onChange={(e) => setSignupForm({ ...signupForm, role: 'backup' })}
                          disabled={!!selectedService?.backup}
                          className="mr-3 w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${signupForm.role === 'backup' ? 'text-blue-900' : 'text-gray-700'}`}>
                            Backup Liturgist
                            {signupForm.role === 'backup' && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Selected</span>
                            )}
                          </span>
                          {selectedService?.backup && (
                            <span className="ml-2 text-xs text-orange-600 font-medium">
                              (Taken by {selectedService.backup.name})
                            </span>
                          )}
                        </div>
                      </label> */}
                    </div>
                    
                    {/* Explanation text */}
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
                      <strong>Note:</strong> Positions update every 5 seconds. Grayed out options have already been filled. If your preferred role is unavailable, choose a different Sunday or select the available role.
                    </div>
                    
                    {/* Check if all positions are filled */}
                    {(() => {
                      const isChristmasEve = selectedService?.displayDate?.includes('Christmas Eve')
                      const allPositionsFilled = isChristmasEve 
                        ? selectedService?.liturgist && selectedService?.liturgist2 && selectedService?.backup && selectedService?.backup2
                        : selectedService?.liturgist && selectedService?.backup
                      
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        autoComplete="off"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly={signupForm.selectedPerson !== 'other'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123-456-7890"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedService?.displayDate?.includes('Christmas Eve') 
                      ? selectedService?.liturgist && selectedService?.liturgist2 && selectedService?.backup && selectedService?.backup2
                      : selectedService?.liturgist && selectedService?.backup)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      isSubmitting || (selectedService?.displayDate?.includes('Christmas Eve') 
                        ? selectedService?.liturgist && selectedService?.liturgist2 && selectedService?.backup && selectedService?.backup2
                        : selectedService?.liturgist && selectedService?.backup)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
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
                        role: 'liturgist'
                      })
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 dark:text-gray-300 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upcoming Services */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100 flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-6 lg:h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                Liturgist Services - {getMonthName(currentMonth, currentYear)}
              </h2>
              {lastUpdated && (
                <p className="text-[10px] sm:text-xs text-gray-500 ml-6 sm:ml-8 mt-0.5 sm:mt-1">
                  Live updates • Last refreshed: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleMonthChange('prev')} aria-label="Previous month"
                className="flex-1 sm:flex-initial px-3 py-2 sm:px-4 sm:py-3 md:px-3 md:py-1 rounded-md text-sm sm:text-base md:text-sm font-medium flex items-center justify-center min-h-[40px] sm:min-h-[44px] bg-blue-600 text-white hover:bg-blue-700"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-4 md:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Previous Month</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <button
                onClick={() => handleMonthChange('next')} aria-label="Next month"
                className="flex-1 sm:flex-initial px-3 py-2 sm:px-4 sm:py-3 md:px-3 md:py-1 rounded-md text-sm sm:text-base md:text-sm font-medium flex items-center justify-center min-h-[40px] sm:min-h-[44px] bg-blue-600 text-white hover:bg-blue-700"
              >
                <span className="hidden sm:inline">Next Month</span>
                <span className="sm:hidden">Next</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-4 md:h-4 ml-0.5 sm:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Empty State */}
          {!loading && services.length === 0 && (
            <div className="p-8 text-center bg-blue-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-400 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No Services Found</h3>
              <p className="text-gray-600 dark:text-gray-300">There are no services scheduled for {getMonthName(currentMonth, currentYear)}.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try navigating to a different month.</p>
            </div>
          )}
          
          <div className="space-y-2 sm:space-y-3">{services.map((service: Service) => {
              const isMainService = service.date === mainServiceDate
              
              return (
                <div 
                  key={service.id}
                  id={`service-${service.id}`}
                  className={`border rounded-lg p-3 transition-all ${
                    isMainService
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : hoveredService === service.id 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:border-gray-300'
                  }`}
                  onMouseEnter={() => setHoveredService(service.id)}
                  onMouseLeave={() => setHoveredService(null)}
                >
                  {/* Date and Special Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100 text-lg md:text-base">
                      {service.displayDate.replace(/, \d{4}/, '')}
                    </p>
                    {isMainService && (
                      <span className="text-sm md:text-xs font-bold text-purple-600 bg-purple-200 px-2 py-1 md:py-0.5 rounded">NEXT SERVICE</span>
                    )}
                    {service.notes && (() => {
                      // Check if it's Christmas Eve
                      // COMMENTED OUT - No longer need Christmas Eve liturgist
                      // if (service.notes.includes('Christmas Eve')) {
                      //   return (
                      //     <span className="text-sm md:text-xs font-semibold text-amber-900 bg-amber-200 px-2 py-1 md:py-0.5 rounded">
                      //       🕯️ CHRISTMAS EVE • Liturgist lights 5 candles
                      //     </span>
                      //   )
                      // }
                      
                      // Extract info from Advent notes
                      const weekMatch = service.notes.match(/Advent Week (\d)/)
                      const countMatch = service.notes.match(/\((\d) candles?\)/)
                      
                      if (weekMatch && countMatch) {
                        const week = weekMatch[1]
                        const count = countMatch[1]
                        const candleText = count === '1' ? '1 candle' : `${count} candles`
                        
                        return (
                          <span className="text-sm md:text-xs font-semibold text-amber-900 bg-amber-200 px-2 py-1 md:py-0.5 rounded">
                            🕯️ ADVENT WEEK {week} • Liturgist lights {candleText}
                          </span>
                        )
                      }
                      
                      return null
                    })()}
                  </div>
                  
                  {/* Service Rows - Different layout for Christmas Eve */}
                  {/* COMMENTED OUT - No longer need Christmas Eve special layout */}
                  {false && service.displayDate?.includes('Christmas Eve') ? (
                    <div className="space-y-3 text-base md:text-sm">
                      {/* Liturgist Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap text-base">Liturgist:</span>
                          {service.liturgist ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.liturgist.name}>
                                {service.liturgist.name}
                              </span>
                              {service.liturgist.email && (
                                <span className="text-green-700 text-xs truncate" title={service.liturgist.email}>
                                  {service.liturgist.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'liturgist')}
                              disabled={false}
                              className="px-5 py-2.5 md:px-3 md:py-1.5 text-base md:text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.liturgist && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.liturgist!.id, service.liturgist!.name, service.displayDate, 'Liturgist')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* First Backup Row */}
                      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap">Backup:</span>
                          {service.backup ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-blue-900 truncate" title={service.backup.name}>
                                {service.backup.name}
                              </span>
                              {service.backup.email && (
                                <span className="text-blue-700 text-xs truncate" title={service.backup.email}>
                                  {service.backup.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Sign Up</span>
                          )}
                        </div>
                        
                        {service.backup && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.backup!.id, service.backup!.name, service.displayDate, 'Backup')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div> */}
                      
                      {/* Second Liturgist Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap">Second Liturgist:</span>
                          {service.liturgist2 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.liturgist2.name}>
                                {service.liturgist2.name}
                              </span>
                              {service.liturgist2.email && (
                                <span className="text-green-700 text-xs truncate" title={service.liturgist2.email}>
                                  {service.liturgist2.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'liturgist2')}
                              disabled={false}
                              className="px-5 py-2.5 md:px-3 md:py-1.5 text-base md:text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.liturgist2 && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.liturgist2!.id, service.liturgist2!.name, service.displayDate, 'Second Liturgist')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Second Backup Row */}
                      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap">Backup:</span>
                          {service.backup2 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-blue-900 truncate" title={service.backup2.name}>
                                {service.backup2.name}
                              </span>
                              {service.backup2.email && (
                                <span className="text-blue-700 text-xs truncate" title={service.backup2.email}>
                                  {service.backup2.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'backup2')}
                              disabled={false}
                              className="px-5 py-2.5 md:px-3 md:py-1.5 text-base md:text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {service.backup2 && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.backup2!.id, service.backup2!.name, service.displayDate, 'Second Backup')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div> */}
                    </div>
                  ) : (
                    /* Regular Service Layout */
                    <div className="space-y-3 text-base md:text-sm">
                      {/* Liturgist Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap text-base">Liturgist:</span>
                          {service.liturgist ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-green-900 truncate" title={service.liturgist.name}>
                                {service.liturgist.name}
                              </span>
                              {service.liturgist.email && (
                                <span className="text-green-700 text-xs truncate" title={service.liturgist.email}>
                                  {service.liturgist.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'liturgist')}
                              disabled={false}
                              className="px-5 py-2.5 md:px-3 md:py-1.5 text-base md:text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {/* Cancel Button - Right Side (only if filled) */}
                        {service.liturgist && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.liturgist!.id, service.liturgist!.name, service.displayDate, 'Liturgist')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Backup Row */}
                      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-nowrap">Backup:</span>
                          {service.backup ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0 flex-1">
                              <span className="font-semibold text-blue-900 truncate" title={service.backup.name}>
                                {service.backup.name}
                              </span>
                              {service.backup.email && (
                                <span className="text-blue-700 text-xs truncate" title={service.backup.email}>
                                  {service.backup.email}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSignup(service.id, 'backup')}
                              disabled={false}
                              className="px-5 py-2.5 md:px-3 md:py-1.5 text-base md:text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                        
                        {service.backup && (
                          <div className="flex-shrink-0 sm:ml-2">
                            <button
                              onClick={() => handleCancelSignup(service.backup!.id, service.backup!.name, service.displayDate, 'Backup')}
                              disabled={false}
                              className="px-4 sm:px-3 py-2.5 sm:py-1.5 text-base md:text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div> */}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100 mb-4">What Does a Liturgist Do?</h3>
          <div className="prose prose-blue max-w-none text-sm">
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
              As a liturgist, you'll help lead our congregation in worship by:
            </p>
            <ul className="text-gray-600 dark:text-gray-400 dark:text-gray-400 space-y-1 mb-4 text-sm">
              <li>• Reading the Call to Worship</li>
              <li>• Leading the Responsive Reading</li>
              <li>• Reading the Scripture lesson(s)</li>
              <li>• Assisting with other liturgical elements as needed</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-sm">
              The bulletin and readings will be provided to you in advance. 
              If you have any questions, please contact the church office.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-8 text-sm">
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
    </PasswordGate>
  )
}
