# Migration Plan: liturgists.ukiahumc.org → signups.ukiahumc.org

**Date Created:** November 23, 2025  
**Target Completion:** Immediate

## 🎯 OVERVIEW

Transform the single-purpose liturgist signup app into a multi-purpose signup platform:
- **New Domain:** `signups.ukiahumc.org`
- **Route 1:** `/liturgists` - Current liturgist signup (preserved)
- **Route 2:** `/food-distribution` - NEW food distribution signup (clone)
- **Password Protection:** Same password (`lovewins`) for both routes
- **Summary Pages:** Both routes get their own `/schedule-summary` pages

## 📋 SCOPE OF CHANGES

### What I (AI) Will Do
✅ Rename local Git repository  
✅ Update all internal references from `liturgists.ukiahumc.org` to `signups.ukiahumc.org`  
✅ Restructure app routes to `/liturgists` and `/food-distribution`  
✅ Create new Airtable table for food distribution using API  
✅ Update environment variables for multi-table support  
✅ Clone and adapt all code for food-distribution route  
✅ Create individual summary pages for each route  
✅ Update all documentation  
✅ Update package.json metadata  
✅ Update PWA manifest  
✅ Update all email templates with new domain  

### What You (Human) Will Do
⏳ Rename GitHub repository to `signups.ukiahumc.org`  
⏳ Update DNS records to point to new domain  
⏳ Rename Vercel project to match new domain  
⏳ Add `signups.ukiahumc.org` domain in Vercel  
⏳ Deploy to Vercel after AI completes changes  
⏳ (Optional) Rename Airtable base from "Liturgist Signups" to "Church Signups"

---

## 📁 DETAILED CHANGE PLAN

### 1. REPOSITORY & PROJECT STRUCTURE

#### 1.1 Rename Local Repository
```bash
cd ~/Projects
mv liturgists.ukiahumc.org signups.ukiahumc.org
cd signups.ukiahumc.org
```

#### 1.2 Update package.json
- Change `name` from `liturgists-ukiahumc` to `signups-ukiahumc`
- Update description to reflect multi-purpose platform

#### 1.3 Update Git Remote (After GitHub Rename)
```bash
# After you rename the GitHub repo
git remote set-url origin https://github.com/samuelmholley1/signups.ukiahumc.org.git
```

---

### 2. ROUTE RESTRUCTURING

#### Current Structure
```
/                          → Main liturgist signup
/schedule-summary          → Liturgist summary
/admin                     → Admin directory
/inventory                 → Inventory page
```

#### New Structure
```
/                          → Landing page / redirect to /liturgists
/liturgists                → Liturgist signup (moved from /)
/liturgists/schedule-summary  → Liturgist summary (moved)
/food-distribution         → Food distribution signup (NEW)
/food-distribution/schedule-summary  → Food distribution summary (NEW)
/admin                     → Admin directory (unchanged)
/inventory                 → Inventory page (unchanged)
```

#### Files to Create/Move
1. **Create:** `/src/app/liturgists/page.tsx` (move content from `/src/app/page.tsx`)
2. **Create:** `/src/app/liturgists/schedule-summary/page.tsx` (move from `/src/app/schedule-summary/page.tsx`)
3. **Create:** `/src/app/food-distribution/page.tsx` (clone from liturgists)
4. **Create:** `/src/app/food-distribution/schedule-summary/page.tsx` (clone from liturgists)
5. **Update:** `/src/app/page.tsx` (new landing page with navigation)
6. **Create:** `/src/app/liturgists/layout.tsx` (optional - for shared layout)
7. **Create:** `/src/app/food-distribution/layout.tsx` (optional - for shared layout)

---

### 3. AIRTABLE CHANGES

#### Current Setup
- **Base ID:** `appmnQvqSb8lcHKz8`
- **Table:** `liturgists.ukiahumc.org`
- **PAT Token:** Has read/write permissions

#### New Setup - Multi-Table Support

##### 3.1 Create New Table via Airtable API
Use Airtable API to create new table: `food-distribution.ukiahumc.org`

**Schema for Food Distribution Table:**
```
Field Name                | Type              | Options
-------------------------|-------------------|------------------
Service Date             | Date              | Date only
Display Date             | Single line text  | -
Name                     | Single line text  | -
Email                    | Email             | -
Phone                    | Phone number      | -
Role                     | Single select     | Coordinator, Volunteer, Donor
Item Type                | Single select     | Perishable, Non-Perishable, Prepared Food
Quantity                 | Number            | Integer
Notes                    | Long text         | -
Submitted At             | Date              | Include time
```

