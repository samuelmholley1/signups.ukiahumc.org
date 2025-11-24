# ✅ RESOLVED - Role Field Changed to Long Text

## Solution Implemented
The Role field has been changed from Single Select to Long Text. This gives the app full control over values without Airtable validation constraints.

## Background: Why Single Select Updates Failed
The Airtable API doesn't allow updating single select choices via PATCH (validation fails). Manual updates in the web interface were also cumbersome.

## Manual Update Steps

1. **Go to Airtable:**
   - Visit: https://airtable.com
   - Open base: `signups.ukiahumc.org` (Base ID: `appmnQvqSb8lcHKz8`)
   - Open table: `Food Distribution`

2. **Update Role Field:**
   - Click on the `Role` field header dropdown (▼)
   - Select "Edit field" or "Customize field type"
   - Under "Choices", update to these 4 options:
     - `volunteer1`
     - `volunteer2`
     - `volunteer3`
     - `volunteer4`
   - Click "Save"

3. **Verify:**
   - Check that old choices (Coordinator, Volunteer, Donor) are replaced
   - Test creating a new record with the new choices

## Why This Can't Be Done via API

The Airtable Meta API requires preserving choice IDs when updating, but changing choice names while preserving IDs causes validation errors. The web UI handles this automatically.

## Alternative: Delete and Recreate Field

If you prefer using curl, you can delete the old Role field and create a new one:

```bash
# WARNING: This will delete all existing Role data!

# 1. Delete old Role field
curl -X DELETE "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/tblM42UMKZUVAhjSZ/fields/fld1prgkx53AkXltw" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"

# 2. Create new Role field with correct choices
curl -X POST "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/tblM42UMKZUVAhjSZ/fields" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Role",
    "type": "singleSelect",
    "options": {
      "choices": [
        {"name": "volunteer1", "color": "greenBright"},
        {"name": "volunteer2", "color": "greenBright"},
        {"name": "volunteer3", "color": "greenBright"},
        {"name": "volunteer4", "color": "greenBright"}
      ]
    }
  }'
```

**⚠️ WARNING:** This approach will delete all existing Role data. Only use if the table is empty or you don't care about existing records.

## Recommended Approach

**Use the Airtable web UI** - it's faster and safer than deleting/recreating the field.

---

**Status:** Manual update required before food distribution signups will work correctly.
