# Airtable API Reference - Complete Guide

## 🔑 Authentication

All requests require a Personal Access Token (PAT) in the Authorization header:

```bash
-H "Authorization: Bearer YOUR_PAT_TOKEN"
```

**Current Token Name:** `signups.ukiahumc.org`  
**Current Base ID:** `appmnQvqSb8lcHKz8`  
**Current Tables:**
- `Liturgists` (formerly `liturgists.ukiahumc.org`)
- `Food Distribution`

---

## 📚 API Endpoints

### Base URL
```
https://api.airtable.com/v0
```

---

## 🗄️ SCHEMA OPERATIONS (Read/Write)

### 1. List All Tables in a Base

**GET** `/meta/bases/{baseId}/tables`

```bash
curl -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables"
```

**Response:** Returns complete schema including:
- Table IDs and names
- All fields with types and options
- View configurations

**Use case:** Verify table structure before making changes

---

### 2. Create a New Table

**POST** `/meta/bases/{baseId}/tables`

```bash
curl -X POST "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Table Name",
    "description": "Optional table description",
    "fields": [
      {
        "name": "Field Name",
        "type": "singleLineText"
      }
    ]
  }'
```

**Field Types & Options:**

#### Text Fields
```json
{"name": "Text Field", "type": "singleLineText"}
{"name": "Long Text", "type": "multilineText"}
{"name": "Rich Text", "type": "richText"}
```

#### Date/Time Fields
```json
// Date only (no time)
{"name": "Date", "type": "date", "options": {"dateFormat": {"name": "local"}}}

// Date with time
{"name": "DateTime", "type": "dateTime", "options": {
  "dateFormat": {"name": "local"},
  "timeFormat": {"name": "12hour"},
  "timeZone": "America/Los_Angeles"
}}
```

**Date Format Options:**
- `"name": "local"` - Uses local format (automatically shows as M/D/YYYY in US)
- `"name": "us"` - Explicitly US format
- `"name": "european"` - European format
- `"name": "iso"` - ISO 8601 format

**Time Format Options:**
- `"name": "12hour"` - 12-hour format with AM/PM
- `"name": "24hour"` - 24-hour format

#### Select Fields
```json
// Single select
{"name": "Status", "type": "singleSelect", "options": {
  "choices": [
    {"name": "Option 1"},
    {"name": "Option 2"},
    {"name": "Option 3"}
  ]
}}

// Multiple select
{"name": "Tags", "type": "multipleSelects", "options": {
  "choices": [
    {"name": "Tag 1"},
    {"name": "Tag 2"}
  ]
}}
```

#### Number Fields
```json
// Integer
{"name": "Count", "type": "number", "options": {"precision": 0}}

// Decimal (2 places)
{"name": "Price", "type": "number", "options": {"precision": 2}}

// Currency
{"name": "Amount", "type": "currency", "options": {
  "precision": 2,
  "symbol": "$"
}}

// Percentage
{"name": "Progress", "type": "percent", "options": {"precision": 0}}
```

#### Contact Fields
```json
{"name": "Email", "type": "email"}
{"name": "Phone", "type": "phoneNumber"}
{"name": "URL", "type": "url"}
```

#### Other Fields
```json
{"name": "Checkbox", "type": "checkbox", "options": {"icon": "check", "color": "greenBright"}}
{"name": "Rating", "type": "rating", "options": {"icon": "star", "max": 5}}
{"name": "Attachment", "type": "multipleAttachments"}
```

---

### 3. Update Table Schema

**PATCH** `/meta/bases/{baseId}/tables/{tableIdOrName}`

```bash
curl -X PATCH "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/tblXXXXXXXXXXXXXX" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Table Name",
    "description": "Updated description"
  }'
```

**Note:** You can use table ID (`tblXXXX`) or table name in the URL

---

### 4. Create/Update/Delete Fields

**POST** `/meta/bases/{baseId}/tables/{tableIdOrName}/fields`

#### Add a New Field
```bash
curl -X POST "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/Food%20Distribution/fields" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Field",
    "type": "singleLineText"
  }'
```

**URL Encoding:** Use `%20` for spaces in table names, or use table ID instead

#### Update a Field

**PATCH** `/meta/bases/{baseId}/tables/{tableIdOrName}/fields/{fieldIdOrName}`

```bash
curl -X PATCH "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/Food%20Distribution/fields/fldXXXXXXXXXXXXXX" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Field Name",
    "description": "Field description"
  }'
```

#### Delete a Field

**DELETE** `/meta/bases/{baseId}/tables/{tableIdOrName}/fields/{fieldIdOrName}`

```bash
curl -X DELETE "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables/Food%20Distribution/fields/fldXXXXXXXXXXXXXX" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"
```

---

## 📝 DATA OPERATIONS (Records)

### 5. List Records

**GET** `/bases/{baseId}/{tableIdOrName}`

```bash
curl "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Liturgists" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"
```

**Query Parameters:**
- `maxRecords=100` - Limit number of records
- `view=Grid%20view` - Filter by view name
- `filterByFormula=...` - Filter records (e.g., `{Name}='John'`)
- `sort[0][field]=Name&sort[0][direction]=asc` - Sort results

