# Subdomain to Path-Based Navigation Migration Guide

**Author:** Migration completed November 2025  
**Audience:** Future developers migrating multiple subdomains to a unified domain with path-based routing  
**Use Case:** Transitioning from `service1.domain.com`, `service2.domain.com`, `service3.domain.com` → `domain.com/service1`, `domain.com/service2`, `domain.com/service3`

---

## Executive Summary

Successfully migrated from subdomain-based architecture (`liturgists.ukiahumc.org`) to path-based navigation (`signups.ukiahumc.org/liturgists`, `signups.ukiahumc.org/food-distribution`). This guide documents the complete process, all issues encountered, and solutions implemented for future multi-subdomain consolidation projects.

**Key Insight:** Vercel treats subdomains as separate deployments. Migration requires permanent redirects, not rewrites, to properly route legacy subdomain traffic.

---

## Table of Contents

1. [Initial Architecture](#initial-architecture)
2. [Target Architecture](#target-architecture)
3. [Migration Strategy](#migration-strategy)
4. [Critical Issues & Solutions](#critical-issues--solutions)
5. [Vercel Configuration](#vercel-configuration)
6. [Code Architecture Changes](#code-architecture-changes)
7. [Testing & Validation](#testing--validation)
8. [Lessons Learned](#lessons-learned)
9. [Checklist for Future Migrations](#checklist-for-future-migrations)

---

## Initial Architecture

### Before Migration
```
├── liturgists.ukiahumc.org (subdomain)
│   └── Single-purpose liturgist signup app
│
├── seniormeals.ukiahumc.org (hypothetical subdomain 2)
│   └── Separate deployment
│
└── transportation.ukiahumc.org (hypothetical subdomain 3)
    └── Separate deployment
```

**Problems with subdomain architecture:**
- Each service requires separate deployment
- No shared navigation between services
- User must remember multiple URLs
- Difficult to maintain consistent branding
- SEO fragmentation across subdomains

---

## Target Architecture

### After Migration
```
signups.ukiahumc.org/
├── / (landing page)
├── /liturgists (formerly liturgists.ukiahumc.org)
├── /food-distribution (new service)
└── /senior-transportation (future service)

All services:
- Share common navigation
- Use consistent UI components
- Single deployment pipeline
- Unified user experience
```

**Benefits:**
- Single deployment and maintenance
- Shared component library
- Consistent navigation across all services
- Better SEO with unified domain authority
- Easier to add new services

---

## Migration Strategy

### Phase 1: Repository Setup
1. **Rename GitHub repository**
   ```bash
   # Old: samuelmholley1/liturgists.ukiahumc.org
   # New: samuelmholley1/signups.ukiahumc.org
   ```

2. **Update local git remote**
   ```bash
   git remote set-url origin https://github.com/samuelmholley1/signups.ukiahumc.org.git
   ```

3. **Configure Vercel project**
   - Add new production domain: `signups.ukiahumc.org`
   - Keep old subdomain temporarily for redirects: `liturgists.ukiahumc.org`

### Phase 2: Route Restructuring
Create new path-based structure:

```typescript
// src/app/ directory structure
app/
├── page.tsx                              // Landing page (new)
├── liturgists/
│   ├── page.tsx                          // Moved from root
│   └── schedule-summary/page.tsx
└── food-distribution/
    ├── page.tsx                          // New service
    ├── inventory/page.tsx
    └── schedule-summary/page.tsx
```

### Phase 3: Redirect Configuration
**Critical:** Use `redirects`, NOT `rewrites` in `vercel.json`

---

## Critical Issues & Solutions

### Issue 1: Rewrites vs Redirects
**Problem:**
Initial attempt used `vercel.json` with `rewrites` configuration:
```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/liturgists/:path*",
      "has": [
        {
          "type": "host",
          "value": "liturgists.ukiahumc.org"
        }
      ]
    }
  ]
}
```

**Why it failed:**
- Vercel treats each subdomain as a completely separate deployment
- Rewrites work within a single domain but don't work cross-domain
- The subdomain `liturgists.ukiahumc.org` was pointing to the old deployment, not the new one
- Rewrites are server-side URL mappings that don't change the browser URL

**Solution:**
Use **permanent redirects** (301) instead:
```json
{
  "redirects": [
    {
      "source": "/:path*",
      "destination": "https://signups.ukiahumc.org/liturgists/:path*",
      "permanent": true,
      "has": [
        {
          "type": "host",
          "value": "liturgists.ukiahumc.org"
        }
      ]
    }
  ]
}
```

**Why this works:**
- 301 redirects tell the browser to navigate to the new URL
- Preserves all path segments (`:path*`)
- Maintains SEO value with permanent redirect status
- Works across different Vercel deployments
- Users see and can bookmark the new URL structure

### Issue 2: Inventory Path Collision
**Problem:**
`/inventory` path existed at root level but needed to be under `/food-distribution/inventory`

**Solution:**
Add specific redirect before the wildcard subdomain redirect:
```json
{
  "redirects": [
    {
      "source": "/inventory",
      "destination": "/food-distribution/inventory",
      "permanent": true
    },
    // ... then subdomain redirects
  ]
}
```

**Key Learning:** Order matters in `vercel.json`. More specific routes must come before wildcard patterns.

### Issue 3: Navigation Context Awareness
**Problem:**
Shared navigation component needed to show different branding for different sections.

**Solution:**
Created context-aware `SectionHeader.tsx`:
```typescript
'use client';

import { usePathname } from 'next/navigation';

export default function SectionHeader() {
  const pathname = usePathname();
  
  // Detect current section
  const isLiturgists = pathname.startsWith('/liturgists');
  const isFoodDistribution = pathname.startsWith('/food-distribution');
  
  // Context-aware styling
  const bgColor = isFoodDistribution 
    ? 'bg-gradient-to-r from-green-700 to-green-800'
    : 'bg-gradient-to-r from-blue-700 to-blue-800';
    
  const icon = isFoodDistribution ? '🍎' : '📖';
  const title = isFoodDistribution 
    ? 'Food Distribution' 
    : 'Liturgist Signups';
    
  return (
    <header className={bgColor}>
      <h1>{icon} {title}</h1>
      {/* Shared navigation */}
    </header>
  );
}
```

**Key Learning:** Use Next.js `usePathname()` hook for dynamic section detection.

### Issue 4: Multi-Service Backend Support
**Problem:**
Backend API was hardcoded for single Airtable table (Liturgists only).

**Solution:**
Implemented table parameter routing:

```typescript
// src/lib/airtable.ts
const TABLES = {
  liturgists: process.env.AIRTABLE_LITURGISTS_TABLE || 'Liturgists',
  food: process.env.AIRTABLE_FOOD_TABLE || 'Food Distribution'
};

export async function submitSignup(
  data: SignupData, 
  tableName: 'liturgists' | 'food'
) {
  const table = base(TABLES[tableName]);
  // ... rest of implementation
}
```

```typescript
// src/app/api/signup/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const { table = 'liturgists', ...signupData } = body;
  
  await submitSignup(signupData, table as 'liturgists' | 'food');
  // ...
}
```

**Key Learning:** Design APIs with multi-tenancy from the start. Use environment variables per service.

### Issue 5: Role Terminology Differences
**Problem:**
Different services use different terminology:
- Liturgists: `Lector`, `Liturgist`, `Usher`
- Food Distribution: `volunteer1`, `volunteer2`

**Solution:**
Service-specific role mapping in API layer:
```typescript
// src/app/api/services/route.ts
const { searchParams } = new URL(request.url);
const table = searchParams.get('table') || 'liturgists';

if (table === 'food') {
  // Map volunteer1/volunteer2 roles
  const volunteer1Signup = signups.find(s => s.role === 'volunteer1');
  const volunteer2Signup = signups.find(s => s.role === 'volunteer2');
  
  service.volunteer1 = volunteer1Signup 
    ? { id: volunteer1Signup.id, name: volunteer1Signup.name, ... }
    : null;
} else {
  // Map liturgist roles
  service.lector = signups.find(s => s.role === 'Lector');
}
```

**Key Learning:** Keep service-specific logic in API layer, not shared components.

---

## Vercel Configuration

### Final vercel.json
```json
{
  "redirects": [
    {
      "source": "/inventory",
      "destination": "/food-distribution/inventory",
      "permanent": true
    },
    {
      "source": "/:path*",
      "destination": "https://signups.ukiahumc.org/liturgists/:path*",
      "permanent": true,
      "has": [
        {
          "type": "host",
          "value": "liturgists.ukiahumc.org"
        }
      ]
    }
  ]
}
```

### Environment Variables Setup
**Per Service:**
```bash
# Vercel Dashboard → Settings → Environment Variables

AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_PAT=patXXXXXXXXXXXXXXXX

# Service-specific table names
AIRTABLE_LITURGISTS_TABLE=Liturgists
AIRTABLE_FOOD_TABLE=Food Distribution

# Shared email config
ZOHO_USER=alerts@yourdomain.com
ZOHO_PASSWORD=xxxxx
```

**Key Learning:** Use environment variables for service-specific configuration, not hardcoded values.

---

## Code Architecture Changes

### Shared Components Strategy
Created reusable components with context awareness:

```
src/components/
├── SectionHeader.tsx       // Context-aware navigation
├── PasswordGate.tsx        // Reusable auth gate
├── ScheduleSummary.tsx     // Service-agnostic summary view
└── SignupModal.tsx         // Reusable signup form
```

### Service-Specific Pages
Each service maintains its own page structure:

```
src/app/
├── liturgists/
│   └── page.tsx            // Service-specific UI and logic
└── food-distribution/
    └── page.tsx            // Different data model, UI, terminology
```

### API Layer Design
Unified API with service parameter:

```
src/app/api/
├── services/route.ts       // GET with ?table=liturgists|food
├── signup/route.ts         // POST/DELETE with table parameter
└── webhook/
    └── airtable/route.ts   // Webhook handler (all tables)
```

**Key Pattern:**
```typescript
// Client (food-distribution/page.tsx)
const response = await fetch('/api/services?table=food');

// API (api/services/route.ts)
const table = searchParams.get('table') || 'liturgists';
const signups = await getSignups(table as 'liturgists' | 'food');
```

---

## Testing & Validation

### Testing Checklist Used

#### Redirect Testing
- [ ] Visit `liturgists.ukiahumc.org` → redirects to `signups.ukiahumc.org/liturgists`
- [ ] Visit `liturgists.ukiahumc.org/schedule-summary` → redirects to `signups.ukiahumc.org/liturgists/schedule-summary`
- [ ] Visit `signups.ukiahumc.org/inventory` → redirects to `signups.ukiahumc.org/food-distribution/inventory`
- [ ] Check redirect status codes (should be 301)

#### Navigation Testing
- [ ] Click between services in header
- [ ] Header shows correct icon and title for each service
- [ ] Header color matches service (blue for liturgists, green for food)
- [ ] All navigation links work correctly

#### API Testing
- [ ] Liturgists signup creates record in "Liturgists" table
- [ ] Food distribution signup creates record in "Food Distribution" table
- [ ] Cancel functionality works for both services
- [ ] Email notifications sent for both services

#### Browser Testing
- [ ] Test on mobile viewport
- [ ] Test on desktop viewport
- [ ] Test with JavaScript disabled (graceful degradation)
- [ ] Test service worker updates

### Tools Used
```bash
# Test redirects locally before deploying
npm run build && npm start

# Check for TypeScript errors
npm run type-check

# Validate build output
npm run build 2>&1 | grep -i error
```

---

## Lessons Learned

### ✅ Do This
1. **Use 301 redirects for subdomain migration**, not rewrites
2. **Test redirects thoroughly** before DNS changes
3. **Keep old subdomains active** for 6-12 months with redirects
4. **Use environment variables** for service-specific configuration
5. **Design APIs with multi-tenancy** from the start
6. **Order matters** in `vercel.json` - specific routes before wildcards
7. **Context-aware components** using `usePathname()` for navigation
8. **Commit frequently** during migration with descriptive messages
9. **Document environment variables** needed for each service

### ❌ Don't Do This
1. **Don't use rewrites** for cross-subdomain routing in Vercel
2. **Don't hardcode service names** in shared components
3. **Don't mix service-specific logic** in shared API routes without parameters
4. **Don't delete old subdomains** immediately - redirect first
5. **Don't assume rewrites work** like they do in other platforms (nginx, Apache)
6. **Don't forget to update** all environment variables in Vercel dashboard
7. **Don't skip the `permanent: true` flag** on redirects (SEO impact)

### 🔑 Key Insights
- **Vercel's subdomain model**: Each subdomain is treated as a separate deployment in Vercel's infrastructure
- **Redirects are client-side**: 301 redirects tell the browser to go to a new URL, allowing cross-deployment routing
- **Order of operations**: Vercel processes `redirects` array in order - put specific routes before wildcards
- **Context-aware UI**: Next.js `usePathname()` enables dynamic component behavior based on current route
- **Multi-tenancy patterns**: Parameter-based routing (`?table=food`) is cleaner than separate endpoints

---

## Checklist for Future Migrations

### Pre-Migration Phase
- [ ] Inventory all existing subdomains and their purposes
- [ ] Document current environment variables per subdomain
- [ ] Map subdomain → path structure (e.g., `meals.domain.com` → `/meals`)
- [ ] Identify shared vs service-specific components
- [ ] Plan Airtable/database table structure for multi-service support
- [ ] Document current API contracts and data models

### Migration Phase
- [ ] Create new unified GitHub repository
- [ ] Set up new production domain in Vercel
- [ ] Add all old subdomains as domains in Vercel project (for redirects)
- [ ] Create path-based directory structure in `src/app/`
- [ ] Build landing page with links to all services
- [ ] Implement context-aware navigation component
- [ ] Update API routes with service/table parameter support
- [ ] Configure environment variables for all services
- [ ] Create `vercel.json` with 301 redirects for all old subdomains

### Testing Phase
- [ ] Test each redirect path manually
- [ ] Verify redirects preserve query parameters and paths
- [ ] Test all services with their respective APIs/databases
- [ ] Validate navigation between services
- [ ] Check mobile and desktop viewports
- [ ] Run end-to-end tests if available
- [ ] Test email notifications for each service

### Deployment Phase
- [ ] Deploy to Vercel staging environment first
- [ ] Test all redirects on staging
- [ ] Deploy to production
- [ ] Monitor error logs for 48 hours
- [ ] Update documentation and README files
- [ ] Communicate changes to users/stakeholders

### Post-Migration Phase
- [ ] Monitor analytics for redirect traffic patterns
- [ ] Keep old subdomains active for 6-12 months minimum
- [ ] Update all internal links to new path structure
- [ ] Update external documentation with new URLs
- [ ] Plan sunset date for old subdomain redirects

---

## Example: Three Senior Center Subdomains

### Before
```
meals.seniorcenter.org       → Meal signup service
transport.seniorcenter.org   → Transportation booking
activities.seniorcenter.org  → Activity registration
```

### After
```
seniorcenter.org/
├── /                        → Landing page with all services
├── /meals                   → Meal signup
├── /transportation          → Transportation booking
└── /activities              → Activity registration
```

### Implementation Steps

1. **Repository Setup**
   ```bash
   # Rename repo
   gh repo rename seniorcenter.org
   
   # Update local remote
   git remote set-url origin https://github.com/yourorg/seniorcenter.org.git
   ```

2. **Vercel Configuration**
   ```json
   {
     "redirects": [
       {
         "source": "/:path*",
         "destination": "https://seniorcenter.org/meals/:path*",
         "permanent": true,
         "has": [{ "type": "host", "value": "meals.seniorcenter.org" }]
       },
       {
         "source": "/:path*",
         "destination": "https://seniorcenter.org/transportation/:path*",
         "permanent": true,
         "has": [{ "type": "host", "value": "transport.seniorcenter.org" }]
       },
       {
         "source": "/:path*",
         "destination": "https://seniorcenter.org/activities/:path*",
         "permanent": true,
         "has": [{ "type": "host", "value": "activities.seniorcenter.org" }]
       }
     ]
   }
   ```

3. **Environment Variables**
   ```bash
   # Vercel Dashboard
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   AIRTABLE_MEALS_TABLE=Meals
   AIRTABLE_TRANSPORT_TABLE=Transportation
   AIRTABLE_ACTIVITIES_TABLE=Activities
   ```

4. **API Structure**
   ```typescript
   // src/app/api/bookings/route.ts
   const service = searchParams.get('service'); // meals|transport|activities
   const table = TABLES[service];
   const bookings = await getBookings(table);
   ```

5. **Context-Aware Header**
   ```typescript
   const isMeals = pathname.startsWith('/meals');
   const isTransport = pathname.startsWith('/transportation');
   const isActivities = pathname.startsWith('/activities');
   
   const icon = isMeals ? '🍽️' : isTransport ? '🚐' : '🎨';
   const color = isMeals ? 'orange' : isTransport ? 'blue' : 'purple';
   ```

---

## Additional Resources

### Documentation Created During Migration
- `AIRTABLE_SETUP.md` - Multi-table Airtable configuration
- `VERCEL_DEPLOYMENT.md` - Deployment and environment setup
- `VERCEL_ENV_VARS_UPDATE.md` - Environment variable reference
- `MIGRATION_TO_SIGNUPS_PLAN.md` - Initial migration planning document

### Useful Vercel Documentation
- [Vercel Redirects](https://vercel.com/docs/concepts/projects/project-configuration#redirects)
- [Vercel Rewrites vs Redirects](https://vercel.com/docs/concepts/projects/project-configuration#rewrites-vs-redirects)
- [Multi-domain Configuration](https://vercel.com/docs/concepts/projects/domains)

### Git Commands for Repository Rename
```bash
# Update remote URL
git remote set-url origin https://github.com/user/new-repo-name.git

# Verify remote
git remote -v

# Test connection
git fetch
```

---

## Conclusion

Migrating from subdomain-based to path-based navigation requires careful planning but provides significant long-term benefits. The key technical challenge is understanding that Vercel treats subdomains as separate deployments, requiring 301 redirects rather than rewrites for cross-domain routing.

This migration successfully transformed a single-purpose subdomain into a multi-service platform with:
- ✅ Unified navigation and branding
- ✅ Single deployment pipeline
- ✅ Shared component library
- ✅ Backward compatibility via 301 redirects
- ✅ Service-specific customization where needed

**Time to complete:** ~4-6 hours for 2 services (liturgists + food distribution)  
**Estimated time for 3 services:** ~6-8 hours

---

**End of Guide**  
Last Updated: November 23, 2025
