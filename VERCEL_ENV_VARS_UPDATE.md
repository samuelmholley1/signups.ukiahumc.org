# Vercel Environment Variables Update

## 🎯 WHAT YOU NEED TO DO IN VERCEL

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com
2. Select your project (currently named for liturgists)
3. Go to **Settings** → **Environment Variables**

---

### Step 2: Update/Add These Environment Variables

#### UPDATE These Variables:
```
AIRTABLE_LITURGISTS_TABLE = Liturgists
```

#### ADD This New Variable:
```
AIRTABLE_FOOD_TABLE = Food Distribution
```

#### REMOVE This Variable (if it exists):
```
AIRTABLE_TABLE_NAME (delete this one - it's obsolete)
```

#### KEEP These Variables Unchanged:
- `AIRTABLE_PAT_TOKEN` (from your `.env.local`)
- `AIRTABLE_BASE_ID` (from your `.env.local`)
- `ZOHO_USER` (from your `.env.local`)
- `ZOHO_APP_PASSWORD` (from your `.env.local`)

---

### Step 3: Apply to All Environments

Make sure to add these to:
- ✅ Production
- ✅ Preview (optional but recommended)
- ✅ Development (optional but recommended)

---

### Step 4: Redeploy

After updating environment variables:
1. Go to **Deployments** tab
2. Click the **︙** (three dots) on the latest deployment
3. Select **Redeploy**
4. OR just push new code and it will auto-deploy with new env vars

---

## ✅ VERIFICATION

After deployment, check that:
- [ ] Liturgists table works (existing functionality)
- [ ] Food Distribution table is accessible
- [ ] No errors in Vercel logs

---

## 📋 COMPLETE ENVIRONMENT VARIABLE LIST

Your Vercel environment variables should include:

1. `AIRTABLE_PAT_TOKEN` (from `.env.local`)
2. `AIRTABLE_BASE_ID` = `appmnQvqSb8lcHKz8`
3. `AIRTABLE_LITURGISTS_TABLE` = `Liturgists`
4. `AIRTABLE_FOOD_TABLE` = `Food Distribution`
5. `ZOHO_USER` (from `.env.local`)
6. `ZOHO_APP_PASSWORD` (from `.env.local`)

**Total: 6 environment variables**

---

## 🔒 SECURITY CHECK

✅ None of these secrets are committed to Git  
✅ `.env.local` is in `.gitignore`  
✅ All sensitive data is in environment variables only  

---

## 🆘 TROUBLESHOOTING

**If you see errors after deployment:**

1. **"Table not found"** - Check that table names match exactly:
   - `Liturgists` (capital L, no .ukiahumc.org)
   - `Food Distribution` (capital F, capital D, with space)

2. **"Invalid permissions"** - PAT token may have expired
   - Generate new token at https://airtable.com/create/tokens
   - Update `AIRTABLE_PAT_TOKEN` in Vercel
   - Redeploy

3. **"Base not found"** - Base ID is incorrect
   - Verify: `appmnQvqSb8lcHKz8`
   - Update if needed and redeploy

---

**Created:** November 23, 2025