**Example with filters:**
```bash
curl "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Liturgists?maxRecords=10&filterByFormula=%7BRole%7D%3D%27Liturgist%27" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"
```

---

### 6. Get Single Record

**GET** `/bases/{baseId}/{tableIdOrName}/{recordId}`

```bash
curl "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Liturgists/recXXXXXXXXXXXXXX" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"
```

---

### 7. Create Records

**POST** `/bases/{baseId}/{tableIdOrName}`

```bash
curl -X POST "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Food%20Distribution" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "fields": {
          "Service Date": "2025-12-25",
          "Display Date": "Christmas Day",
          "Name": "John Doe",
          "Email": "john@example.com",
          "Phone": "707-555-1234",
          "Role": "Volunteer",
          "Item Type": "Non-Perishable",
          "Quantity": 10,
          "Notes": "Bringing canned goods",
          "Submitted At": "2025-11-23T10:30:00.000Z"
        }
      }
    ]
  }'
```

**Can create up to 10 records at once**

---

### 8. Update Records

**PATCH** `/bases/{baseId}/{tableIdOrName}`

```bash
curl -X PATCH "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Food%20Distribution" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "id": "recXXXXXXXXXXXXXX",
        "fields": {
          "Quantity": 15,
          "Notes": "Updated quantity"
        }
      }
    ]
  }'
```

**PATCH** - Updates only specified fields  
**PUT** - Replaces entire record (clears unspecified fields)

---

### 9. Delete Records

**DELETE** `/bases/{baseId}/{tableIdOrName}`

```bash
curl -X DELETE "https://api.airtable.com/v0/appmnQvqSb8lcHKz8/Food%20Distribution?records[]=recXXXXXXXXXXXXXX&records[]=recYYYYYYYYYYYYYY" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN"
```

**Can delete up to 10 records at once**

---

## 🔧 COMMON PATTERNS

### Creating a Table with Complete Schema

```bash
curl -X POST "https://api.airtable.com/v0/meta/bases/appmnQvqSb8lcHKz8/tables" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Events",
    "description": "Church events and activities",
    "fields": [
      {
        "name": "Event Name",
        "type": "singleLineText",
        "description": "Name of the event"
      },
      {
        "name": "Date",
        "type": "date",
        "options": {"dateFormat": {"name": "local"}}
      },
      {
        "name": "Time",
        "type": "singleLineText"
      },
      {
        "name": "Location",
        "type": "singleLineText"
      },
      {
        "name": "Category",
        "type": "singleSelect",
        "options": {
          "choices": [
            {"name": "Worship"},
            {"name": "Fellowship"},
            {"name": "Mission"},
            {"name": "Education"}
          ]
        }
      },
      {
        "name": "Attendance",
        "type": "number",
        "options": {"precision": 0}
      },
      {
        "name": "Description",
        "type": "multilineText"
      },
      {
        "name": "Active",
        "type": "checkbox",
        "options": {"icon": "check", "color": "greenBright"}
      }
    ]
  }'
```

---

## 🚨 ERROR HANDLING

Common errors and solutions:

### INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND
- PAT token doesn't have required permissions
- Base ID is incorrect
- Table name is misspelled

**Solution:** Check token scopes include `schema.bases:read` and `schema.bases:write`

### INVALID_FIELD_TYPE_OPTIONS_FOR_CREATE
- Field options don't match requirements for that field type
- Date format is incompatible with date type

**Solution:** Use simplified options (e.g., `{"dateFormat": {"name": "local"}}`)

### TABLE_NOT_FOUND
- Table name has spaces but URL isn't encoded
- Table ID is incorrect

**Solution:** URL-encode table names or use table IDs

---

## 📋 QUICK REFERENCE

### Our Current Setup

**Base ID:** `appmnQvqSb8lcHKz8`  
**Base Name:** `signups.ukiahumc.org`

**Tables:**

1. **Liturgists** (formerly `liturgists.ukiahumc.org`)
   - Service Date, Display Date, Name, Email, Phone
   - Role: Liturgist, Backup Liturgist, Attendance
   - Attendance Status, Notes, Submitted At

2. **Food Distribution** (Table ID: `tblM42UMKZUVAhjSZ`)
   - Service Date, Display Date, Name, Email, Phone
   - Role: Coordinator, Volunteer, Donor
   - Item Type: Perishable, Non-Perishable, Prepared Food
   - Quantity, Notes, Submitted At

---

## 🔗 Official Documentation

Airtable Web API: https://airtable.com/developers/web/api/introduction  
Airtable Meta API: https://airtable.com/developers/web/api/metadata-api

---

## 💡 Tips

1. **Always test with curl first** before implementing in code
2. **Use table IDs instead of names** in URLs to avoid encoding issues
3. **Check response for field IDs** when creating tables - you'll need them for updates
4. **Pipe to `python3 -m json.tool`** for readable JSON output
5. **Keep your PAT token secret** - it's in `.env.local` which is gitignored
6. **Date fields are tricky** - use simplified options like `{"dateFormat": {"name": "local"}}`
7. **Test record creation** after creating a table to verify schema

---

**Last Updated:** November 23, 2025
