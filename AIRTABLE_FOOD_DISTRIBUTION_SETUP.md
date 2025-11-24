# Airtable Food Distribution Table Setup

## ⚠️ MANUAL SETUP REQUIRED

The Airtable PAT token does not have permissions to create tables via API. You must create this table manually in the Airtable web interface.

## 📋 Instructions

### Step 1: Open Your Airtable Base

1. Go to https://airtable.com
2. Open your base: **Base ID** `appmnQvqSb8lcHKz8`
3. Look for the existing table named `liturgists.ukiahumc.org`

### Step 2: Create New Table

1. Click the **"+"** button or **"Add or import"** next to your existing table tabs
2. Choose **"Create empty table"**
3. Name the table: `food-distribution`

### Step 3: Create Fields

Delete any default fields Airtable creates, then add these fields **in this exact order**:

#### Field 1: Service Date
- **Field Name:** `Service Date`
- **Field Type:** `Date`
- **Options:**
  - Date format: `Local` (M/D/YYYY)
  - Include time: ❌ (unchecked)
  - Time zone: `America/Los_Angeles`

#### Field 2: Display Date
- **Field Name:** `Display Date`
- **Field Type:** `Single line text`

#### Field 3: Name
- **Field Name:** `Name`
- **Field Type:** `Single line text`

#### Field 4: Email
- **Field Name:** `Email`
- **Field Type:** `Email`

#### Field 5: Phone
- **Field Name:** `Phone`
- **Field Type:** `Phone number`

#### Field 6: Role
- **Field Name:** `Role`
- **Field Type:** `Long text`
- **Note:** Plain text field allows app to assign any volunteer slot number (volunteer1, volunteer2, volunteer3, volunteer4)

#### Field 7: Notes
- **Field Name:** `Notes`
- **Field Type:** `Long text`
- **Options:**
  - Enable rich text formatting: ✅ (optional)

#### Field 8: Submitted At
- **Field Name:** `Submitted At`
- **Field Type:** `Date`
- **Options:**
  - Date format: `Local` (M/D/YYYY)
  - Include time: ✅ (checked)
  - Time zone: `America/Los_Angeles`
  - Use the same time zone for all collaborators: ✅

### Step 4: Verify Table Structure

Your table should now have exactly these 8 fields in this order:

| # | Field Name | Field Type |
|---|------------|------------|
| 1 | Service Date | Date (no time) |
| 2 | Display Date | Single line text |
| 3 | Name | Single line text |
| 4 | Email | Email |
| 5 | Phone | Phone number |
| 6 | Role | Long text (app-controlled values) |
| 7 | Notes | Long text |
| 8 | Submitted At | Date with time |

### Step 5: Add Test Record (Optional)

Test that the table works by manually adding a record:

- **Service Date:** `2025-12-06`
- **Display Date:** `December 6, 2025`
- **Name:** `Test Volunteer`
- **Email:** `test@example.com`
- **Phone:** `707-555-1234`
- **Role:** `volunteer1`
- **Notes:** `Test record - can be deleted`
- **Submitted At:** (will auto-fill when created)

### Step 6: Update Environment Variables

After creating the table, make sure your `.env.local` file includes:
- `AIRTABLE_LITURGISTS_TABLE=liturgists.ukiahumc.org`
- `AIRTABLE_FOOD_TABLE=food-distribution`

Also update in Vercel:
1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `AIRTABLE_LITURGISTS_TABLE` = `liturgists.ukiahumc.org`
   - `AIRTABLE_FOOD_TABLE` = `food-distribution`
5. Remove (if exists): `AIRTABLE_TABLE_NAME`
6. Redeploy

## ✅ Verification

Once created, verify the table:

1. **Table name is exactly:** `Food Distribution` (title case with space)
2. **All 8 fields exist** with correct names and types
3. **Role field is Long text type** (not Single select)
4. **Both date fields use Pacific time zone**

## 🎯 Next Steps

After creating this table:
- ✅ The app will automatically connect to it via environment variables
- ✅ Food distribution signups will be saved here
- ✅ The code is already configured to use this table

## 🆘 Troubleshooting

**Can't find the base?**
- Make sure you're logged into the correct Airtable account
- Base ID: `appmnQvqSb8lcHKz8`

**Table name doesn't match?**
- Must be exactly: `food-distribution` (no spaces, lowercase)
- If you named it differently, update `.env.local` and Vercel env vars

**Fields not matching?**
- Field names are case-sensitive
- Use exactly the names listed above
- "Service Date" ≠ "service date" ≠ "ServiceDate"

---

**After completing these steps, the food distribution system will be fully operational! 🎉**
