import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting (resets on server restart)
// For production with multiple servers, use Redis or external service
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 20 // 20 requests per minute per IP

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Get client IP address
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') ||
             'unknown'

  const now = Date.now()
  const rateLimitKey = `${ip}:${request.nextUrl.pathname}`

  // Get or create rate limit entry
  let rateLimitEntry = rateLimitMap.get(rateLimitKey)

  // Reset if window has passed
  if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
    rateLimitEntry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    }
    rateLimitMap.set(rateLimitKey, rateLimitEntry)
  }

  // Increment request count
  rateLimitEntry.count++

  // Check if rate limit exceeded
  if (rateLimitEntry.count > MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        retryAfter: Math.ceil((rateLimitEntry.resetTime - now) / 1000) 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitEntry.resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitEntry.count).toString(),
          'X-RateLimit-Reset': new Date(rateLimitEntry.resetTime).toISOString()
        }
      }
    )
  }

  // Add rate limit headers to response
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString())
  response.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitEntry.count).toString())
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitEntry.resetTime).toISOString())

  return response
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitMap.entries())
  entries.forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  })
}, 5 * 60 * 1000)

// Configure which routes the middleware runs on
export const config = {
  matcher: '/api/:path*'
}
