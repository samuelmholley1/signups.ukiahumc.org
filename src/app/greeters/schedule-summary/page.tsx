'use client'

import React, { useState, useEffect, useRef } from 'react'
import PasswordGate from '@/components/PasswordGate'

interface Greeter {
  id: string
  name: string
  email: string
  phone?: string
}

interface Service {
  id: string
  date: string
  displayDate: string
  greeter1: Greeter | null
  greeter2: Greeter | null
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
      const apiUrl = `/api/services?table=greeters&quarter=Q1-2026&t=${Date.now()}`
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
      console.error('Error fetching greeter schedule:', error)
    } finally {
      setLoading(false)
    }
  }

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
      a.download = `Greeters-${months}-${year}.png`
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
              <h1 className="text-2xl font-bold text-gray-900">Greeter Schedule - Q1 2026</h1>
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
          <div ref={tableRef} className="w-fit">
            {/* Title - Only appears in PNG */}
            <div className="bg-white px-4 py-3 text-center border border-gray-400 border-b-0">
              <h2 className="text-lg font-bold text-gray-900">Greeter Signups | {services.length > 0 ? Array.from(new Set(services.map(s => s.displayDate.split(' ')[0]))).join(' ') + ' ' + (services[0].displayDate.split(', ')[1] || new Date().getFullYear()) : 'Q1 2026'}</h2>
              <p className="text-sm text-gray-700">Ukiah United Methodist Church</p>
            </div>
            <table className="w-full border-collapse border border-gray-400 table-auto">
            <thead>
              <tr className="bg-gray-300 border-b-2 border-gray-600">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Date</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Greeter 1</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-gray-900 whitespace-nowrap bg-gray-300">Greeter 2</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 font-semibold whitespace-nowrap">
                    {service.displayDate}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                    {service.greeter1 ? (
                      <div>
                        <div>{service.greeter1.name}</div>
                        {service.greeter1.phone && (
                          <div className="text-sm text-gray-600">{service.greeter1.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Available</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-gray-900 whitespace-nowrap">
                    {service.greeter2 ? (
                      <div>
                        <div>{service.greeter2.name}</div>
                        {service.greeter2.phone && (
                          <div className="text-sm text-gray-600">{service.greeter2.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Available</span>
                    )}
                  </td>
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
