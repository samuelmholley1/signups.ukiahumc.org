# Red Team Protocol - UX/UI/Functionality Testing

## Purpose
Document red team failures and lessons learned to improve testing protocols for UX, UI, functionality, bugs, and edge cases.

---

## Red Team Failure Log

### Failure #1: Cache Invalidation Not Verified (November 24, 2025)

**Severity**: 🔴 CRITICAL

**What Happened**:
- User explicitly asked: "DOES THE CANCEL AND SIGN UP SHOW THE NEW DATA INSTANTLY ON THE SCREEN?"
- Agent responded: "Yes! The cancel and signup now show new data instantly"
- **Reality**: Cache was serving stale data with 1-hour TTL. No cache invalidation in POST/DELETE handlers.
- User discovered issue during first real-world test the next morning

**Root Cause**:
- Agent checked CLIENT-SIDE code (`fetchSignups()` called after signup)
- Agent did NOT trace through: Client → API → Cache → Airtable
- Agent did NOT verify cache invalidation logic existed in `/api/signup` handlers
- Agent did NOT test in deployed environment with actual data flow

**Impact**:
- User wasted morning testing time
- Loss of trust in "ready for production" assessment
- Real users would have seen stale signup data for up to 1 hour

**What Should Have Been Done**:
1. ✅ Trace FULL data flow when user asks about data freshness
2. ✅ Check cache invalidation exists in ALL mutation endpoints (POST/DELETE/PUT)
3. ✅ Test in production/staging environment, not just local
4. ✅ Check Vercel logs for cache HIT/MISS patterns
5. ✅ Ask user to test a signup and verify immediate update

**Fix Applied**:
- Added `serviceCache.invalidate()` to POST and DELETE handlers
- Invalidates ALL cache keys for table type (e.g., all `food-*` keys)
- Verified in Vercel logs that cache invalidation happens

**Protocol Update**:
Added to checklist: "For any question about data freshness or real-time updates, trace full data flow including caching layer"

---

### Failure #2: Red Team Audit Became Stale After Code Changes (November 24, 2025)

**Severity**: 🟡 HIGH

**What Happened**:
- Comprehensive red team audits completed for Food Distribution and Liturgist systems
- ServiceCache system added AFTER audits for performance optimization
- Audits never re-run after adding cache
- Cache invalidation not implemented in mutation handlers

**Root Cause**:
- No protocol for re-auditing after significant architectural changes
- Cache was treated as "just performance" not "affects correctness"
- Audit documents became outdated snapshots

**Impact**:
- Audit gave false confidence that system was production-ready
- Critical cache invalidation bug went undetected

**What Should Have Been Done**:
1. ✅ Re-run full audit checklist after ANY architectural change
2. ✅ Treat caching as correctness concern, not just performance
3. ✅ Tag audit documents with "last verified" date and commit hash
4. ✅ List assumptions in audit (e.g., "assumes no caching layer")

**Fix Applied**:
- Added cache invalidation to mutation handlers
- Will update audit documents with cache testing section

**Protocol Update**:
Added to checklist: "After ANY architectural change (caching, middleware, auth, etc.), re-run relevant audit sections"

---

### Failure #3: Responsive Layout Changes Broke Volunteer Column Logic (November 24, 2025)

**Severity**: 🟡 HIGH

**What Happened**:
- User requested: Remove horizontal scrolling, make responsive
- Agent split volunteer 3/4 columns for desktop vs mobile rendering
- Agent updated HEADER column visibility logic correctly
- Agent FORGOT to update CELL rendering logic to match
- Result: Volunteer 3 header showed, but cell checked wrong condition, Sign Up button never appeared

**Code Difference**:
```tsx
// HEADER (correct):
{signups.some(s => s.volunteer1 && s.volunteer2) && <th>Vol 3</th>}

// CELL (wrong):
{signups.some(s => s.volunteer3) && <td>Vol 3 cell</td>}
// ☝️ This only shows if vol3 EXISTS, not if it's AVAILABLE
```

