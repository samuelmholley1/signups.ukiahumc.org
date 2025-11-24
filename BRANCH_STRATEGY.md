# Branch Strategy - Production vs Testing

## Overview

This repository maintains two permanent branches with **identical code** except for email routing configuration. This allows safe testing without accidentally spamming stakeholders during development.

---

## Branch Purposes

### `main` Branch (Production)
- **Purpose**: Live production environment
- **Email Configuration**: Trudy Morgan CC'd on food distribution emails
- **Deployment**: Auto-deploys to `signups.ukiahumc.org`
- **Audience**: Real church members and volunteers
- **Testing**: ⚠️ **USE SPARINGLY** - real emails sent to stakeholders

### `testing-trudy-email-flow` Branch (Testing/Development)
- **Purpose**: Safe testing and development environment  
- **Email Configuration**: Sam only (no Trudy CC'd)
- **Deployment**: Preview URL on Vercel (changes with each commit)
- **Audience**: Developers and testers only
- **Testing**: ✅ **SAFE TO TEST** - no stakeholder emails sent

---

## Email Routing Differences

### Production (main)
```typescript
// Food Distribution emails
ccRecipients = isTrudySigningUp ? undefined : 'morganmiller@pacific.net'
bccRecipients = emailGoesToSam ? undefined : 'sam@samuelholley.com'

// Result: Trudy gets CC'd, Sam gets BCC'd
```

### Testing (testing-trudy-email-flow)
```typescript
// Food Distribution emails  
ccRecipients = emailGoesToSam ? undefined : 'sam@samuelholley.com'
bccRecipients = undefined

// Result: Sam only gets CC'd, no Trudy
```

### Liturgist Emails (Identical in Both Branches)
```typescript
// Liturgists: Sam is CC'd (not BCC'd), no Trudy
ccRecipients = isSamSigningUp ? undefined : 'sam@samuelholley.com'
bccRecipients = undefined

// Result: Same in both branches - Sam CC'd only
```

---

## Development Workflow

### 1. Making Changes

**Start on testing branch:**
```bash
git checkout testing-trudy-email-flow
# Make your changes
git add .
git commit -m "feat: Add new feature"
git push origin testing-trudy-email-flow
```

### 2. Testing

- Go to Vercel dashboard
- Find preview deployment for `testing-trudy-email-flow` branch
- Test thoroughly - no stakeholder emails will be sent
- Verify all functionality works

### 3. Deploying to Production

**When ready for production:**
```bash
# Switch to main
git checkout main

# Merge testing branch
git merge testing-trudy-email-flow --no-ff -m "Merge: [feature description]"

# Verify Trudy's email is still present (merge doesn't overwrite)
grep "morganmiller@pacific.net" src/app/api/signup/route.ts

# Push to production
git push origin main
```

**Important**: The merge will keep Trudy's email in `main` because:
- Testing branch has different email logic
- Git recognizes this as intentional divergence
- Merge keeps `main`'s version of the email configuration

### 4. Keeping Branches Synced

Both branches should have identical code **except** for email routing:

```bash
# After merging to main, verify both branches are in sync
git log main -1 --oneline
git log testing-trudy-email-flow -1 --oneline

# If testing branch needs other updates from main:
git checkout testing-trudy-email-flow
git merge main --no-ff -m "Sync with main"
# Resolve any email config conflicts by keeping testing branch version
git push origin testing-trudy-email-flow
```

---

## Conflict Resolution

### If Email Config Conflicts During Merge

When merging, if you get conflicts in email configuration:

```bash
# During merge conflict
git status  # Shows conflicted files

# Edit src/app/api/signup/route.ts
# Keep the email configuration appropriate for the target branch:
# - main: Keep Trudy's email
# - testing: Keep Sam-only email

git add src/app/api/signup/route.ts
git commit -m "Resolve email config conflict"
```

**Rule of thumb**: 
- Merging TO `main`: Keep Trudy's email
- Merging TO `testing-trudy-email-flow`: Keep Sam-only email

---

## Branch Protection Rules

### DO:
✅ Keep `testing-trudy-email-flow` branch **permanently**
✅ Always test on testing branch first
✅ Merge testing → main when ready for production
✅ Document any changes to email routing logic
✅ Verify email recipients after each merge

### DON'T:
❌ Don't delete `testing-trudy-email-flow` branch
❌ Don't test directly on `main` (you'll email Trudy!)
❌ Don't make changes directly on `main` (use testing first)
❌ Don't merge `main` → testing without checking email config
❌ Don't assume email config stays after merge (always verify)

---

## Verification Checklist

After deploying to production (`main`):

- [ ] Trudy's email present in all 3 locations in `src/app/api/signup/route.ts`:
  - [ ] Line ~166-171: POST signup handler (food distribution)
  - [ ] Line ~353-358: GET email-link cancel handler (food distribution)
  - [ ] Line ~723-728: DELETE cancel handler (food distribution)

```bash
# Quick verification command:
grep -n "morganmiller@pacific.net" src/app/api/signup/route.ts

# Should show 6 matches (3 locations, 2 lines each)
```

