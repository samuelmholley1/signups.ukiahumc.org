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

## 📝 POST-MIGRATION ISSUES (November 23, 2025)

Issues discovered and fixed that are **directly related to the subdomain-to-path migration**.

### Issue 6: Conditional Airtable Fields Across Tables
**Problem:** 500 error on food distribution signups - `UNKNOWN_FIELD_NAME` for "Attendance Status".

**Root Cause:** "Attendance Status" field exists ONLY in Liturgists table, not Food Distribution table.

**Solution:** Conditional field inclusion based on table type in `submitSignup()`.

**Key Learning:** Multi-table systems need defensive field mapping. Never assume all tables share the same schema. When migrating multiple services, preserve original table structures.

---

### Issue 7: Email Branding Confusion
**Problem:** All emails said "Liturgist Signup System" even for food distribution users - confusing and unprofessional.

**Solution:** Implemented **complete table-aware email system** with three adaptation layers:

1. **Dynamic Sender Name:** `fromName` parameter - "UUMC Food Distribution" vs "UUMC Liturgist Scheduling"
2. **Dynamic Subjects:** "Food Distribution Volunteer" vs "Liturgist" in all email subjects
3. **Dynamic Body Content:** Added `systemName` parameter to email generation functions, header colors (orange vs blue), body messages, footer text

**Key Learning:** Multi-tenant email systems need comprehensive branding adaptation. Update sender name, subjects, AND body content for complete context adaptation.

---

### Issue 8: Role Detection in Email Link Cancellations
**Challenge:** GET handler for email link cancellations doesn't have explicit table parameter.

**Solution:** Detect table type from role prefix - `volunteer*` roles = food distribution.

**Future Enhancement:** Add explicit `table` query parameter to cancellation links for more robust detection.

**Key Learning:** Role prefixes can serve as implicit service identifiers when explicit parameters aren't available. Document these conventions clearly.

---

### Updated Architectural Patterns

#### Pattern 4: Context Propagation in Email System
```typescript
// Detection Layer (API route)
const systemName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling';

// Propagation Layer (function params)
generateSignupEmail({ ...userData, systemName });
sendEmail({ ...emailParams, fromName: systemName });

// Rendering Layer (email template)
<footer>${systemName}</footer>
```

---

---

### Issue 9: Email Template URL Hardcoding (Nov 23, 2025)
**Problem:** Cancellation emails still used hardcoded `liturgists.ukiahumc.org` URLs for logo images and links, causing broken images and wrong navigation.

**Root Cause:** Email templates in `generateSignupEmail()` and `generateCancellationEmail()` had hardcoded subdomain URLs that weren't updated during migration.

**Solution:** Updated all email template URLs:
```typescript
// Before
<img src="https://liturgists.ukiahumc.org/logo-for-church-larger.jpg" />
<a href="https://liturgists.ukiahumc.org">Return to Schedule</a>

// After
<img src="https://signups.ukiahumc.org/logo-for-church-larger.jpg" />
<a href="https://signups.ukiahumc.org">Return to Schedule</a>
```

**Key Learning:** When migrating domains, grep ALL hardcoded URLs in email templates, not just application code. Email templates are often overlooked.

---

### Issue 10: Email Footer Service Duplication (Nov 23, 2025)
**Problem:** Email footers showed both church name AND system name, creating redundant messaging (e.g., "Ukiah United Methodist Church" + "UUMC Food Distribution").

**Solution:** Simplified footer to show only church name - system context already clear from sender name and subject line.

**Key Learning:** In multi-service emails, context comes from sender name + subject. Keep footers minimal - organization name only.

---

### Issue 11: Email Role Label Detection (Nov 23, 2025)
**Problem:** Food distribution confirmation emails showed "Your Role: Liturgist" instead of "Food Distribution Volunteer".

**Root Cause:** `generateSignupEmail()` only checked for backup vs regular liturgist, didn't check service type first.

**Solution:** Added service type check BEFORE role logic:
```typescript
if (isFoodDistribution) {
  roleLabel = 'Food Distribution Volunteer'
} else {
  const isBackup = role.toLowerCase() === 'backup'
  roleLabel = isBackup ? 'Backup Liturgist' : 'Liturgist'
}
```

**Key Learning:** When adapting shared code for multiple services, always check service type FIRST, then apply service-specific logic.

---

### Issue 12: Client-Side Cache Preventing UI Updates (Nov 23, 2025)
**Problem:** Food distribution page didn't show newly filled slots after signups - users saw stale data until manual refresh.

**Root Cause:** Browser caching API responses. Even though `fetchSignups()` was called after mutations, cached responses were returned.

