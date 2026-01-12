import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_PAT = process.env.AIRTABLE_PAT
const BASE_ID = 'appmnQvqSb8lcHKz8'

/**
 * GET /api/busy-volunteers?date=YYYY-MM-DD
 * Returns list of volunteers already signed up for ANY service on the given date
 * Used to prevent double-booking across greeters and food distribution
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    
    const busyVolunteers: { email: string; name: string; service: string }[] = []
    
    // Fetch from Greeters table
    try {
      const greetersResponse = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/Greeters?filterByFormula={Service Date}='${date}'`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (greetersResponse.ok) {
        const greetersData = await greetersResponse.json()
        greetersData.records?.forEach((record: any) => {
          const email = record.fields['Email']?.toLowerCase().trim()
          const name = record.fields['Name']
          if (email && name) {
            busyVolunteers.push({ email, name, service: 'Greeter' })
          }
        })
      }
    } catch (error) {
      console.error('Error fetching greeters:', error)
      // Continue even if one table fails
    }
    
    // Fetch from Food Distribution table
    try {
      const foodResponse = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/Food Distribution?filterByFormula={Service Date}='${date}'`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (foodResponse.ok) {
        const foodData = await foodResponse.json()
        foodData.records?.forEach((record: any) => {
          const email = record.fields['Email']?.toLowerCase().trim()
          const name = record.fields['Name']
          if (email && name) {
            busyVolunteers.push({ email, name, service: 'Food Distribution' })
          }
        })
      }
    } catch (error) {
      console.error('Error fetching food distribution:', error)
      // Continue even if one table fails
    }
    
    // Return unique emails with their services
    // Group by email to handle multiple roles on same day
    const emailMap = new Map<string, { name: string; services: string[] }>()
    
    busyVolunteers.forEach(({ email, name, service }) => {
      if (emailMap.has(email)) {
        const existing = emailMap.get(email)!
        if (!existing.services.includes(service)) {
          existing.services.push(service)
        }
      } else {
        emailMap.set(email, { name, services: [service] })
      }
    })
    
    const result = Array.from(emailMap.entries()).map(([email, data]) => ({
      email,
      name: data.name,
      services: data.services
    }))
    
    return NextResponse.json({ 
      success: true,
      date,
      busyVolunteers: result
    })
    
  } catch (error) {
    console.error('Error in busy-volunteers API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch busy volunteers',
      busyVolunteers: [] // Return empty array on error to avoid blocking
    }, { status: 500 })
  }
}
