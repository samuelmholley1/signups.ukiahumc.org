import { NextRequest, NextResponse } from 'next/server'
import { getSignups } from '@/lib/airtable'
import { serviceCache } from '@/lib/cache'

// Disable all caching for this API route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Get quarter and table from query params
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') || 'Q4-2025' // Default to Q4 2025
    const table = searchParams.get('table') || 'liturgists' // Default to liturgists
    
    // Create cache key with both quarter and table
    const cacheKey = `${table}-${quarter}`
    
    // Check cache first
    const cachedData = serviceCache.get(cacheKey)
    if (cachedData) {
      console.log(`[API] Returning cached data for ${table} - ${quarter}`)
      return NextResponse.json(
        cachedData,
        { 
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Cache': 'HIT'
          }
        }
      )
    }
    
    console.log(`[API] Cache miss for ${table} - ${quarter}, fetching from Airtable`)
    
    // Determine which table to use
    const tableName = table === 'food' ? 'Food Distribution' : 'Liturgists'
    
    // Generate Sundays for the requested quarter (or Saturdays for food distribution)
    const allDates = table === 'food' 
      ? generateSaturdaysForDecember(quarter) 
      : generateSundaysForQuarter(quarter)
    
    // Get all signups from Airtable
    const signups = await getSignups(tableName)
    console.log('🔍 API DEBUG: Fetched', signups.length, 'signups from Airtable')

    // Create a map of services starting with all dates
    const serviceMap = new Map()
    
    // Add all dates first (past and upcoming)
    allDates.forEach(service => {
      serviceMap.set(service.date, service)
    })

    // Merge in signups from Airtable (only for dates within this quarter)
    signups.forEach((signup: any) => {
      const serviceDate = signup.serviceDate
      console.log(`🔍 API DEBUG: Processing signup: date="${serviceDate}", role="${signup.role}", name="${signup.name}"`)
      
      // Skip signups that are not in this quarter's date range
      let matchingService = serviceMap.get(serviceDate)
      
      // If no direct match, try to find by displayDate (for legacy signups that stored displayDate)
      if (!matchingService) {
        const services = Array.from(serviceMap.values())
        matchingService = services.find(s => s.displayDate === serviceDate)
        if (matchingService) {
          console.log(`🔍 API DEBUG: Found match by displayDate: ${serviceDate} -> ${matchingService.date}`)
        }
      }
      
      if (!matchingService) {
        console.log(`🔍 API DEBUG: Skipping signup - date ${serviceDate} not in quarter range`)
        // Don't add services from outside the requested quarter
        return
      }

      const service = matchingService
      console.log(`🔍 API DEBUG: Found matching service for date ${serviceDate}`)

      // Normalize role for comparison (handle both capitalized and lowercase variants)
      const normalizedRole = signup.role?.toLowerCase().trim()
      console.log(`🔍 API DEBUG: Normalized role: "${normalizedRole}"`)

      // Organize by role - check for all variants (old, new, and lowercase)
      if (signup.role === 'Liturgist' || normalizedRole === 'liturgist') {
        console.log(`🔍 API DEBUG: Assigning as liturgist: ${signup.name}`)
        service.liturgist = {
          id: signup.id,
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          preferredContact: 'email' as const
        }
      } else if (signup.role === 'Second Liturgist' || signup.role === 'liturgist2' || normalizedRole === 'liturgist2' || normalizedRole === 'second liturgist') {
        console.log(`🔍 API DEBUG: Assigning as liturgist2: ${signup.name}`)
        service.liturgist2 = {
          id: signup.id,
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          preferredContact: 'email' as const
        }
      } else if (signup.role === 'Backup Liturgist' || signup.role === 'Backup' || normalizedRole === 'backup' || normalizedRole === 'backup liturgist') {
        console.log(`🔍 API DEBUG: Assigning as backup: ${signup.name}`)
        service.backup = {
          id: signup.id,
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          preferredContact: 'email' as const
        }
      } else if (signup.role === 'Second Backup' || signup.role === 'backup2' || normalizedRole === 'backup2' || normalizedRole === 'second backup') {
        console.log(`🔍 API DEBUG: Assigning as backup2: ${signup.name}`)
        service.backup2 = {
          id: signup.id,
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          preferredContact: 'email' as const
        }
      } else if (signup.role === 'Attendance') {
        console.log(`🔍 API DEBUG: Adding attendance: ${signup.name}`)
        service.attendance.push({
          name: signup.name,
          status: signup.attendanceStatus?.toLowerCase() || 'yes'
        })
      } else {
        console.log(`🔍 API DEBUG: Unknown role "${signup.role}" - not assigning`)
      }
    })

    // Convert map to array and sort by date
    const services = Array.from(serviceMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    )

    // Debug: Log Christmas Eve service details
    const christmasEveService = services.find(s => s.displayDate?.includes('Christmas Eve'))
    if (christmasEveService) {
      console.log('🔍 API DEBUG: Christmas Eve service final state:', {
        date: christmasEveService.date,
        displayDate: christmasEveService.displayDate,
        hasLiturgist: !!christmasEveService.liturgist,
        hasLiturgist2: !!christmasEveService.liturgist2,
        liturgist: christmasEveService.liturgist?.name,
        liturgist2: christmasEveService.liturgist2?.name
      })
    }

    const responseData = { 
      success: true, 
      services,
      debug: {
        totalSignups: signups.length,
        signups: signups.map(s => ({
          serviceDate: s.serviceDate,
          role: s.role,
          name: s.name
        }))
      }
    }

    // Store in cache
    serviceCache.set(cacheKey, responseData)
    console.log(`[API] Cached data for ${table} - ${quarter}`)

    return NextResponse.json(
      responseData,
      { 
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache': 'MISS'
        }
      }
    )
  } catch (error) {
    console.error('API Error:', error)
    // Return all Sundays even on error
    return NextResponse.json(
      { 
        success: true, 
        services: generateSundaysForQuarter('Q4-2025') 
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
  }
}

// Calculate the 4 Advent Sundays for a given year
// Advent starts on the 4th Sunday before Christmas (Dec 25)
function calculateAdventSundays(year: number): string[] {
  // Christmas is always December 25
  const christmas = new Date(year, 11, 25) // Month is 0-indexed, so 11 = December
  
  // Find what day of the week Christmas falls on (0 = Sunday, 6 = Saturday)
  const christmasDay = christmas.getDay()
  
  // Calculate how many days back to the previous Sunday from Christmas
  // If Christmas is Sunday (0), we go back 0 days
  // If Christmas is Monday (1), we go back 1 day to Sunday
  // etc.
  const daysToSunday = christmasDay === 0 ? 7 : christmasDay
  
  // Find the Sunday before (or on) Christmas
  const sundayBeforeChristmas = new Date(year, 11, 25 - daysToSunday)
  
  // Count back 4 Sundays (including the one we just found)
  // This gives us the 4 Advent Sundays
  const adventSundays: string[] = []
  
  for (let i = 3; i >= 0; i--) {
    const adventSunday = new Date(sundayBeforeChristmas)
    adventSunday.setDate(sundayBeforeChristmas.getDate() - (i * 7))
    adventSundays.push(adventSunday.toISOString().split('T')[0])
  }
  
  return adventSundays
}

// Generate Sundays for a specific quarter (e.g., "Q4-2025" or "Q1-2026")
function generateSundaysForQuarter(quarterString: string) {
  const sundays = []
  const [quarter, year] = quarterString.split('-')
  const yearNum = parseInt(year)
  
  // Determine month range for quarter
  let startMonth: number, endMonth: number
  if (quarter === 'Q1') {
    startMonth = 0  // January
    endMonth = 2    // March
  } else if (quarter === 'Q2') {
    startMonth = 3  // April
    endMonth = 5    // June
  } else if (quarter === 'Q3') {
    startMonth = 6  // July
    endMonth = 8    // September
  } else { // Q4
    startMonth = 9  // October
    endMonth = 11   // December
  }
  
  // TIMEZONE NOTE: Date generation uses local server timezone (PDT/PST for Ukiah, CA)
  // All users are in same timezone, so this works correctly for the congregation.
  // If deploying for multi-timezone use, dates should be normalized to UTC.
  // Start from first day of first month in quarter
  let currentDate = new Date(yearNum, startMonth, 1)
  
  // Find first Sunday
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // End of last month in quarter
  const endDate = new Date(yearNum, endMonth + 1, 0) // Last day of endMonth
  
  // Generate all Sundays in the quarter
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    const displayDate = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    // Dynamic Advent date calculation - works for any year
    // Advent starts on the 4th Sunday before Christmas (Dec 25)
    let notes: string | undefined = undefined
    const adventDates = calculateAdventSundays(yearNum)
    
    // Advent candles are lit cumulatively each week
    if (dateString === adventDates[0]) {
      notes = 'Advent Week 1 — Light the Hope candle (1 candle)'
    } else if (dateString === adventDates[1]) {
      notes = 'Advent Week 2 — Light the Hope and Peace candles (2 candles)'
    } else if (dateString === adventDates[2]) {
      notes = 'Advent Week 3 — Light the Hope, Peace, and Joy candles (3 candles)'
    } else if (dateString === adventDates[3]) {
      notes = 'Advent Week 4 — Light the Hope, Peace, Joy, and Love candles (4 candles)'
    }

    sundays.push({
      id: dateString,
      date: dateString,
      displayDate,
      liturgist: null,
      liturgist2: null,
      backup: null,
      backup2: null,
      attendance: [],
      notes
    })
    
    currentDate.setDate(currentDate.getDate() + 7) // Next Sunday
  }
  
  // Add Christmas Eve service if it falls in this quarter
  const christmasEve = new Date(yearNum, 11, 24) // December 24
  if (christmasEve.getMonth() >= startMonth && christmasEve.getMonth() <= endMonth) {
    const christmasEveDate = christmasEve.toISOString().split('T')[0]
    const christmasEveDisplay = christmasEve.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    sundays.push({
      id: christmasEveDate,
      date: christmasEveDate,
      displayDate: christmasEveDisplay + ' (Christmas Eve)',
      liturgist: null,
      liturgist2: null,
      backup: null,
      backup2: null,
      attendance: [],
      notes: 'Christmas Eve Service — Light the Christ Candle (white center candle) + all 4 Advent candles'
    })
  }
  
  // Sort all services by date (Christmas Eve might not be chronological)
  sundays.sort((a, b) => a.date.localeCompare(b.date))
  
  return sundays
}