**Solution:** Added cache-busting to API fetch:
```typescript
// Before
const response = await fetch('/api/services?table=food&quarter=Q4-2025')

// After
const response = await fetch(`/api/services?table=food&quarter=Q4-2025&t=${Date.now()}`, {
  cache: 'no-store'
})
```

**Key Learning:** After mutations (POST/DELETE), re-fetch operations need cache-busting. Add timestamp parameter + `cache: 'no-store'` directive.

---

## Migration-Specific Common Pitfalls

| Pitfall | Solution | Reference |
|---------|----------|-----------|
| **Using rewrites instead of redirects** | Use 301 redirects for cross-subdomain routing | Issue 1 |
| **Wildcard route ordering** | Put specific routes before wildcards in vercel.json | Issue 2 |
| **Airtable field schema differences** | Use conditional field inclusion based on table type | Issue 6 |
| **Email branding inconsistency** | Update sender name, subject, AND body content | Issue 7 |
| **Role terminology collision** | Use unique prefixes per service type (volunteer* vs liturgist*) | Issue 8 |
| **Hardcoded subdomain URLs in emails** | Grep ALL email templates for old domain references | Issue 9 |
| **Email footer redundancy** | Keep footers minimal - org name only | Issue 10 |
| **Service type detection order** | Check service type BEFORE checking role variations | Issue 11 |
| **Stale cache after mutations** | Add timestamp + no-store directive to re-fetches | Issue 12 |

---

## Migration-Specific Key Learnings

### Core Migration Principles
1. **Vercel treats subdomains as separate deployments** - Use 301 redirects, not rewrites
2. **Redirect order matters** - Specific routes must come before wildcards in vercel.json
3. **Test redirects thoroughly** - Verify all path combinations preserve query params
4. **Keep old subdomains active** - Maintain redirects for 6-12 months minimum

### Multi-Service Architecture
5. **Preserve original table structures** - Minimally edit existing Airtable schemas to reduce errors
6. **Conditional field mapping** - Multi-table systems need defensive field inclusion based on service type
7. **Parameter-based routing** - Use `?table=food` pattern instead of separate endpoints
8. **Unique role prefixes** - Service-specific role conventions enable implicit detection (volunteer* vs liturgist*)

### Email System Adaptation
9. **Complete branding adaptation** - Update sender name, subject line, AND body content for each service
10. **Domain migration in templates** - Grep ALL hardcoded URLs in email HTML, not just app code
11. **Service type detection order** - Always check service type FIRST, then role-specific logic
12. **Minimal email footers** - Org name only - context comes from sender/subject

### Client-Side Updates
13. **Cache-busting after mutations** - Add timestamp params + `cache: 'no-store'` to re-fetch calls
14. **Context-aware components** - Use Next.js `usePathname()` for dynamic section detection

---

## Final Production Stats (As of Nov 23, 2025)

**Initial Migration:** November 20-22, 2025
- Subdomain → path-based routing: 4-6 hours
- Vercel configuration and testing: 2 hours

**Post-Migration Fixes:** November 23, 2025
- Conditional Airtable fields: 1 hour
- Email branding overhaul: 3 hours
- Email template URL migration: 1 hour
- Role label detection fixes: 1 hour
- Cache-busting implementation: 0.5 hours
- Testing and validation: 1.5 hours

**Total Migration Time:** ~8 hours for complete subdomain-to-path migration with all edge cases resolved

**Files Modified:**
- `vercel.json` - Redirect configuration
- `src/lib/email.ts` - Email templates with new domain URLs and service detection
- `src/lib/airtable.ts` - Conditional field mapping
- `src/app/api/signup/route.ts` - Multi-table routing
- `src/app/food-distribution/page.tsx` - Cache-busting implementation

**Key Insight:** Most migration time was redirect configuration (1 hour) + fixing domain references in email templates (1 hour) + conditional field logic (1 hour). The actual routing changes were straightforward.

---

## Issue 13: Git Merge Strategy and Conflict Resolution

**Problem**: When merging subdomain branches back to main, encountered complex conflicts in shared files (layout.tsx, middleware.ts, API routes).

**Root Cause**: 
- Two parallel development branches (liturgists-subdomain and food-distribution-subdomain)
- Both modified same core files with different service-specific logic
- No shared abstraction layer initially

**Failed Approaches**:
1. Direct merge - Created conflicts in 15+ files
2. Cherry-picking - Lost context and introduced bugs
3. Manual file-by-file merge - Error-prone and time-consuming

**Solution**:
```bash
# Merge strategy used:
# 1. Create clean comparison branch
git checkout main
git checkout -b merge-prep

# 2. Merge liturgists first (safer, more stable)
git merge liturgists-subdomain
# Resolve conflicts carefully, test thoroughly

# 3. Merge food distribution with full context
git merge food-distribution-subdomain
# Use three-way diff to understand both changes

# 4. Refactor to service-aware patterns
# Extract common logic to shared utilities
# Add service detection throughout
```

