# Greeter Email Preview

## Current Configuration (For Testing)

**When a greeter signs up:**
- **TO:** The person who signed up
- **CC:** sam@samuelholley.com (unless Sam is signing up himself)
- **BCC:** None
- **From:** "UUMC Greeter Scheduling" <alerts@samuelholley.com>
- **Reply-To:** sam@samuelholley.com

## Email Content

**Subject:** ✅ Greeter Sign-up Confirmed: [FirstName] | [Date]

**Body includes:**
- ✅ Success icon and confirmation message
- **Service Date:** [Display Date]
- **Your Role:** Greeter
- **Your Name:** [Full Name]
- **Email:** [Email Address]
- **Phone:** [Phone Number]
- **Notes:** [Any notes provided]
- Buttons to view schedule and cancel signup
- Timestamp of signup

## Production Configuration (After Testing)

**When a greeter signs up:**
- **TO:** The person who signed up
- **CC:** Daphne Macneil (daphnecmacneil@gmail.com)
- **BCC:** sam@samuelholley.com
- **From:** "UUMC Greeter Scheduling" <alerts@samuelholley.com>
- **Reply-To:** Daphne Macneil's email or sam@samuelholley.com

## Test User

The greeters page has a **Test User** in the dropdown:
- **Name:** Test User
- **Email:** sam+test@samuelholley.com
- **Phone:** Can be added

This test user behaves like any other signup but uses Sam's email alias for safe testing.

## Ready to Test

1. Go to `/greeters`
2. Enter password: `ukiah2025`
3. Select **Test User** from dropdown
4. Add a phone number (optional)
5. Select a December date
6. Click a greeter slot
7. Submit signup
8. Check sam+test@samuelholley.com for confirmation email
9. Verify Sam is CC'd at sam@samuelholley.com

## Next Steps

Once testing is complete, update email logic to:
1. Change CC from sam@samuelholley.com to daphnecmacneil@gmail.com
2. Move Sam to BCC
