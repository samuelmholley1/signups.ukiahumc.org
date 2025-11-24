# Vercel Environment Variables Checklist

## Required Environment Variables

Go to: https://vercel.com/samuelmholley1s-projects/signups-ukiahumc-org/settings/environment-variables

### ✅ Check These Variables Are Set:

1. **AIRTABLE_PAT_TOKEN**
   - Value: (from your .env.local file)

2. **AIRTABLE_BASE_ID**
   - Value: (from your .env.local file)

3. **AIRTABLE_LITURGISTS_TABLE**
   - Value: `Liturgists`

4. **AIRTABLE_FOOD_TABLE** ⚠️ **LIKELY MISSING**
   - Value: `Food Distribution`

5. **ZOHO_USER**
   - Value: (from your .env.local file)

6. **ZOHO_APP_PASSWORD**
   - Value: (from your .env.local file)

## How to Add Missing Variable

1. Go to Vercel Dashboard
2. Select your project: **signups-ukiahumc-org**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key**: `AIRTABLE_FOOD_TABLE`
   - **Value**: `Food Distribution`
   - **Environment**: Check all (Production, Preview, Development)
6. Click **Save**
7. Go to **Deployments** tab
8. Click **•••** menu on latest deployment
9. Click **Redeploy**

## Why This Is Causing 500 Error

The `/api/signup` route expects `AIRTABLE_FOOD_TABLE` to be set. When it's missing:
- The code tries to use the table name
- Airtable API returns an error because the table name is undefined
- This causes a 500 Internal Server Error

## Verify After Adding

1. Check Vercel logs after redeployment
2. Try signing up again
3. Check for any remaining errors

---

**Next Step**: Add `AIRTABLE_FOOD_TABLE=Food Distribution` to Vercel environment variables and redeploy.