**Key Merge Conflicts**:
- **middleware.ts**: Password gate logic vs service routing
- **layout.tsx**: Navigation components for different services  
- **API routes**: Airtable table selection logic
- **globals.css**: Service-specific styling overrides
- **Types**: Interface mismatches between services

**Best Practices Learned**:
1. **Merge smaller, more frequently** - Don't let branches diverge too far
2. **Create service-agnostic abstractions early** - Makes merging easier
3. **Test both services after each merge commit** - Catch integration bugs immediately
4. **Use feature flags** - Allow gradual rollout of merged features
5. **Document merge decisions** - Future maintainers need context

**Preventive Measures for Next Time**:
```typescript
// From the start, design for multiple services:
// lib/service-config.ts
export const SERVICE_CONFIG = {
  liturgists: {
    table: 'Liturgists',
    fields: ['liturgist', 'backup'],
    branding: 'Liturgist Signup'
  },
  'food-distribution': {
    table: 'FoodDistribution', 
    fields: ['volunteer1', 'volunteer2', 'volunteer3', 'volunteer4'],
    branding: 'Food Distribution Volunteer'
  }
}

// Then reference config instead of hardcoding
const config = SERVICE_CONFIG[service]
```

---

## Issue 14: Vercel Domain Configuration and DNS Management

**Problem**: Subdomain approach required complex DNS configuration and Vercel project management that caused deployment confusion.

**Initial Setup Issues**:
- Main domain: signups.ukiahumc.org (pointed to main Vercel project)
- Attempted subdomain: food.signups.ukiahumc.org (required separate Vercel project OR complex rewrite rules)
- DNS CNAME records conflicting with Vercel's automatic SSL

**Why Subdomains Were Problematic**:
1. **Vercel Limitations**: Subdomains either need separate projects OR rewrites (which break relative paths)
2. **SSL Certificate Management**: Each subdomain needs its own cert verification
3. **Preview Deployments**: Subdomain previews created confusing URLs
4. **CORS Issues**: Cross-subdomain requests triggered CORS policies
5. **Cookie Isolation**: Auth cookies couldn't be shared across subdomains

**Path-Based Solution Benefits**:
```
Before (subdomain approach):
- signups.ukiahumc.org → Main project
- food.signups.ukiahumc.org → ??? (separate project OR rewrite)
- liturgists.signups.ukiahumc.org → ??? (more complexity)

After (path-based approach):
- signups.ukiahumc.org/liturgists → All in one project
- signups.ukiahumc.org/food-distribution → Same project
- signups.ukiahumc.org/admin → Same project
- Single DNS record, single SSL cert, single deployment
```

**DNS Configuration**:
```dns
# Simple, single record needed:
A record: signups.ukiahumc.org → 76.76.21.21 (Vercel)
# No CNAME subdomains needed!
```

**Vercel Configuration**:
```json
// vercel.json (simplified)
{
  "rewrites": [
    {
      "source": "/liturgists/:path*",
      "destination": "/liturgists/:path*"
    },
    {
      "source": "/food-distribution/:path*", 
      "destination": "/food-distribution/:path*"
    }
  ]
}
```

**Lessons Learned**:
1. **Favor path-based routing** for multi-service Next.js apps
2. **Subdomains add complexity** without significant benefits for our use case
3. **Single Vercel project** = simpler DNS, SSL, deployments, previews
4. **Vercel rewrites work best with paths**, not subdomains

---

## Issue 15: Testing Strategy for Multi-Service Applications

**Problem**: E2E tests written for single-service app broke when merged into multi-service system.

**Test Failures After Merge**:
- Tests navigated to `/` (root) but services now at `/liturgists` and `/food-distribution`
- Password gate appeared on all pages, tests didn't account for it
- Selectors assumed single service structure
- Real-time updates tested only for liturgists

**Original Test Structure**:
```typescript
// playwright/liturgist-signup.spec.ts
test('should signup for liturgist slot', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  // This broke - now need /liturgists
  await page.click('[data-testid="signup-button"]')
  // ...
})
```

**Fixed Multi-Service Test Structure**:
```typescript
// e2e/liturgist-signup.spec.ts
test.describe('Liturgist Signup Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to correct service path
    await page.goto('http://localhost:3000/liturgists')
    
    // Handle password gate (all services require auth)
    const passwordInput = page.locator('input[type="password"]')
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(process.env.TEST_PASSWORD!)
      await page.click('button:has-text("Submit")')
    }
  })
  
  test('should signup for liturgist slot', async ({ page }) => {
    // Test-specific logic
    await page.waitForSelector('[data-testid="liturgist-signup-button"]')
    // ...
  })
})

// e2e/food-distribution-signup.spec.ts
test.describe('Food Distribution Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/food-distribution')
    // Handle password gate
    // ...
  })
  
  test('should signup for volunteer slot', async ({ page }) => {
    await page.waitForSelector('[data-testid="volunteer-signup-button"]')
    // ...
  })
})
```