**API Request:**
```bash
curl -X POST https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables \
  -H "Authorization: Bearer pat14Fg5mn0nGDM0b..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "food-distribution.ukiahumc.org",
    "description": "Food distribution signup and volunteer coordination",
    "fields": [
      {"name": "Service Date", "type": "date"},
      {"name": "Display Date", "type": "singleLineText"},
      {"name": "Name", "type": "singleLineText"},
      {"name": "Email", "type": "email"},
      {"name": "Phone", "type": "phoneNumber"},
      {"name": "Role", "type": "singleSelect", "options": {"choices": [
        {"name": "Coordinator"}, {"name": "Volunteer"}, {"name": "Donor"}
      ]}},
      {"name": "Item Type", "type": "singleSelect", "options": {"choices": [
        {"name": "Perishable"}, {"name": "Non-Perishable"}, {"name": "Prepared Food"}
      ]}},
      {"name": "Quantity", "type": "number", "options": {"precision": 0}},
      {"name": "Notes", "type": "multilineText"},
      {"name": "Submitted At", "type": "dateTime", "options": {"timeZone": "America/Los_Angeles"}}
    ]
  }'
```

##### 3.2 Update Environment Variables
**Before:**
```env
AIRTABLE_TABLE_NAME=liturgists.ukiahumc.org
```

**After:**
```env
AIRTABLE_LITURGISTS_TABLE=liturgists.ukiahumc.org
AIRTABLE_FOOD_TABLE=food-distribution.ukiahumc.org
```

##### 3.3 Update Airtable Library
Create table-aware wrapper functions in `/src/lib/airtable.ts`:
```typescript
// Add table parameter to all functions
export async function submitSignup(data: SignupData, tableName: string)
export async function getSignups(tableName: string)
export async function getSignupById(recordId: string, tableName: string)
export async function deleteSignup(recordId: string, tableName: string)

// Helper functions
export const TABLES = {
  LITURGISTS: process.env.AIRTABLE_LITURGISTS_TABLE || 'liturgists.ukiahumc.org',
  FOOD_DISTRIBUTION: process.env.AIRTABLE_FOOD_TABLE || 'food-distribution.ukiahumc.org'
}
```

##### 3.4 Rename Airtable Base (Manual - You Handle)
If Airtable PAT token doesn't have permission to rename base, you'll need to manually:
1. Go to Airtable web interface
2. Rename base from "Liturgist Signups" to "Church Signups" or similar
3. This is optional but recommended for clarity

---

### 4. CODE CHANGES

#### 4.1 Domain References
**Files to update:**
- `src/lib/email.ts` - All URL references
- `src/lib/email-old.ts` - All URL references  
- `src/app/api/signup/route.ts` - URL references
- `README.md` - All documentation
- `AIRTABLE_SETUP.md` - Documentation
- `VERCEL_DEPLOYMENT.md` - Documentation
- `LAUNCH_READY_SUMMARY.md` - Documentation
- `PRE_LAUNCH_CHECKLIST.md` - Documentation
- `E2E_TESTING_GUIDE.md` - Testing documentation
- `test-handlers.sh` - Test script
- `HANDLER_DEBUG_SUMMARY.md` - Debug docs

**Find & Replace:**
```
Find: liturgists.ukiahumc.org
Replace: signups.ukiahumc.org
```

Special cases:
- Keep Airtable table names as `liturgists.ukiahumc.org` and `food-distribution.ukiahumc.org`
- Update route references: `/` → `/liturgists`, `/schedule-summary` → `/liturgists/schedule-summary`

#### 4.2 API Route Updates
**Files to update:**
- `/src/app/api/signup/route.ts` - Add table parameter
- `/src/app/api/services/route.ts` - Add table parameter

Both need to:
1. Accept `table` query parameter or context
2. Route to correct Airtable table
3. Handle multi-table queries

#### 4.3 Type Definitions
**File:** `/src/types/liturgist.ts`

Add new types for food distribution:
```typescript
export type SignupType = 'liturgist' | 'food-distribution'

export interface FoodDistributionSignup {
  serviceDate: string
  displayDate: string
  name: string
  email: string
  phone?: string
  role: 'Coordinator' | 'Volunteer' | 'Donor'
  itemType?: 'Perishable' | 'Non-Perishable' | 'Prepared Food'
  quantity?: number
  notes?: string
}
```

