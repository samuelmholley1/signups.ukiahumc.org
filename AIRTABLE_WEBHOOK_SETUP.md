# Airtable Webhook Setup Guide

Follow these steps to configure the webhook in Airtable:

## Steps

### Option A: Simple Trigger (Recommended)

1. **Open Airtable Automations**
   - Go to your Airtable base
   - Click "Automations" in the top menu
   - Click "+ Create automation"

2. **Choose Trigger**
   - Select "When record is updated" (this catches most changes)
   - Select your liturgist signups table
   - Leave fields as "Any field"
   - Click "Done"

3. **Add Webhook Action**
   - Click "+ Add action"
   - Select "Send a request to a webhook"
   - **Method**: `POST`
   - **URL**: `https://liturgists-ukiahumc-org.vercel.app/api/webhook/airtable`
   - Click "Done"

4. **Activate**
   - Name it "Liturgist Updates Webhook"
   - Toggle "On"

### Option B: Using Conditions (More Complex)

If you want to use "When a record matches conditions" instead:
### Option B: Using Conditions (More Complex)

If you want to use "When a record matches conditions" instead:

1. **Trigger type**: "When a record matches conditions"
2. **Table**: Select your liturgist signups table
3. **Conditions**: 
   - Pick a field that's always filled (like "Name" or "Service Date")
   - Select "is not empty"
   - This will trigger whenever ANY record has data in that field (which is always)
   
4. **Test**: Click "Test trigger"

### 3. Configure the Action (Both Options)
### 3. Configure the Action (Both Options)
1. Click "+ Add action"
2. Select "Send a request to a webhook"
3. **Method**: `POST`
4. **URL**: `https://liturgists-ukiahumc-org.vercel.app/api/webhook/airtable`
   - Replace with your actual domain if different
5. **Body** (optional - can leave empty):
   ```json
   {
     "table": "Signups",
     "timestamp": "{{CREATED_TIME}}"
   }
   ```
6. **Test**: Click "Test action" to verify it works

### 4. Name and Turn On
1. Name your automation: "Real-time Updates Webhook"
2. Toggle "On" to activate
3. Click "Done"

## Verification

### Test the webhook manually:
```bash
curl -X POST https://your-domain.com/api/webhook/airtable \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Expected response:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "clientsNotified": 0,
  "timestamp": "2025-11-03T..."
}
```

### Monitor in browser:
1. Open your app: https://your-domain.com
2. Open browser console (F12)
3. Look for these messages:
   - `[SSE Client] Connection established`
   - `[SSE Client] Connected successfully`
4. Make a change in Airtable
5. Watch for:
   - `[SSE Client] Received update: {type: "data-update"}`
   - `[SSE Client] Data updated, refreshing services`
6. The page should update automatically!

## Troubleshooting

### Webhook not firing
- Verify automation is turned "On"
- Check automation run history in Airtable
- Verify trigger conditions match your use case

### Webhook firing but no updates
- Check server logs for webhook receipt
- Verify webhook URL is correct
- Test webhook endpoint with curl command above

### SSE not connecting
- Open browser console and check for connection errors
- Verify you're on the same domain (no CORS issues)
- Check Network tab for `/api/sse` connection

## Success!
Once configured, changes in Airtable will:
1. Trigger the automation (< 1 second)
2. POST to your webhook endpoint
3. Invalidate server cache
4. Broadcast to all connected clients
5. Clients auto-refresh data
6. **Total time: < 2 seconds from Airtable edit to user seeing change!**

Compare to old system: 0-5 second delay with constant polling! 🎉
