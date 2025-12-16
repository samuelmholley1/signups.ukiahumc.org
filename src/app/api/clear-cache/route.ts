import { NextRequest, NextResponse } from 'next/server'
import { serviceCache } from '@/lib/cache'

/**
 * Clear cache endpoint - useful when making manual changes in Airtable
 * Usage: Visit /api/clear-cache in your browser or make a GET request
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter')
    
    // Clear cache
    if (quarter) {
      serviceCache.invalidate(quarter)
      console.log(`[Cache Clear API] Cleared cache for quarter: ${quarter}`)
      return NextResponse.json({ 
        success: true, 
        message: `Cache cleared for quarter: ${quarter}`,
        timestamp: new Date().toISOString()
      })
    } else {
      serviceCache.invalidate()
      console.log(`[Cache Clear API] Cleared all cache`)
      return NextResponse.json({ 
        success: true, 
        message: 'All cache cleared',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[Cache Clear API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: String(error)
      },
      { status: 500 }
    )
  }
}