#### 4.4 Password Gate
No changes needed - already works per-page via session storage.

---

### 5. NEW LANDING PAGE

**File:** `/src/app/page.tsx`

Create a simple navigation page:
```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Image
            src="/logo-for-church-larger.jpg"
            alt="Ukiah United Methodist Church"
            width={300}
            height={200}
            className="mx-auto rounded-lg shadow-md mb-6"
          />
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Church Signups
          </h1>
          <p className="text-xl text-gray-600">
            Choose a signup system below
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Liturgist Signup Card */}
          <Link href="/liturgists" className="...">
            Liturgist Signup
          </Link>

          {/* Food Distribution Card */}
          <Link href="/food-distribution" className="...">
            Food Distribution Signup
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

### 6. PWA & METADATA UPDATES

#### 6.1 Site Manifest
**File:** `/public/site.webmanifest`

Update:
```json
{
  "name": "Ukiah United Methodist Church - Signups",
  "short_name": "UUMC Signups",
  "description": "Signup systems for liturgists, food distribution, and church activities"
}
```

#### 6.2 Layout Metadata
**File:** `/src/app/layout.tsx`

Update metadata:
```typescript
export const metadata: Metadata = {
  title: 'Ukiah United Methodist Church - Signups',
  description: 'Sign up for liturgist services, food distribution, and more',
  // ... other updates
}
```

---

### 7. MIDDLEWARE & ROUTING

**File:** `/src/middleware.ts`

Current middleware only handles API rate limiting. No changes needed unless you want route-specific rate limits.

**Optional enhancement:**
```typescript
// Add different rate limits for different signup types
if (request.nextUrl.pathname.startsWith('/api/signup/liturgists')) {
  // Different rate limit
}
if (request.nextUrl.pathname.startsWith('/api/signup/food-distribution')) {
  // Different rate limit
}
```

---

### 8. TESTING

#### 8.1 Update E2E Tests
**File:** `/e2e/liturgist-signup.spec.ts`

1. Rename to `/e2e/signups.spec.ts`
2. Update URLs to include `/liturgists` path
3. Add new tests for `/food-distribution`

#### 8.2 Test Checklist
- [ ] Liturgist signup flow works at `/liturgists`
- [ ] Liturgist summary works at `/liturgists/schedule-summary`
- [ ] Food distribution signup works at `/food-distribution`
- [ ] Food distribution summary works at `/food-distribution/schedule-summary`
- [ ] Password gate works on all pages
- [ ] Landing page navigation works
- [ ] Both Airtable tables receive data correctly
- [ ] Email notifications send with correct domain

---

### 9. DOCUMENTATION UPDATES

Files to update:
- ✅ `README.md` - Complete rewrite for multi-signup system
- ✅ `AIRTABLE_SETUP.md` - Add food distribution table setup
- ✅ `VERCEL_DEPLOYMENT.md` - Update domain references
- ✅ `E2E_TESTING_GUIDE.md` - Update test URLs
- ✅ `LAUNCH_READY_SUMMARY.md` - Update launch checklist
- ✅ `PRE_LAUNCH_CHECKLIST.md` - Update pre-launch steps

---

## 🔄 EXECUTION ORDER

### Phase 1: Local Setup (AI Does Now)
1. ✅ Rename local directory
2. ✅ Create migration plan (this document)
3. ✅ Update package.json

### Phase 2: Airtable Setup (AI Does Now)
4. ✅ Attempt to create food-distribution table via API
5. ✅ Update environment variables structure
6. ✅ Update airtable.ts library for multi-table support

### Phase 3: Route Restructuring (AI Does Now)
7. ✅ Create new landing page at `/src/app/page.tsx`
8. ✅ Move liturgist code to `/src/app/liturgists/`
9. ✅ Clone to `/src/app/food-distribution/`
10. ✅ Create both schedule-summary pages

### Phase 4: Code Updates (AI Does Now)
11. ✅ Update all domain references
12. ✅ Update API routes for multi-table
13. ✅ Update types and interfaces
14. ✅ Update email templates
15. ✅ Update PWA manifest and metadata

### Phase 5: Documentation (AI Does Now)
16. ✅ Update all .md documentation files
17. ✅ Update README with new structure
18. ✅ Update test scripts

### Phase 6: Testing (AI Does Now)
19. ✅ Update E2E tests
20. ✅ Run local tests
21. ✅ Verify all routes work locally

### Phase 7: Human Tasks (You Do)
22. ⏳ Rename GitHub repo to `signups.ukiahumc.org`
23. ⏳ Update Git remote URL
24. ⏳ Push changes to GitHub
25. ⏳ Rename Vercel project
26. ⏳ Add `signups.ukiahumc.org` domain in Vercel
27. ⏳ Deploy to Vercel
28. ⏳ Update DNS records
29. ⏳ Test production deployment
30. ⏳ (Optional) Rename Airtable base

---

## 🔐 ENVIRONMENT VARIABLES

### Current (.env.local)
```env
AIRTABLE_PAT_TOKEN=pat14Fg5mn0nGDM0b...
AIRTABLE_BASE_ID=appmnQvqSb8lcHKz8
AIRTABLE_TABLE_NAME=liturgists.ukiahumc.org
ZOHO_USER=alerts@samuelholley.com
ZOHO_APP_PASSWORD=Smh_Ukiah2025@!
```

### New (.env.local)
```env
AIRTABLE_PAT_TOKEN=pat14Fg5mn0nGDM0b...
AIRTABLE_BASE_ID=appmnQvqSb8lcHKz8
AIRTABLE_LITURGISTS_TABLE=liturgists.ukiahumc.org
AIRTABLE_FOOD_TABLE=food-distribution.ukiahumc.org
ZOHO_USER=alerts@samuelholley.com
ZOHO_APP_PASSWORD=Smh_Ukiah2025@!
```

### Vercel Environment Variables
Add to Vercel project:
- `AIRTABLE_PAT_TOKEN`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_LITURGISTS_TABLE`
- `AIRTABLE_FOOD_TABLE`
- `ZOHO_USER`
- `ZOHO_APP_PASSWORD`

