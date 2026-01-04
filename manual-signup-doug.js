// Manual signup script - adds Doug Pratt to 1/4 liturgist WITHOUT sending email
// Run with: node manual-signup-doug.js

const AIRTABLE_PAT_TOKEN = process.env.AIRTABLE_PAT_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PAT_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing environment variables. Make sure AIRTABLE_PAT_TOKEN and AIRTABLE_BASE_ID are set.');
  process.exit(1);
}

async function addDougPratt() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Liturgists`;
  
  const payload = {
    records: [
      {
        fields: {
          'Service Date': '2026-01-04',
          'Display Date': 'January 4, 2026',
          'Liturgist': 'Doug Pratt',
          'Liturgist Email': 'dmpratt@sbcglobal.net',
          'Liturgist Phone': '', // Add phone if you have it
          'Role': 'liturgist'
        }
      }
    ]
  };

  console.log('📝 Adding Doug Pratt to January 4, 2026 liturgist slot...');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ SUCCESS! Doug Pratt added to January 4, 2026');
    console.log('Record ID:', data.records[0].id);
    console.log('\n🎉 No email was sent - this was a direct Airtable insert.');
  } else {
    console.error('❌ FAILED:', data);
    process.exit(1);
  }
}

addDougPratt().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
