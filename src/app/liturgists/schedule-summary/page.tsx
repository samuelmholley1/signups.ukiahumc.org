'use client'

import React, { useState, useEffect, useRef } from 'react'
import PasswordGate from '@/components/PasswordGate'
import { toPng } from 'html-to-image'

interface Service {
  id: string
  date: string
  displayDate: string
  liturgist: any | null
  liturgist2?: any | null
  backup: any | null
  backup2?: any | null
}

export default function ScheduleSummary() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuarter, setCurrentQuarter] = useState('Q4-2025')
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['all'])
  const [showBackupColumn, setShowBackupColumn] = useState(true)
  const tableRef = useRef<HTMLDivElement>(null)

  console.log('🔍 SCHEDULE SUMMARY DEBUG: Component initialized with quarter:', currentQuarter)

  // Force cache busting
  useEffect(() => {
    console.log('🔍 SCHEDULE SUMMARY DEBUG: useEffect triggered for cache busting')
    // Clear any cached version
    if (typeof window !== 'undefined') {
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Running in browser environment')

      // Check if service worker is controlling this page
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Service worker is active and controlling this page')
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Service worker state:', navigator.serviceWorker.controller.state)
      } else {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: No active service worker controlling this page')
      }

      console.log('Schedule Summary Page Loaded - Version 1.1.0')
      // Force reload if this is a cached version
      const lastUpdate = localStorage.getItem('schedule-summary-version')
      const currentVersion = 'v1.1.0'
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Stored version:', lastUpdate, 'Current version:', currentVersion)
      if (lastUpdate !== currentVersion) {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Version mismatch - forcing reload')
        console.log('Updating version from', lastUpdate, 'to', currentVersion)
        localStorage.setItem('schedule-summary-version', currentVersion)
        window.location.reload()
        return
      } else {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Version matches - no reload needed')
      }
    } else {
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Running on server - skipping cache busting')
    }
    console.log('🔍 SCHEDULE SUMMARY DEBUG: Cache busting complete, calling fetchServices')
    fetchServices()
  }, [currentQuarter])

  const fetchServices = async () => {
    console.log('🔍 SCHEDULE SUMMARY DEBUG: fetchServices called for quarter:', currentQuarter)
    setLoading(true)
    try {
      const apiUrl = `/api/services?quarter=${currentQuarter}`
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Fetching from URL:', apiUrl)
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      console.log('🔍 SCHEDULE SUMMARY DEBUG: API response status:', response.status)
      const data = await response.json()
      console.log('🔍 SCHEDULE SUMMARY DEBUG: API response data:', data)
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Debug info:', data.debug)
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Full services data:')
      data.services?.forEach((service: any, index: number) => {
        if (service.displayDate?.includes('Christmas Eve')) {
          console.log(`🔍 SCHEDULE SUMMARY DEBUG: Christmas Eve service #${index}:`, {
            date: service.date,
            displayDate: service.displayDate,
            liturgist: service.liturgist,
            liturgist2: service.liturgist2,
            backup: service.backup
          })
        }
      })
      if (data.success) {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Setting services data:', data.services.length, 'services')
        setServices(data.services)
      } else {
        console.error('🔍 SCHEDULE SUMMARY DEBUG: API returned success=false:', data)
      }
    } catch (error) {
      console.error('🔍 SCHEDULE SUMMARY DEBUG: Error fetching services:', error)
    } finally {
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Setting loading to false')
      setLoading(false)
    }
  }

  const clearCacheAndReload = () => {
    console.log('🔍 SCHEDULE SUMMARY DEBUG: Manual cache clear requested')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Found', registrations.length, 'service worker registrations')
        registrations.forEach((registration, index) => {
          console.log('🔍 SCHEDULE SUMMARY DEBUG: Unregistering service worker', index + 1)
          registration.unregister()
        })
        // Clear localStorage version
        localStorage.removeItem('schedule-summary-version')
        console.log('🔍 SCHEDULE SUMMARY DEBUG: Cleared localStorage version, reloading page')
        window.location.reload()
      })
    } else {
      console.log('🔍 SCHEDULE SUMMARY DEBUG: Service worker not supported, just reloading')
      localStorage.removeItem('schedule-summary-version')
      window.location.reload()
    }
  }

  const handleQuarterChange = (direction: 'prev' | 'next') => {
    const quarters = ['Q3-2025', 'Q4-2025', 'Q1-2026']
    const currentIndex = quarters.indexOf(currentQuarter)
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentQuarter(quarters[currentIndex - 1])
    } else if (direction === 'next' && currentIndex < quarters.length - 1) {
      setCurrentQuarter(quarters[currentIndex + 1])
    }
  }

  const downloadAsPNG = async () => {
    if (!tableRef.current) return
    
    try {
      const dataUrl = await toPng(tableRef.current, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
      
      // Generate filename with service type, months, and year
      const displayedServices = selectedMonths.includes('all') 
        ? services 
        : services.filter(service => {
            const monthName = service.displayDate.split(' ')[0]
            return selectedMonths.includes(monthName)
          })
      
      const months = displayedServices.length > 0
        ? Array.from(new Set(displayedServices.map(s => s.displayDate.split(' ')[0]))).join('-')
        : 'Schedule'
      const year = displayedServices.length > 0
        ? displayedServices[0].displayDate.split(', ')[1]?.split(' ')[0] || new Date().getFullYear()
        : new Date().getFullYear()
      
      const link = document.createElement('a')
      link.download = `Liturgist-Signups-${months}-${year}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  if (loading) {
    console.log('🔍 SCHEDULE SUMMARY DEBUG: Rendering loading state')
    return (
      <PasswordGate>
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </PasswordGate>
    )
  }

  console.log('🔍 SCHEDULE SUMMARY DEBUG: Rendering main component')
  console.log('🔍 SCHEDULE SUMMARY DEBUG: Services array length:', services.length)
  console.log('🔍 SCHEDULE SUMMARY DEBUG: Services data:', services)
  console.log('🔍 SCHEDULE SUMMARY DEBUG: Rendering table rows for', services.length, 'services')

  // Filter services by selected months
  const filteredServices = selectedMonths.includes('all') 
    ? services 
    : services.filter(service => {
        const monthName = service.displayDate.split(' ')[0] // Get first word (month)
        return selectedMonths.includes(monthName)
      })

  console.log('🔍 SCHEDULE SUMMARY DEBUG: Filtered services:', filteredServices.length, 'services for months:', selectedMonths)

  return (
    <PasswordGate>
      <main className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Liturgist Schedule - {currentQuarter} (Simple View)</h1>
              <p className="text-sm text-gray-600 mt-1">Version 1.1.0 - Last updated: {new Date().toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadAsPNG}
                className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                title="Download schedule as PNG"
              >
                📥 Download PNG
              </button>
              <button
                onClick={clearCacheAndReload}
                className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                title="Clear cache and reload"
              >
                🔄 Clear Cache
              </button>
              <button
                onClick={() => handleQuarterChange('prev')}
                disabled={currentQuarter === 'Q3-2025'}
                className={`px-3 py-1 text-sm rounded ${
                  currentQuarter === 'Q3-2025'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                ← Prev
              </button>
              <button
                onClick={() => handleQuarterChange('next')}
                disabled={currentQuarter === 'Q1-2026'}
                className={`px-3 py-1 text-sm rounded ${
                  currentQuarter === 'Q1-2026'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Month Filter */}
          <div className="mb-4 flex items-center gap-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by month:</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMonths(['all'])
                    } else {
                      setSelectedMonths([])
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">All Months</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes('October')}
                  disabled={selectedMonths.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMonths(prev => [...prev.filter(m => m !== 'all'), 'October'])
                    } else {
                      setSelectedMonths(prev => prev.filter(m => m !== 'October'))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">October</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes('November')}
                  disabled={selectedMonths.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMonths(prev => [...prev.filter(m => m !== 'all'), 'November'])
                    } else {
                      setSelectedMonths(prev => prev.filter(m => m !== 'November'))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">November</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes('December')}
                  disabled={selectedMonths.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMonths(prev => [...prev.filter(m => m !== 'all'), 'December'])
                    } else {
                      setSelectedMonths(prev => prev.filter(m => m !== 'December'))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">December</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showBackupColumn}
                  onChange={(e) => setShowBackupColumn(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Backup Column</span>
              </label>
            </div>
          </div>

          {/* Simple Spreadsheet Table */}
          <div ref={tableRef} className="w-fit">
            {/* Title - Only appears in PNG */}
            <div className="bg-white px-4 py-3 text-center border border-gray-400 border-b-0">
              <h2 className="text-lg font-bold text-gray-900">Liturgist Signups | {filteredServices.length > 0 ? Array.from(new Set(filteredServices.map(s => s.displayDate.split(' ')[0]))).join(' ') + ' ' + (filteredServices[0].displayDate.split(', ')[1]?.split(' ')[0] || new Date().getFullYear()) : currentQuarter}</h2>
              <p className="text-sm text-gray-700">Ukiah United Methodist Church</p>
            </div>
          <table className="w-full border-collapse border border-gray-400 table-auto">
            <thead>
              <tr className="bg-gray-300 border-b-2 border-gray-600">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Service</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Liturgist</th>
                {showBackupColumn && (
                  <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Backup</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let rowIndex = 0
                return filteredServices.map((service) => {
                  const isChristmasEve = service.displayDate?.includes('Christmas Eve')
                  console.log(`🔍 SCHEDULE SUMMARY DEBUG: Processing service: displayDate="${service.displayDate}", isChristmasEve=${isChristmasEve}, hasLiturgist=${!!service.liturgist}, hasLiturgist2=${!!service.liturgist2}`)
                  
                  // For Christmas Eve, always show two separate liturgist lines
                  if (isChristmasEve) {
                    console.log('🔍 SCHEDULE SUMMARY DEBUG: Rendering Christmas Eve with 2 liturgists')
                    return (
                      <React.Fragment key={service.id}>
                        {/* First liturgist row */}
                        <tr className={rowIndex++ % 2 === 0 ? 'bg-white' : 'bg-gray-200'}>
                          <td className="border border-gray-400 px-3 py-1 text-gray-900 font-semibold whitespace-nowrap">
                            Christmas Eve Liturgist #1
                          </td>
                          <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                            {service.liturgist ? service.liturgist.name : ''}
                          </td>
                          {showBackupColumn && (
                            <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                              {service.backup ? service.backup.name : ''}
                            </td>
                          )}
                        </tr>
                        {/* Second liturgist row */}
                        <tr className={rowIndex++ % 2 === 0 ? 'bg-white' : 'bg-gray-200'}>
                          <td className="border border-gray-400 px-3 py-1 text-gray-900 font-semibold whitespace-nowrap">
                            Christmas Eve Liturgist #2
                          </td>
                          <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                            {service.liturgist2 ? service.liturgist2.name : ''}
                          </td>
                          {showBackupColumn && (
                            <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                              {service.backup2 ? service.backup2.name : ''}
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    )
                  }
                  
                  // For regular services
                  const dateLabel = service.displayDate.replace(/, \d{4}$/, '') + ' Liturgist'
                  console.log(`🔍 SCHEDULE SUMMARY DEBUG: Rendering regular service: dateLabel="${dateLabel}"`)
                  return (
                    <tr key={service.id} className={rowIndex++ % 2 === 0 ? 'bg-white' : 'bg-gray-200'}>
                      <td className="border border-gray-400 px-3 py-1 text-gray-900 font-semibold whitespace-nowrap">
                        {dateLabel}
                      </td>
                      <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                        {service.liturgist ? service.liturgist.name : ''}
                      </td>
                      {showBackupColumn && (
                        <td className="border border-gray-400 px-3 py-1 text-gray-900 whitespace-nowrap">
                          {service.backup ? service.backup.name : ''}
                        </td>
                      )}
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </PasswordGate>
  )
}