---

## 🚨 RISK MITIGATION

### Potential Issues
1. **Airtable API Permissions:** PAT token may not have schema modification permissions
   - **Mitigation:** If API fails, provide manual instructions for table creation

2. **GitHub Rename Timing:** Users may access old domain during migration
   - **Mitigation:** Set up redirects from old domain to new

3. **Data Loss:** Existing liturgist signups must be preserved
   - **Mitigation:** No changes to existing table structure or data

4. **Email Deliverability:** New domain may affect email reputation
   - **Mitigation:** Same email infrastructure, just updated URLs

5. **Cache Issues:** Browser/service worker caching old routes
   - **Mitigation:** Increment APP_VERSION constant, clear service worker cache

---

## ✅ POST-MIGRATION CHECKLIST

After deployment:
- [ ] Visit `signups.ukiahumc.org` - Landing page loads
- [ ] Visit `signups.ukiahumc.org/liturgists` - Liturgist signup works
- [ ] Visit `signups.ukiahumc.org/liturgists/schedule-summary` - Summary works
- [ ] Visit `signups.ukiahumc.org/food-distribution` - Food signup works
- [ ] Visit `signups.ukiahumc.org/food-distribution/schedule-summary` - Summary works
- [ ] Test liturgist signup → Check Airtable liturgists table
- [ ] Test food signup → Check Airtable food-distribution table
- [ ] Test email notifications for both types
- [ ] Test password gate on all protected pages
- [ ] Test on mobile devices
- [ ] Update church website to link to new domain
- [ ] Notify congregation of new URL
- [ ] Set up redirect from `liturgists.ukiahumc.org` to `signups.ukiahumc.org/liturgists`

---

## 📞 SUPPORT & ROLLBACK

### If Issues Arise
1. **Quick Fix:** Revert Vercel deployment to previous version
2. **DNS Rollback:** Point domain back to old deployment
3. **Data Integrity:** Both tables remain untouched, no data loss risk

### Contact
- **Developer:** AI (me) - available for immediate fixes
- **Church Admin:** Samuel Holley
- **Vercel Support:** support@vercel.com
- **Airtable Support:** support@airtable.com

---

## 🎯 GLOBAL NAVIGATION HEADER STRATEGY

### Implementation: Option 1 - Minimal Context-Aware Header

**Status:** ✅ IMPLEMENTED (November 23, 2025)

**Architecture Decision:** Context-aware header component that shows section-specific navigation with single "Back to All Signups" link.

**Component Created:** `/src/components/SectionHeader.tsx`

**Features:**
- 🔵 Blue header for `/liturgists` section
- 🟢 Green header for `/food-distribution` section
- ⬅️ Single "Back to All Signups" link (returns to `/`)
- 📱 Mobile-responsive (shows "Home" on small screens)
- 🚫 Hidden on homepage (landing page has no header)
- 🎨 Section-specific icons (book for liturgists, coin for food)