After deploying to testing (`testing-trudy-email-flow`):

- [ ] Trudy's email NOT present in food distribution handlers
- [ ] Sam's email is CC'd instead

```bash
# Verify testing branch has Sam-only:
git checkout testing-trudy-email-flow
grep -A 5 "Food Distribution: Sam only" src/app/api/signup/route.ts
```

---

## Error Handling (Identical in Both Branches)

Error notification emails **always** go to Sam only, regardless of branch:

```typescript
// Error emails (same in both branches)
await sendEmail({
  to: 'sam@samuelholley.com',
  subject: '🚨 ERROR: ...',
  html: errorEmailHtml
})
```

This includes:
- Signup failures
- Cancellation failures  
- Backfill validation failures
- Network/server errors
- Client-side error reports

---

## Finding Testing Preview URL

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select project: `signups-ukiahumc-org`
3. Click "Deployments" tab
4. Find deployment for `testing-trudy-email-flow` branch
5. Click deployment to get preview URL
6. Use that URL for safe testing

**Note**: Preview URL changes with each commit to testing branch

---

## Common Scenarios

### Scenario 1: Quick Bug Fix

```bash
# Fix on testing first
git checkout testing-trudy-email-flow
# Fix the bug
git commit -am "fix: Resolve issue"
git push

# Test on preview URL

# Deploy to production
git checkout main
git merge testing-trudy-email-flow --no-ff -m "fix: Resolve issue"
git push origin main
```

### Scenario 2: New Feature Development

```bash
# Develop on testing branch
git checkout testing-trudy-email-flow
# Build feature over multiple commits
git commit -am "feat: Add feature part 1"
git commit -am "feat: Add feature part 2"
git push

# Test thoroughly on preview URL

# Deploy to production when ready
git checkout main
git merge testing-trudy-email-flow --no-ff -m "feat: Complete new feature"
git push origin main
```

### Scenario 3: Hotfix in Production

If you must fix something directly on `main`:

```bash
git checkout main
# Make urgent fix
git commit -am "hotfix: Critical issue"
git push origin main

# Immediately sync to testing branch
git checkout testing-trudy-email-flow
git merge main --no-ff -m "Sync hotfix from main"
# Resolve email config conflicts if needed
git push origin testing-trudy-email-flow
```

---

## Architecture Decision Record

**Why maintain two branches instead of environment variables?**

1. **Simplicity**: Email configuration is code-level, not environment-level
2. **Safety**: Impossible to accidentally email Trudy from testing URL
3. **Git-based**: Configuration is version controlled and auditable
4. **Preview URLs**: Each testing commit gets its own preview with correct config
5. **No secrets**: Email addresses aren't sensitive, can be in code
6. **Clarity**: Obvious which environment you're in by branch name

**Alternative considered and rejected**: Environment variables (`STAKEHOLDER_EMAIL`)
- ❌ Requires Vercel config for each preview deployment
- ❌ More complex to manage
- ❌ Harder to verify which config is active
- ✅ Current approach is simpler and safer

---

## Troubleshooting

### "I accidentally merged and lost Trudy's email!"

```bash
# On main branch
git log --oneline -10  # Find commit before merge
git revert HEAD  # Revert the bad merge
# Or restore from specific commit:
git checkout <commit-hash> -- src/app/api/signup/route.ts
git commit -m "Restore Trudy's email configuration"
git push origin main
```

### "Testing branch has old code"

```bash
git checkout testing-trudy-email-flow
git merge main --no-ff -m "Sync with production"
# Keep testing branch email config if conflicts
git push origin testing-trudy-email-flow
```

### "Email config got accidentally changed on testing branch"

```bash
git checkout testing-trudy-email-flow
# Restore email config to Sam-only version
# Edit src/app/api/signup/route.ts manually
# Or cherry-pick from earlier commit:
git checkout <old-commit> -- src/app/api/signup/route.ts
git commit -m "Restore Sam-only email config on testing branch"
git push origin testing-trudy-email-flow
```

---

## Documentation Updates

When making changes to email routing logic:

1. Update this document (`BRANCH_STRATEGY.md`)
2. Update `RED_TEAM_PROTOCOL.md` if new failure modes discovered
3. Update `README.md` with any user-facing changes
4. Add notes to commit message about email behavior changes

---

## Quick Reference Commands

```bash
# Switch to testing
git checkout testing-trudy-email-flow

# Switch to production  
git checkout main

# Deploy testing changes to production
git checkout main && git merge testing-trudy-email-flow --no-ff && git push

# Verify Trudy's email is present
grep "morganmiller@pacific.net" src/app/api/signup/route.ts | wc -l  
# Should output: 6

# Verify Sam-only on testing
git checkout testing-trudy-email-flow
grep "Food Distribution: Sam only" src/app/api/signup/route.ts
# Should find matches
```

---

**Last Updated**: November 24, 2025  
**Maintained By**: Development Team  
**Status**: Active - both branches in production use