// DEPRECATED - Keep for backward compatibility
function generateRecentAndUpcomingSundays() {
  const sundays = []
  const today = new Date()
  const currentYear = today.getFullYear()
  const endOfYear = new Date(currentYear, 11, 31) // December 31
  
  // Find the most recent Sunday (today if Sunday, otherwise go back)
  let currentDate = new Date(today)
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1)
  }
  
  // Go back 4 more Sundays to include previous 4 weeks
  currentDate.setDate(currentDate.getDate() - 28)
  
  // Generate all Sundays from 2 weeks ago through end of year
  while (currentDate <= endOfYear) {
    const dateString = currentDate.toISOString().split('T')[0]
    const displayDate = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    sundays.push({
      id: dateString,
      date: dateString,
      displayDate,
      liturgist: null,
      backup: null,
      attendance: [],
      notes: undefined
    })
    
    currentDate.setDate(currentDate.getDate() + 7) // Next Sunday
  }
  
  return sundays
}

// DEPRECATED: Keep for backward compatibility but not used
function generateUpcomingSundays() {
  const sundays = []
  const today = new Date()
  let currentDate = new Date(today)
  
  // Find next Sunday
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Generate 8 Sundays
  for (let i = 0; i < 8; i++) {
    const dateString = currentDate.toISOString().split('T')[0]
    const displayDate = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    sundays.push({
      id: dateString,
      date: dateString,
      displayDate,
      liturgist: null,
      backup: null,
      attendance: [],
      notes: undefined
    })
    
    currentDate.setDate(currentDate.getDate() + 7) // Next Sunday
  }
  
  return sundays
}

// Generate December 2025 Saturdays for food distribution
function generateSaturdaysForDecember(quarterString: string) {
  const saturdays: any[] = []
  
  // Only support December 2025 for now
  if (!quarterString.includes('2025')) {
    return []
  }
  
  // December 2025 Saturdays
  const dates = [
    { date: '2025-12-06', display: 'December 6, 2025' },
    { date: '2025-12-13', display: 'December 13, 2025' },
    { date: '2025-12-20', display: 'December 20, 2025' },
    { date: '2025-12-27', display: 'December 27, 2025' },
  ]
  
  dates.forEach(({ date, display }) => {
    saturdays.push({
      id: date,
      date,
      displayDate: display,
      volunteer1: null,
      volunteer2: null,
      attendance: [],
      notes: undefined
    })
  })
  
  return saturdays
}