**Root Cause**:
- Made complex refactor (splitting columns for responsive layout)
- Updated one piece of logic but not corresponding piece
- Did not test the actual user flow after change

**Impact**:
- Volunteer 3 column appeared but was empty (no Sign Up button)
- User could not sign up for volunteer 3 position
- User had to debug and report issue

**What Should Have Been Done**:
1. ✅ When splitting conditional rendering, ensure ALL related pieces updated together
2. ✅ Use same variable/condition for header AND cell rendering
3. ✅ Test user flow after ANY layout refactor
4. ✅ Add debug logging immediately when making complex changes

**Fix Applied**:
- Updated cell rendering to match header logic
- Added console debug logging to show what conditions are being checked
- Ensured header and cell use identical `signups.some()` checks

**Protocol Update**:
Added to checklist: "For any conditional rendering change, grep for ALL instances of that condition and update together"

---

### Failure #4: Column Width Inconsistency After Responsive Changes (November 24, 2025)

**Severity**: 🟢 MEDIUM

**What Happened**:
- After making columns responsive, volunteer 4 Sign Up button wrapped to 2 lines
- Volunteer 4 column was narrower than volunteers 1-3
- Applied `w-64` to headers but forgot to apply to `<td>` cells

**Root Cause**:
- Partial application of width classes (headers only, not cells)
- Did not verify rendered output matched intended design

**Impact**:
- Inconsistent column widths
- Button text wrapping looked unprofessional
- User had to report issue

**What Should Have Been Done**:
1. ✅ Apply width classes to BOTH `<th>` AND `<td>` elements
2. ✅ Visually verify rendered output at different viewport sizes
3. ✅ Check button text doesn't wrap at intended column widths

**Fix Applied**:
- Added `w-64` class to all volunteer `<td>` cells (not just `<th>`)
- All columns now consistently 256px wide

**Protocol Update**:
Added to checklist: "For any width/layout changes, verify both headers AND cells have consistent classes"

---

### Failure #5: Vercel Deployment Protection Blocked API and Image Requests (November 24, 2025)

**Severity**: 🔴 CRITICAL

**What Happened**:
- User tested signup on Vercel preview deployment URL
- Got "Network Error - Unable to connect to the server" modal
- Logo images showed placeholder (broken image icon)
- Console showed 401 Unauthorized errors:
  - `POST /api/signup` → 401
  - `GET /_next/image?url=/logo-for-church-larger.jpg` → 401
  - `POST /api/report-error` → 401
- Error: `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`

**Root Cause**:
- Vercel preview deployments have **Deployment Protection** enabled
- This requires authentication to access ANY resource on the preview URL
- Next.js `<Image>` component uses Vercel's Image Optimization API (`/_next/image`)
- Image Optimization API endpoint treated as separate request without auth cookies
- API routes also blocked by same protection
- System returned HTML error page instead of JSON, causing parse errors

**Impact**:
- Complete signup system failure on preview deployments
- User could not test volunteer 3 signup after backfill worked correctly
- Misleading error message ("Network Error") instead of auth issue
- Broke all user-facing functionality on preview URLs

**What Should Have Been Done**:
1. ✅ Use regular `<img>` tags instead of Next.js `<Image>` for simple logos
2. ✅ Test on actual production domain, not preview URLs with protection
3. ✅ Document that preview URLs require Vercel auth for ALL requests
4. ✅ Add deployment protection bypass for specific routes if needed
5. ✅ Check for 401 responses and show appropriate error messages

**Fix Applied**:
- Replaced all `<Image>` components with `<img>` tags in food-distribution page
- Removed Next.js Image import
- Images now served directly from `/public` without optimization
- Bypasses Vercel Image Optimization API entirely

**Why This Happened**:
- Used Next.js best practice (`<Image>` component) without considering deployment constraints
- Didn't realize Image Optimization is a separate API endpoint that needs auth
- Preview URL testing assumed all resources would work if page loaded

**Protocol Update**:
Added to checklist: "When using Vercel preview deployments, test with regular `<img>` tags or disable deployment protection for testing"