**Benefits:**
1. **Data Integrity:** Prevents cross-signup confusion
2. **User Focus:** Each workflow is independent
3. **Mobile-First:** Minimal header = more content space
4. **Scalable:** Easy to add more signup types

**Layout Integration:**
- Added to `/src/app/layout.tsx`
- Renders below main `<Header />` component
- Uses `usePathname()` to detect current section
- Automatically styled based on route

**User Flow:**
```
Homepage (/) → Choose Service
  ↓
/liturgists → Blue Header → "Back to All Signups"
  ↓
Homepage (/) → Choose Different Service
  ↓
/food-distribution → Green Header → "Back to All Signups"
```

**Files Modified:**
- `/src/components/SectionHeader.tsx` (created)
- `/src/app/layout.tsx` (added SectionHeader component)
- `/src/app/layout.tsx` (updated metadata for multi-signup platform)

---

## 🎉 SUCCESS CRITERIA

Migration is complete when:
✅ Both signup systems work independently  
✅ Both save to separate Airtable tables  
✅ Both have their own summary pages  
✅ Single landing page provides clear navigation  
✅ Context-aware navigation header implemented  
✅ All documentation updated  
✅ All tests passing  
✅ Deployed to production at `signups.ukiahumc.org`  
✅ Old domain redirects to new domain  

---

**Ready to execute? Let's begin! 🚀**

---

## 📝 POST-MIGRATION LESSONS LEARNED

**Updated:** November 23, 2025

### ✅ COMPLETED ENHANCEMENTS

#### 1. **Airtable Field Type Correction** (Nov 23, 2025)
**Problem:** Role field was Single Select (liturgist/backup) - too restrictive for multi-volunteer food distribution.

**Solution:** Changed Role field to **Long Text** type in Airtable.
- Allows flexible role values: `volunteer1`, `volunteer2`, `volunteer3`, `volunteer4`, `liturgist`, `backup`, `liturgist2`
- No dropdown constraints
- Food distribution uses `volunteer1-4`, liturgists use `liturgist/backup/liturgist2`

**Lesson:** When planning multi-table systems, consider field flexibility early. Long Text > Single Select for evolving use cases.

---

#### 2. **Progressive Disclosure UI for Food Distribution** (Nov 23, 2025)
**Problem:** Users wanted option to sign up 3-4 volunteers but initial UI showed all 4 columns (overwhelming).

**Solution:** Implemented **progressive disclosure pattern**:
- Initially show 2 volunteer columns
- "Add a third volunteer?" button (amber/yellow styling) reveals volunteer 3
- "Add a fourth volunteer?" button (orange styling) reveals volunteer 4
- Users opt-in to complexity only when needed

**Files Modified:**
- `/src/app/food-distribution/page.tsx` - Added `showExtraColumns` state, conditional rendering, progressive buttons

**Lesson:** Don't show all fields upfront. Progressive disclosure reduces cognitive load and improves UX for simple vs. complex signups.

---

#### 3. **Styled Modal System with Church Branding** (Nov 23, 2025)
**Problem:** Errors displayed via ugly `alert()` calls, no branding, poor UX.

**Solution:** Implemented **React-based modal system**:
- `errorModal` state: `{ show: boolean, title: string, message: string }`
- `successModal` state: `{ show: boolean, message: string }`
- Church logo in all modals (signup, error, success)
- Emoji indicators (✅ success, ❌ error)

**Lesson:** Never use `alert()` in production apps. Build branded, accessible modals with proper state management.

---

#### 4. **Automatic Error Logging to Vercel** (Nov 23, 2025)
**Problem:** Errors happened silently, no visibility into production issues.

**Solution:** Created `/api/report-error` endpoint that sends styled HTML error emails to `sam@samuelholley.com`.

**Lesson:** Build error reporting EARLY in development. Email notifications beat log diving for fast incident response.

---

#### 5. **Conditional Airtable Field Handling** (Nov 23, 2025)
**Problem:** 500 error on food distribution - `UNKNOWN_FIELD_NAME` for "Attendance Status".

**Solution:** "Attendance Status" field exists ONLY in Liturgists table. Added conditional field inclusion in `submitSignup()`.

**Lesson:** Multi-table systems need conditional field mapping. Validate table schemas differ and code accordingly.

