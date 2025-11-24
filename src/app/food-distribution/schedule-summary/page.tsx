'use client'

import React, { useState, useEffect, useRef } from 'react'
import PasswordGate from '@/components/PasswordGate'

interface Volunteer {
  id: string
  name: string
  email: string
  phone?: string
}

interface Service {
  id: string
  date: string
  displayDate: string
  volunteer1: Volunteer | null
  volunteer2: Volunteer | null
  volunteer3: Volunteer | null
  volunteer4: Volunteer | null
}

export default function ScheduleSummary() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    try {
      const apiUrl = `/api/services?table=food&quarter=Q4-2025&t=${Date.now()}`
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      
      if (data.success && data.services) {
        setServices(data.services)
      }
    } catch (error) {
      console.error('Error fetching food distribution schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check if any service has volunteer3 or volunteer4
  const hasVolunteer3 = services.some(s => s.volunteer3)
  const hasVolunteer4 = services.some(s => s.volunteer4)

  const downloadAsPNG = async () => {
    if (!tableRef.current) return
    
    setIsExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      
      // Wait for fonts to load
      await document.fonts?.ready?.catch(() => {})
      
      // Wait a tick for any layout changes to settle
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get exact dimensions
      const rect = tableRef.current.getBoundingClientRect()
      
      const dataUrl = await toPng(tableRef.current, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        style: {
          transform: 'none',
          position: 'static',
          margin: '0',
        },
      })

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      // Generate filename with service type, months, and year
      const months = services.length > 0 
        ? Array.from(new Set(services.map(s => s.displayDate.split(' ')[0]))).join('-')
        : 'Schedule'
      const year = services.length > 0 
        ? services[0].displayDate.split(', ')[1] || new Date().getFullYear()
        : new Date().getFullYear()
      
      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Food-Distribution-${months}-${year}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export schedule as PNG. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
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

  return (
    <PasswordGate>
      <main className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Food Distribution Schedule - December 2025</h1>
              <p className="text-sm text-gray-600 mt-1">Last updated: {new Date().toLocaleString()}</p>
            </div>
            <button
              onClick={downloadAsPNG}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : '📥 Download PNG'}
            </button>
          </div>

          {/* Simple Spreadsheet Table */}
          <div ref={tableRef}>
            {/* Title - Only appears in PNG */}
            <div className="bg-white px-4 py-3 text-center border border-gray-400 border-b-0">
              <h2 className="text-lg font-bold text-gray-900">Food Distribution Signups | {services.length > 0 ? Array.from(new Set(services.map(s => s.displayDate.split(' ')[0]))).join(' ') + ' ' + (services[0].displayDate.split(', ')[1] || new Date().getFullYear()) : 'December 2025'}</h2>
              <p className="text-sm text-gray-700">Ukiah United Methodist Church</p>
            </div>
            <table className="w-auto border-collapse border border-gray-400 table-auto">
            <thead>
              <tr className="bg-gray-300 border-b-2 border-gray-600">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Date</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Volunteer 1</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Volunteer 2</th>
                {hasVolunteer3 && (
                  <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Volunteer 3</th>
                )}
                {hasVolunteer4 && (
                  <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Volunteer 4</th>
                )}
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 font-semibold whitespace-nowrap">
                    {service.displayDate}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                    {service.volunteer1 ? (
                      <div>
                        <div>{service.volunteer1.name}</div>
                        {service.volunteer1.phone && (
                          <div className="text-sm text-gray-600">{service.volunteer1.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Available</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                    {service.volunteer2 ? (
                      <div>
                        <div>{service.volunteer2.name}</div>
                        {service.volunteer2.phone && (
                          <div className="text-sm text-gray-600">{service.volunteer2.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Available</span>
                    )}
                  </td>
                  {hasVolunteer3 && (
                    <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                      {service.volunteer3 ? (
                        <div>
                          <div>{service.volunteer3.name}</div>
                          {service.volunteer3.phone && (
                            <div className="text-sm text-gray-600">{service.volunteer3.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Available</span>
                      )}
                    </td>
                  )}
                  {hasVolunteer4 && (
                    <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                      {service.volunteer4 ? (
                        <div>
                          <div>{service.volunteer4.name}</div>
                          {service.volunteer4.phone && (
                            <div className="text-sm text-gray-600">{service.volunteer4.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Available</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </PasswordGate>
  )
}