**Key Testing Patterns**:
1. **Service-specific test files** - Separate concerns, easier maintenance
2. **Shared test utilities** - Password gate handler, common selectors
3. **Data-testid attributes** - Service-aware selectors (`data-testid="liturgist-signup"` vs `data-testid="volunteer-signup"`)
4. **Environment variables** - Test against correct service paths
5. **Parallel execution** - Run both service tests simultaneously

**Test Utility Pattern**:
```typescript
// e2e/utils/auth.ts
export async function handlePasswordGate(page: Page) {
  const passwordInput = page.locator('input[type="password"]')
  if (await passwordInput.isVisible({ timeout: 1000 })) {
    await passwordInput.fill(process.env.TEST_PASSWORD!)
    await page.click('button:has-text("Submit")')
    await passwordInput.waitFor({ state: 'hidden' })
  }
}

// e2e/utils/navigation.ts
export const ROUTES = {
  liturgists: '/liturgists',
  foodDistribution: '/food-distribution',
  liturgistsSummary: '/liturgists/schedule-summary',
  foodSummary: '/food-distribution/schedule-summary'
}
```

**Lessons Learned**:
1. **Test service boundaries** - Each service needs comprehensive test coverage
2. **Don't assume single service** - Tests should work in multi-service context
3. **Use test utilities** - Reduce duplication, easier updates
4. **Service-aware selectors** - Namespace test IDs by service
5. **Test cross-service scenarios** - Navigation between services, shared components

---

## Issue 16: Environment Variable Management Across Services

**Problem**: Environment variables needed for multiple services but structured for single service.

**Initial Structure** (Single Service):
```env
# .env.local
AIRTABLE_API_KEY=keyXXXXX
AIRTABLE_BASE_ID=appYYYYY
AIRTABLE_TABLE_NAME=Liturgists  # Hardcoded!
AUTH_PASSWORD=mypassword
```

**Problem After Merge**:
- Which table should `AIRTABLE_TABLE_NAME` point to?
- Both services need different table names
- Can't have two variables with same name
- Environment variables needed to be service-aware

**Solution** (Multi-Service):
```env
# .env.local
AIRTABLE_API_KEY=keyXXXXX
AIRTABLE_BASE_ID=appYYYYY
# No AIRTABLE_TABLE_NAME - determined by service parameter

# Service-specific settings
LITURGISTS_TABLE_NAME=Liturgists
FOOD_DISTRIBUTION_TABLE_NAME=FoodDistribution

# Shared settings
AUTH_PASSWORD=mypassword
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
EMAIL_FROM=noreply@ukiahumc.org
```

**Code Pattern**:
```typescript
// lib/airtable.ts
export function getTableName(service: 'liturgists' | 'food-distribution'): string {
  const tableMap = {
    liturgists: process.env.LITURGISTS_TABLE_NAME || 'Liturgists',
    'food-distribution': process.env.FOOD_DISTRIBUTION_TABLE_NAME || 'FoodDistribution'
  }
  return tableMap[service]
}

// API route usage:
const service = searchParams.get('table') === 'food' ? 'food-distribution' : 'liturgists'
const tableName = getTableName(service)
```

**Vercel Environment Variables**:
```
Production Environment:
✓ AIRTABLE_API_KEY (secret)
✓ AIRTABLE_BASE_ID
✓ AUTH_PASSWORD (secret)
✓ SMTP_HOST
✓ SMTP_PASS (secret)
✓ LITURGISTS_TABLE_NAME
✓ FOOD_DISTRIBUTION_TABLE_NAME

Preview/Development:
(Same variables, different values for testing)
```

**Lessons Learned**:
1. **Avoid hardcoded service names in env vars** - Use dynamic lookups
2. **Namespace service-specific vars** - `SERVICE_SETTING` pattern
3. **Document required env vars** - README should list all needed
4. **Validate env vars at startup** - Fail fast if missing
5. **Use separate env files per environment** - `.env.local`, `.env.production`

**Validation Pattern**:
```typescript
// lib/env-validation.ts
const requiredEnvVars = [
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'AUTH_PASSWORD',
  'LITURGISTS_TABLE_NAME',
  'FOOD_DISTRIBUTION_TABLE_NAME'
]

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Call in middleware or API routes:
validateEnv()
```

