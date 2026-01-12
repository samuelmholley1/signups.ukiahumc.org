# ARCHIVED: Cross-Service Busy Volunteer Detection

## Status: NOT CURRENTLY NEEDED

**Reason for Archival:** Greeters are on Sundays, Food Distribution is on Saturdays. They never overlap, so cross-service conflict detection is unnecessary.

**Current Implementation:** Simple within-row detection (if someone is Greeter #1, gray them out for Greeter #2/3 on same row)

---

## What This Was

This was an enterprise-grade API endpoint that prevented volunteers from being double-booked across **multiple service types** (Greeters + Food Distribution) on the same date.

It was overengineered for the current use case but could be valuable if:
- You add more services that DO overlap (e.g., both on Sundays)
- You want to track volunteer workload across different days
- You want a "busy this week" indicator

---

## How It Worked

### API Endpoint: `/api/busy-volunteers?date=YYYY-MM-DD`

**Location:** `src/app/api/busy-volunteers/route.ts` (NOW DELETED)

**Functionality:**
1. Accepts a date parameter (YYYY-MM-DD)
2. Queries both Greeters and Food Distribution tables in Airtable
3. Filters by `{Service Date}='YYYY-MM-DD'`
4. Returns array of volunteers signed up for ANY service on that date
5. Groups by email (handles someone signed up for multiple roles)
6. Fail-open error handling (returns empty array on error, doesn't block signups)

**Response Format:**
```json
{
  "success": true,
  "date": "2026-01-19",
  "busyVolunteers": [
    {
      "email": "annie@example.com",
      "name": "Annie Gould",
      "services": ["Greeter", "Food Distribution"]
    }
  ]
}
```

---

## Full Code (Archived)

### API Endpoint (`src/app/api/busy-volunteers/route.ts`)

```typescript
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
```

### Client-Side Usage (from `src/app/greeters/page.tsx`)

```typescript
// State
const [busyVolunteers, setBusyVolunteers] = useState<{ email: string; name: string; services: string[] }[]>([])

// Fetch function
const fetchBusyVolunteers = async (date: string) => {
  try {
    const response = await fetch(`/api/busy-volunteers?date=${date}&t=${Date.now()}`, {
      cache: 'no-store'
    })
    const data = await response.json()
    
    if (data.success && data.busyVolunteers) {
      setBusyVolunteers(data.busyVolunteers)
    } else {
      // On error, don't block anyone
      setBusyVolunteers([])
    }
  } catch (error) {
    console.error('Error fetching busy volunteers:', error)
    // On error, don't block anyone
    setBusyVolunteers([])
  }
}

// Call when opening signup modal
onClick={() => {
  setSelectedDate(signup.date)
  setFormData({ ...formData, role: 'greeter1' })
  fetchBusyVolunteers(signup.date) // ← Fetches cross-service conflicts
}}

// Dropdown logic
<select>
  {Object.keys(GREETER_PRESET_PEOPLE).sort().map(name => {
    const personEmail = GREETER_PRESET_PEOPLE[name].email.toLowerCase().trim()
    const busyInfo = busyVolunteers.find(v => v.email === personEmail)
    const isBusy = !!busyInfo
    
    return (
      <option 
        key={name} 
        value={name}
        disabled={isBusy}
        style={isBusy ? { color: '#9ca3af', fontStyle: 'italic' } : {}}
      >
        {name}{isBusy ? ` (Already signed up: ${busyInfo.services.join(', ')})` : ''}
      </option>
    )
  })}
</select>
```

---

## Simplified Replacement (Current Implementation)

**What we actually need:** Within the same row/date, if someone is signed up for Greeter #1, gray them out for Greeter #2/3.

**Implementation:**
1. When opening signup modal, pass the entire `signup` row data
2. Extract emails from `signup.greeter1`, `signup.greeter2`, `signup.greeter3`
3. In dropdown, disable options if email matches any filled slot

**No API calls needed.** All data is already in the row.

```typescript
// Simplified approach (no API)
const currentSignup = signups.find(s => s.date === selectedDate)
const busyEmails = [
  currentSignup?.greeter1?.email,
  currentSignup?.greeter2?.email,
  currentSignup?.greeter3?.email
].filter(Boolean).map(e => e.toLowerCase().trim())

// Dropdown
{Object.keys(GREETER_PRESET_PEOPLE).sort().map(name => {
  const personEmail = GREETER_PRESET_PEOPLE[name].email.toLowerCase().trim()
  const isBusy = busyEmails.includes(personEmail)
  
  return (
    <option 
      disabled={isBusy}
      style={isBusy ? { color: '#9ca3af', fontStyle: 'italic' } : {}}
    >
      {name}{isBusy ? ' (Already signed up for this shift)' : ''}
    </option>
  )
})}
```

---

## When to Resurrect This Code

- **Adding Liturgist signups** (if they're also on Sundays and you want to prevent Greeter/Liturgist double-booking)
- **Adding Choir signups** (same reason)
- **Multi-service tracking** (e.g., "show me all volunteers signed up this week")
- **Workload balancing** (e.g., "don't let someone sign up for 3+ services in one month")

---

## Commit Where This Was Added

**Commit:** `e71a6cc` - "Add busy volunteer detection - gray out people already signed up for greeter or food distribution on same date"

**Files Changed:**
- Created: `src/app/api/busy-volunteers/route.ts`
- Modified: `src/app/greeters/page.tsx` (added fetchBusyVolunteers, busyVolunteers state, API calls)

---

## Notes

- The API uses **email matching** (not name matching) for reliability
- It's **fail-open** (errors return empty array, don't block signups)
- It groups by email to handle edge cases (someone signed up twice on same day)
- Uses Airtable `filterByFormula` for efficient querying
- Minimal data exposure (only returns email/name/services, not full records)

This was good enterprise-grade code. Just not needed for the current use case. 🎯