---

### Failure #6: Branch/Environment Strategy Not Documented (November 24, 2025)

**Severity**: 🟢 MEDIUM

**What Happened**:
- User wanted to test without emailing stakeholder (Trudy)
- Used preview branch deployment with protection enabled
- Got 401 errors on API calls and images
- Confusion about which URL to use for testing

**Root Cause**:
- No clear documentation of branch strategy
- No documentation of which environment serves which purpose
- Vercel deployment protection not understood or configured

**Impact**:
- Testing friction - harder to iterate quickly
- Risk of accidentally spamming stakeholders during development
- Unclear which URL is safe for testing vs production

**What Should Have Been Done**:
1. ✅ Document branch strategy in README
2. ✅ Configure Vercel deployment protection appropriately
3. ✅ Clarify: `main` = production (emails stakeholders), `testing-*` branches = no stakeholder emails
4. ✅ Keep testing branches open permanently for safe iteration

**Solution**:
- Created branch strategy:
  - `main` = Production (Trudy CC'd on food distribution emails)
  - `testing-trudy-email-flow` = Testing (Sam only, no Trudy)
  - Both branches identical except email destinations
- Documented in conversation, but should be in README

**Protocol Update**:
Added to checklist: "Document branch/environment strategy and email routing differences in README"

---

## Red Team Testing Protocol v2.0

### Pre-Deployment Checklist

#### Branch & Environment Strategy
- [ ] **Document branch purposes** in README
  - Which branch is production?
  - Which branches are safe for testing?
  - What differs between branches? (email destinations, etc.)
- [ ] **Configure Vercel deployment protection**
  - Disable protection on testing branches OR
  - Document how to authenticate for preview URLs
- [ ] **Email routing differences documented**
  - Which emails go where in each branch?
  - How to avoid spamming stakeholders during testing?

#### Deployment Environment
- [ ] **Test on actual production domain**, not preview URLs
- [ ] **Check Vercel Deployment Protection** settings
  - If enabled, verify API routes bypass protection OR use production URL
  - If enabled, consider using `<img>` instead of `<Image>` for static assets
- [ ] **Test 401/403 responses** display appropriate error messages
- [ ] **Verify image loading** in deployed environment
  - Check browser console for 401 errors on image requests
  - Test both Next.js `<Image>` and regular `<img>` tags

#### Data Flow & Caching
- [ ] **Trace full data flow** for any data freshness question
  - Client → API Route → Cache Layer → Database → Response → Cache Update
- [ ] **Verify cache invalidation** exists in ALL mutation endpoints
  - POST handlers: Clear relevant cache keys
  - DELETE handlers: Clear relevant cache keys
  - PUT/PATCH handlers: Clear relevant cache keys
- [ ] **Check cache TTL** is reasonable for use case
- [ ] **Test cache behavior** in deployed environment
  - Create record → Verify appears immediately
  - Update record → Verify changes appear immediately
  - Delete record → Verify disappears immediately
- [ ] **Check Vercel logs** for cache HIT/MISS patterns

#### Conditional Rendering & Layout
- [ ] **Find ALL instances** of conditional rendering for feature
  - Headers, cells, mobile cards, desktop columns
- [ ] **Verify conditions match** across all instances
  - Same `signups.some()` logic
  - Same state variables checked
- [ ] **Test user flows** after ANY layout refactor
  - Can user complete primary actions?
  - Are buttons/inputs accessible?
- [ ] **Add debug logging** for complex conditional logic
- [ ] **Check responsive breakpoints**
  - Mobile (< 640px)
  - Tablet (640px - 1023px)
  - Desktop (≥ 1024px)

#### Styling Consistency
- [ ] **Apply width classes** to both headers AND cells
- [ ] **Verify equal column widths** before and after data population
- [ ] **Check button text** doesn't wrap unexpectedly
- [ ] **Test with empty state** (no data)
- [ ] **Test with full state** (all columns filled)
- [ ] **Check text alignment** (centered/left/right) is consistent

#### Real-Time Updates
- [ ] **Create record** → Does it appear immediately?
- [ ] **Update record** → Do changes appear immediately?
- [ ] **Delete record** → Does it disappear immediately?
- [ ] **Check multiple users** → Do updates propagate?
- [ ] **Verify loading states** show during operations

#### Edge Cases
- [ ] **Empty states** (no data in table)
- [ ] **Single record** (one row only)
- [ ] **Maximum capacity** (all slots filled)
- [ ] **Concurrent actions** (two users signing up simultaneously)
- [ ] **Network errors** (slow/failed API calls)
- [ ] **Invalid data** (missing fields, wrong types)

#### User Experience
- [ ] **No horizontal scrolling** at any viewport size
- [ ] **Touch targets ≥ 44px** for mobile (Apple HIG)
- [ ] **Buttons stay on one line** at intended widths
- [ ] **Loading indicators** for async operations
- [ ] **Success/error messages** clear and actionable
- [ ] **Confirm destructive actions** (delete, cancel)

### When to Re-Audit

Trigger full or partial re-audit when:

1. **Architectural Changes**
   - Adding/modifying caching layer
   - Adding middleware
   - Changing authentication
   - Adding real-time features (websockets, SSE)

2. **Data Model Changes**
   - New database tables
   - Schema modifications
   - New relationships
   - Changing data sources

3. **Major Feature Additions**
   - New user flows
   - New pages/routes
   - New API endpoints
   - New external integrations

4. **Responsive/Layout Changes**
   - Changing breakpoints
   - Adding/removing columns
   - Modifying conditional rendering
   - Changing grid/flex layouts

### Audit Document Maintenance

Each audit document should include:

```markdown
## Audit Metadata
- **Last Verified**: [Date]
- **Commit Hash**: [Git SHA]
- **Verified By**: [Agent/Human]
- **System State**: [Production/Staging/Local]
- **Assumptions**: 
  - List key assumptions about architecture
  - List features NOT covered by this audit
  - List known limitations

## Re-Audit Triggers
- [ ] If caching layer modified
- [ ] If [specific feature] changed
- [ ] After any schema changes
```

### Testing in Production

For critical features:
1. ✅ Deploy to staging first
2. ✅ Test actual user flows in staging
3. ✅ Check server logs (Vercel/etc)
4. ✅ Verify database state after operations
5. ✅ Test with multiple users/browsers
6. ✅ Only mark "ready for production" after staging verification

---

## Lessons Learned Summary

### Key Principles

1. **"Works on my machine" is not enough**
   - Test in deployed environment
   - Verify with actual data flow
   - Check production logs

2. **Trace the full stack for data questions**
   - Don't stop at client code
   - Follow data through cache, API, database
   - Verify invalidation/update logic

3. **Keep audits synchronized with code**
   - Re-audit after architectural changes
   - Tag audits with date and commit
   - List assumptions explicitly

4. **Update related code together**
   - When splitting rendering logic, update ALL pieces
   - Use same conditions for headers and cells
   - Grep for all instances before changing

5. **Verify visually, not just in code**
   - Check rendered output at all breakpoints
   - Ensure buttons don't wrap
   - Test empty and full states

---

## Future Protocol Improvements

### Automated Testing
- [ ] Add E2E test for cache invalidation
- [ ] Add visual regression tests for responsive layouts
- [ ] Add test for concurrent user actions
- [ ] Add test for real-time update propagation

### Process Improvements
- [ ] Create "deployment readiness checklist"
- [ ] Require staging verification before "production ready" claim
- [ ] Add "trace data flow" step to ALL data freshness questions
- [ ] Create template for audit document metadata

### Documentation
- [ ] Document cache invalidation strategy
- [ ] Document responsive layout breakpoints
- [ ] Create architecture diagram showing data flow
- [ ] Document all conditional rendering patterns

---

**Version**: 2.0  
**Last Updated**: November 24, 2025  
**Status**: Active - Updated after cache invalidation incident
