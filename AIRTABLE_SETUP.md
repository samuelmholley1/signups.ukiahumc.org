# Airtable Setup Instructions

## ✅ SETUP COMPLETED BY ENGINEER

The following has been installed and configured:
- ✅ Airtable package installed
- ✅ API integration code created
- ✅ Signup endpoint configured
- ✅ Frontend connected to Airtable

---

## 🔧 YOUR CONFIGURATION NEEDED

### Step 1: Get Your Airtable Credentials

1. **Get your API Token:**
   - Go to https://airtable.com/create/tokens
   - Click "Create new token"
   - Name it: "Liturgist Signup App"
   - Add these scopes:
     - `data.records:read`
     - `data.records:write`
   - Add access to your "Liturgist Signups" base
   - Click "Create token"
   - **COPY THE TOKEN** (starts with `pat...`)

2. **Get your Base ID:**
   - Go to https://airtable.com/api
   - Click on your "Liturgist Signups" base
   - The Base ID is shown in the introduction (starts with `app...`)
   - Or look in the URL: `https://airtable.com/[BASE_ID]/api/docs`

### Step 2: Add Credentials to .env.local

Open the file `.env.local` in your project and add your credentials:

```env
AIRTABLE_PAT_TOKEN=your_pat_token_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_TABLE_NAME=liturgists.ukiahumc.org
```

Replace with your actual values:

```env
AIRTABLE_PAT_TOKEN=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_TABLE_NAME=liturgists.ukiahumc.org
```

### Step 3: Restart the Dev Server

After adding your credentials, restart the server:

```bash
npm run dev
```

---

## 📋 AIRTABLE TABLE STRUCTURE

### Liturgists Table

Your **Liturgists** Airtable table should have these fields:

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| Service Date | Date | Date only, Pacific timezone |
| Display Date | Single line text | E.g., "January 4, 2026" |
| Name | Single line text | Full name of signee |
| Email | Email | Contact email |
| Phone | Phone number | Optional phone number |
| Role | Long text | **CRITICAL:** Use "Long text", not "Single select"<br>Values: `liturgist`, `liturgist2`, `backup`, `backup2` |
| Attendance Status | Single select | Yes, No, Maybe (only for Attendance role) |
| Notes | Long text | Optional notes |
| Submitted At | Date | Include time, Pacific timezone |

**⚠️ CRITICAL: Role Field Type**
- The `Role` field **MUST** be `Long text` (not `Single select`)
- This allows dynamic role assignment: `liturgist`, `liturgist2`, `backup`, `backup2`
- Single select would limit flexibility and break signups

### Greeters Table

Your **Greeters** Airtable table should have these fields:

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| Service Date | Date | Date only, Pacific timezone |
| Display Date | Single line text | E.g., "January 5, 2026" |
| Name | Single line text | Full name of greeter |
| Email | Email | Contact email |
| Phone | Phone number | Optional phone number |
| Role | Long text | Values: `greeter1`, `greeter2`, `greeter3` |
| Notes | Long text | Optional notes |
| Submitted At | Date | Include time, Pacific timezone |

### Food Distribution Table

Your **Food Distribution** Airtable table should have these fields:

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| Service Date | Date | Date only, Pacific timezone |
| Display Date | Single line text | E.g., "December 6, 2025" |
| Name | Single line text | Full name of volunteer |
| Email | Email | Contact email |
| Phone | Phone number | Optional phone number |
| Role | Long text | Values: `volunteer1`, `volunteer2`, `volunteer3`, `volunteer4` |
| Notes | Long text | Optional notes |
| Submitted At | Date | Include time, Pacific timezone |

## 🛠️ MANUAL SIGNUP (NO EMAIL)

To manually add someone to a service **without sending an email**, use PowerShell:

```powershell
# Example: Add Doug Pratt to January 4th liturgist
Invoke-RestMethod -Uri "https://signups.ukiahumc.org/api/signup" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"table":"liturgists","serviceDate":"2026-01-04","displayDate":"January 4, 2026","name":"Doug Pratt","email":"dmpratt@sbcglobal.net","phone":"","role":"liturgist"}'
```

**⚠️ NOTE:** This **WILL** send a confirmation email. To skip email, temporarily comment out the email sending code in `/src/app/api/signup/route.ts` (lines ~122-193).

---

## 🧪 TESTING

Once configured, test by:
1. Go to http://localhost:3000
2. Click any signup button
3. Fill out the form
4. Submit
5. Check your Airtable base - the record should appear!

---

## 🆘 TROUBLESHOOTING

**Error: "Invalid API key"**
- Make sure you copied the full PAT token (starts with `pat`)
- Make sure there are no extra spaces

**Error: "Base not found"**
- Double-check your Base ID (starts with `app`)
- Make sure the PAT token has access to this base

**Records not appearing?**
- Check the table name matches exactly: `liturgists.ukiahumc.org`
- Check your Airtable table has all the required fields
