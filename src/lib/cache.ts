/**
 * Server-side in-memory cache for Airtable data
 * This cache stores service data and is invalidated when webhooks arrive
 * Updated: 2025-12-01
 */

interface CacheEntry {
  data: any
  timestamp: number
  quarter: string
}

class ServiceCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL = 60 * 60 * 1000 // 1 hour TTL as fallback

  /**
   * Get cached data for a specific quarter
   */
  get(quarter: string): any | null {
    const entry = this.cache.get(quarter)
    
    if (!entry) {
      console.log(`[Cache] MISS for quarter: ${quarter}`)
      return null
    }

    // Check if cache entry is still valid (TTL)
    const isExpired = Date.now() - entry.timestamp > this.TTL
    if (isExpired) {
      console.log(`[Cache] EXPIRED for quarter: ${quarter}`)
      this.cache.delete(quarter)
      return null
    }

    console.log(`[Cache] HIT for quarter: ${quarter}`)
    return entry.data
  }

  /**
   * Set cache data for a specific quarter
   */
  set(quarter: string, data: any): void {
    console.log(`[Cache] SET for quarter: ${quarter}`)
    this.cache.set(quarter, {
      data,
      timestamp: Date.now(),
      quarter
    })
  }

  /**
   * Invalidate cache for a specific quarter
   */
  invalidate(quarter?: string): void {
    if (quarter) {
      console.log(`[Cache] INVALIDATE for quarter: ${quarter}`)
      this.cache.delete(quarter)
    } else {
      console.log(`[Cache] INVALIDATE ALL`)
      this.cache.clear()
    }
  }

  /**
   * Get all cached quarters
   */
  getAllQuarters(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Check if cache has data for a quarter
   */
  has(quarter: string): boolean {
    return this.cache.has(quarter) && !this.isExpired(quarter)
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(quarter: string): boolean {
    const entry = this.cache.get(quarter)
    if (!entry) return true
    return Date.now() - entry.timestamp > this.TTL
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      size: this.cache.size,
      quarters: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([quarter, entry]) => ({
        quarter,
        timestamp: new Date(entry.timestamp).toISOString(),
        age: Math.floor((Date.now() - entry.timestamp) / 1000) + 's'
      }))
    }
  }
}

// Export a singleton instance
export const serviceCache = new ServiceCache()