---

#### 6. **Complete Email System Nomenclature Overhaul** (Nov 23, 2025)
**Problem:** All emails said "Liturgist Signup System" even for food distribution users.

**Solution:** Implemented **complete table-aware email system**:
- **Dynamic Sender Name:** `fromName` parameter - "UUMC Food Distribution" vs "UUMC Liturgist Scheduling"
- **Dynamic Subjects:** "Food Distribution Volunteer" vs "Liturgist" in all email subjects
- **Dynamic Body Content:** Added `systemName` parameter to email generation functions
- **Header Colors:** Orange (#ea580c) for food, Blue (#2c5282) for liturgist
- **Role Label Detection:** `volunteer1-4` → "Food Distribution Volunteer", `liturgist/backup` → "Liturgist/Backup Liturgist"

**Critical Bug Fixed:** Variable scope issue - `tableName` was declared inside try blocks, inaccessible in catch blocks for error emails. Moved declarations BEFORE try blocks.

**Lesson:** Multi-tenant email systems need comprehensive branding strategy. Update sender name, subjects, AND body content. Watch for variable scoping in error handlers.

---

### 🎯 ARCHITECTURAL PATTERNS ESTABLISHED

#### Pattern 1: **Multi-Table Routing Strategy**
```typescript
// URL Structure: /liturgists → table=liturgists, /food-distribution → table=food
const tableName = body.table === 'food' ? 'Food Distribution' : 'Liturgists'
```

#### Pattern 2: **Context-Aware Email System**
```typescript
const systemName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
generateEmail({ ...data, systemName })
sendEmail({ ...params, fromName: systemName })
```

#### Pattern 3: **Error Reporting Pipeline**
```typescript
// Frontend: Show modal + auto-report to /api/report-error
// Backend: Generate HTML email with stack trace → SMTP send
```

---

### 📚 KNOWLEDGE BASE FOR FUTURE MIGRATIONS

#### When Adding New Signup Type (e.g., Event Registration):

**Checklist:**
1. ✅ Create new Airtable table with appropriate schema
2. ✅ Add new env var: `AIRTABLE_EVENTS_TABLE`
3. ✅ Create route: `/src/app/events/page.tsx`
4. ✅ Update `TABLES` constant in `/src/lib/airtable.ts`
5. ✅ Add table detection to `/src/app/api/signup/route.ts`
6. ✅ Update email system with new systemName: `'UUMC Event Registration'`
7. ✅ Choose unique role prefix (e.g., `attendee1`, `speaker`) for GET handler detection
8. ✅ Add card to landing page (`/src/app/page.tsx`)
9. ✅ Update `SectionHeader.tsx` with new color scheme
10. ✅ Create E2E tests

**Estimated Time:** 2-3 hours for complete implementation

---

#### Common Pitfalls & Solutions:

| Pitfall | Solution |
|---------|----------|
| **Airtable field mismatch** | Use conditional field inclusion based on table type |
| **Variable scope in error handlers** | Declare variables BEFORE try blocks if needed in catch |
| **Email branding inconsistency** | Update sender name, subject, AND body content |
| **Role detection ambiguity** | Use unique prefixes per signup type (`volunteer*`, `liturgist*`, `attendee*`) |
| **Button width inconsistency** | Avoid `w-full` in grid layouts unless all buttons are full-width |
| **Alert fatigue** | Replace all `alert()` calls with branded modal system |
| **Silent errors** | Implement auto-reporting pipeline early in development |

---

### 🎓 KEY LEARNINGS SUMMARY

1. **Field Type Flexibility:** Long Text > Single Select for evolving multi-purpose systems
2. **Progressive Disclosure:** Show 2-3 fields initially, reveal more on demand
3. **Visual Consistency:** Match button widths, colors, spacing across similar components
4. **Modal > Alert:** Always use branded, stateful modals in production apps
5. **Error Reporting:** Build email notification pipeline BEFORE things break
6. **Conditional Fields:** Multi-table systems need if/else logic for field inclusion
7. **Email Branding:** Update sender, subject, AND body for complete context adaptation
8. **Variable Scoping:** Declare variables before try blocks if needed in catch blocks
9. **Test Data Management:** Use email aliases (`+test`) for test accounts
10. **Documentation First:** Create migration plans before executing large changes

---

**Migration Status: ✅ COMPLETE & PRODUCTION-READY**

Next steps: Scale pattern to additional signup types (events, classes, volunteer shifts, etc.)
