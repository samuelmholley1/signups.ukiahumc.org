import { NextRequest, NextResponse } from 'next/server'
import { submitSignup, getSignups, deleteSignup, getSignupById } from '@/lib/airtable'
import { sendEmail, generateSignupEmail, generateCancellationEmail, generateErrorEmail } from '@/lib/email'
import { serviceCache } from '@/lib/cache'

// Disable all caching for this API route
export const dynamic = 'force-dynamic'
export const revalidate = 0


// Irrefutable stamp for identifying which handler actually runs
function stamp(tag: string) {
  return {
    tag,                               // e.g., 'signup.DELETE'
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    region: process.env.VERCEL_REGION ?? 'unknown',
    url: process.env.VERCEL_URL ?? 'local',
    at: new Date().toISOString(),
  };
}
export async function POST(request: NextRequest) {
  const handlerStamp = stamp('signup.POST');
  console.log('🔍 HANDLER STAMP:' , handlerStamp);
  
  // Parse body and determine table name BEFORE try block so it's accessible in catch
  let body: any;
  let tableName = 'Liturgists'; // default to Liturgists
  
  try {
    body = await request.json()
    
    console.log('Received signup request:', body)
    
    // Determine which table to use
    tableName = body.table === 'food' ? 'Food Distribution' : body.table === 'greeters' ? 'Greeters' : 'Liturgists'
    console.log('Using table:', tableName)
    
    // Validate required fields
    if (!body.serviceDate || !body.displayDate || !body.name || !body.email || !body.role) {
      console.error('Missing required fields:', { 
        hasServiceDate: !!body.serviceDate,
        hasDisplayDate: !!body.displayDate,
        hasName: !!body.name,
        hasEmail: !!body.email,
        hasRole: !!body.role
      })
      const errorResponse1 = NextResponse.json(
        { error: 'Missing required fields', handler: handlerStamp },
        { status: 400 }
      );
      errorResponse1.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse1;
    }

    // Check environment variables
    if (!process.env.AIRTABLE_PAT_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      console.error('Missing Airtable credentials:', {
        hasPAT: !!process.env.AIRTABLE_PAT_TOKEN,
        hasBaseID: !!process.env.AIRTABLE_BASE_ID,
        hasTableName: !!process.env.AIRTABLE_TABLE_NAME
      })
      const errorResponse2 = NextResponse.json(
        { error: 'Server configuration error - missing Airtable credentials', handler: handlerStamp },
        { status: 500 }
      );
      errorResponse2.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse2;
    }

    // CRITICAL: Check if slot is already taken BEFORE submitting
    // This prevents race conditions where multiple signups happen before UI updates
    console.log(`🔍 [DUPLICATE CHECK] Checking if ${body.role} is already taken for ${body.serviceDate}`)
    
    const allSignups = await getSignups(tableName)
    const existingSignup = allSignups.find((s: any) => 
      s.serviceDate === body.serviceDate && s.role === body.role
    )
    
    if (existingSignup) {
      console.log(`❌ [DUPLICATE CHECK] Slot already taken: ${body.role} on ${body.serviceDate} by ${existingSignup.name}`)
      const errorResponse = NextResponse.json(
        { 
          error: 'This volunteer slot is already filled. Please refresh the page to see the latest signups.',
          code: 'SLOT_TAKEN'
        },
        { status: 409 } // 409 Conflict
      )
      errorResponse.headers.set('X-Handler', JSON.stringify(handlerStamp))
      return errorResponse
    }
    
    console.log(`✅ [DUPLICATE CHECK] Slot is available: ${body.role} on ${body.serviceDate}`)
    
    // Submit to Airtable
    const result = await submitSignup({
      serviceDate: body.serviceDate,
      displayDate: body.displayDate,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role,
      attendanceStatus: body.attendanceStatus,
      notes: body.notes,
    }, tableName)

    if (result.success) {
      console.log('Signup successful:', result.record?.id)
      
      // CRITICAL: Invalidate ALL cache entries for this table type
      // Don't try to guess the quarter - just invalidate everything
      const tablePrefix = tableName === 'Food Distribution' ? 'food' : 'liturgists'
      const allKeys = serviceCache.getAllQuarters()
      const keysToInvalidate = allKeys.filter(key => key.startsWith(tablePrefix))
      keysToInvalidate.forEach(key => {
        serviceCache.invalidate(key)
        console.log(`✅ [CACHE] Invalidated cache key: ${key}`)
      })
      if (keysToInvalidate.length === 0) {
        console.log(`⚠️ [CACHE] No cache entries found for ${tablePrefix}`)
      }
      
      // Send email notifications
      try {
        const isFoodDistribution = tableName === 'Food Distribution'
        const systemName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        
        const emailHtml = generateSignupEmail({
          name: body.name,
          email: body.email,
          phone: body.phone || '',
          role: body.role,
          displayDate: body.displayDate,
          notes: body.notes,
          recordId: result.record?.id || '',
          systemName
        })
        
        // Send email confirmation
        // If Sam signs up: TO sam@ only (no CC)
        // If others sign up: TO their email, CC sam@
        const isSamSigningUp = body.email.toLowerCase() === 'sam@samuelholley.com'
        const role = body.role.toLowerCase().trim()
        
        // Determine role label based on table type
        let roleLabel = ''
        const isGreeters = tableName === 'Greeters'
        if (isFoodDistribution) {
          // Food distribution roles: volunteer1, volunteer2, volunteer3, volunteer4
          roleLabel = 'Food Distribution Volunteer'
        } else if (isGreeters) {
          // Greeter roles: greeter1, greeter2
          roleLabel = 'Greeter'
        } else {
          // Liturgist roles: liturgist, backup, liturgist2
          const isBackup = role === 'backup'
          const isSecondLiturgist = role === 'liturgist2'
          roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
        }
        
        const firstName = body.name.split(' ')[0] || body.name || 'Unknown'
        const fromName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        
        // Email CC/BCC logic
        let ccRecipients: string | undefined
        let bccRecipients: string | undefined
        
        if (isFoodDistribution) {
          // Food Distribution: Trudy is CC'd, Sam is BCC'd
          // Exception: If Trudy is signing up, no CC (she's already TO), Sam still BCC'd
          const isTrudySigningUp = body.email.toLowerCase() === 'morganmiller@pacific.net'
          // Check if TO email goes to Sam (including aliases like sam+test@)
          const emailGoesToSam = body.email.toLowerCase().includes('@samuelholley.com') || 
                                  body.email.toLowerCase() === 'sam@samuelholley.com'
          
          ccRecipients = isTrudySigningUp ? undefined : 'morganmiller@pacific.net'
          bccRecipients = emailGoesToSam ? undefined : 'sam@samuelholley.com'
        } else {
          // Liturgist: Sam is CC'd (not BCC'd), no Trudy
          ccRecipients = isSamSigningUp ? undefined : 'sam@samuelholley.com'
          bccRecipients = undefined
        }
        
        await sendEmail({
          to: body.email,
          cc: ccRecipients,
          bcc: bccRecipients,
          replyTo: 'sam@samuelholley.com',
          subject: `✅ ${roleLabel} Sign-up Confirmed: ${firstName} | ${body.displayDate}`,
          html: emailHtml,
          fromName
        })
        
        console.log('Email notification sent successfully')
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the signup if email fails
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Signup submitted successfully!',
        recordId: result.record?.id
      })
    } // Close if (result.success) block
    else {
      console.error('Airtable submission failed:', result.error)
      
      // Send error notification email
      try {
        const errorEmailHtml = generateErrorEmail({
          errorType: 'Airtable Submission Failed',
          errorMessage: String(result.error),
          userName: body.name,
          userEmail: body.email,
          serviceDate: body.displayDate,
          stackTrace: result.error instanceof Error ? result.error.stack : undefined,
          serviceType: tableName
        })
        
        const errorSubject = tableName === 'Food Distribution' 
          ? '🚨 ERROR: Food Distribution Signup Failed'
          : '🚨 ERROR: Liturgist Signup Failed'
        const errorFromName = tableName === 'Food Distribution' ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: errorSubject,
          html: errorEmailHtml,
          fromName: errorFromName
        })
      } catch (emailError) {
        console.error('Failed to send error notification email:', emailError)
      }
      
      return NextResponse.json(
        { error: 'Failed to submit signup', details: String(result.error) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API Error:', error)
    
    // Send error notification email
    try {
      const errorEmailHtml = generateErrorEmail({
        errorType: 'API Internal Server Error',
        errorMessage: String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        serviceType: tableName
      })
      
      const systemErrorSubject = tableName === 'Food Distribution'
        ? '🚨 ERROR: Food Distribution System Error'
        : '🚨 ERROR: Liturgist Signup System Error'
      const systemErrorFromName = tableName === 'Food Distribution' ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
      
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: systemErrorSubject,
        html: errorEmailHtml,
        fromName: systemErrorFromName
      })
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError)
    }
    
    const errorResponse = NextResponse.json({ error: 'Internal server error', details: String(error), handler: handlerStamp }, { status: 500 });
    errorResponse.headers.set('X-Handler', JSON.stringify(handlerStamp));
    return errorResponse;
  }
}

export async function GET(request: NextRequest) {
  const handlerStamp = stamp('signup.GET');
  console.log('🚨🚨�� GET HANDLER CALLED - IS THIS HANDLING DELETES?? 🚨🚨🚨');
  console.log('🔍 HANDLER STAMP:', handlerStamp);
  
  try {    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')
    const action = searchParams.get('action')
    
    if (!recordId || action !== 'cancel') {
      const errorResponse1 = NextResponse.json({ error: 'Invalid request parameters', handler: handlerStamp }, { status: 400 });
      errorResponse1.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse1;
    }

    // Get record info before deleting (for email notification)
    const recordData = await getSignupById(recordId)
    
    if (!recordData.success || !recordData.record) {
      const errorResponse2 = NextResponse.json({ error: 'Signup not found', handler: handlerStamp }, { status: 404 });
      errorResponse2.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse2;
    }

    // Delete from Airtable
    const result = await deleteSignup(recordId)

    if (result.success) {
      console.log('Signup cancelled via email link:', recordId)
      
      // Send cancellation email notifications
      try {
        // Format display date for subject line
        let formattedDateForSubject = recordData.record.displayDate as string
        if (formattedDateForSubject && formattedDateForSubject.includes('T') && formattedDateForSubject.includes('Z')) {
          try {
            const date = new Date(formattedDateForSubject)
            formattedDateForSubject = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          } catch (error) {
            console.warn('Failed to parse displayDate for subject:', formattedDateForSubject)
          }
        }
        
        const userEmail = recordData.record.email as string
          const userRole = recordData.record.role as string
          const userName = recordData.record.name as string
          const isSamCancelling = userEmail.toLowerCase() === 'sam@samuelholley.com'
          
          // Detect if this is food distribution based on role
          const role = userRole.toLowerCase().trim()
          const isFoodDistribution = role.startsWith('volunteer')
          const systemName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        
        const emailHtml = generateCancellationEmail({
          name: recordData.record.name as string,
          role: recordData.record.role as string,
          displayDate: recordData.record.displayDate as string,
          systemName
        })
          
          // Determine role label based on table type
          let roleLabel = ''
          if (isFoodDistribution) {
            roleLabel = 'Food Distribution Volunteer'
          } else {
            const isBackup = role === 'backup'
            const isSecondLiturgist = role === 'liturgist2'
            roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
          }
          
          const firstName = userName.split(' ' )[0] || userName || 'Unknown'
          const fromName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
          
          // Email CC/BCC logic for email-link cancellations
          let ccRecipients: string | undefined
          let bccRecipients: string | undefined
          
          if (isFoodDistribution) {
            // Food Distribution: Trudy is CC'd, Sam is BCC'd
            // Exception: If Trudy is cancelling, no CC (she's already TO), Sam still BCC'd
            const isTrudyCancelling = userEmail.toLowerCase() === 'morganmiller@pacific.net'
            // Check if TO email goes to Sam (including aliases like sam+test@)
            const emailGoesToSam = userEmail.toLowerCase().includes('@samuelholley.com') || 
                                    userEmail.toLowerCase() === 'sam@samuelholley.com'
            
            ccRecipients = isTrudyCancelling ? undefined : 'morganmiller@pacific.net'
            bccRecipients = emailGoesToSam ? undefined : 'sam@samuelholley.com'
          } else {
            // Liturgist: Sam is CC'd (not BCC'd), no Trudy
            ccRecipients = isSamCancelling ? undefined : 'sam@samuelholley.com'
            bccRecipients = undefined
          }
          
          const finalSubject = `❌ ${roleLabel} Sign-up Cancelled: ${firstName} | ${formattedDateForSubject}`
          
          await sendEmail({
            to: userEmail,
            cc: ccRecipients,
            bcc: bccRecipients,
            replyTo: 'sam@samuelholley.com',
            subject: finalSubject,
            html: emailHtml,
            fromName
          })
        
        console.log(`Cancellation email: userEmail="${userEmail}", isSamCancelling=${isSamCancelling}, to=${isSamCancelling ? 'alerts@' : userEmail}`)
        
        console.log('Cancellation email notification sent successfully')
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError)
        // Don't fail the cancellation if email fails
      }
      
      // Return a simple HTML page confirming the cancellation
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Signup Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .logo { margin-bottom: 20px; }
            .logo img { max-width: 120px; height: auto; border-radius: 8px; }
            .success { color: #28a745; font-size: 48px; margin: 20px 0; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="/logo-for-church-larger.jpg" alt="Ukiah United Methodist Church" />
            </div>
            <div class="success">✅</div>
            <h1>Signup Cancelled Successfully</h1>
            <p>Your liturgist signup for <strong>${recordData.record.displayDate}</strong> has been cancelled.</p>
            <p>Thank you for letting us know. We appreciate your communication.</p>
            <a href="https://liturgists.ukiahumc.org" class="button">Return to Signup Page</a>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    } else {
      console.error('Airtable deletion failed:', result.error)
      
      // Send error notification email
      try {
        // Detect table type from role for error email
        const userRole = recordData.record.role as string
        const isFoodDistribution = userRole && userRole.toLowerCase().startsWith('volunteer')
        
        const errorEmailHtml = generateErrorEmail({
          errorType: 'Email Link Cancellation Failed',
          errorMessage: String(result.error),
          userName: recordData.record.name as string,
          userEmail: recordData.record.email as string,
          serviceDate: recordData.record.displayDate as string,
          stackTrace: result.error instanceof Error ? result.error.stack : undefined,
          serviceType: isFoodDistribution ? 'Food Distribution' : 'Liturgists'
        })
        const errorFromName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        const errorSubject = isFoodDistribution 
          ? '🚨 ERROR: Food Distribution Email Link Cancellation Failed'
          : '🚨 ERROR: Liturgist Email Link Cancellation Failed'
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: errorSubject,
          html: errorEmailHtml,
          fromName: errorFromName
        })
      } catch (emailError) {
        console.error('Failed to send error notification email:', emailError)
      }
      
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cancellation Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .logo { margin-bottom: 20px; }
            .logo img { max-width: 120px; height: auto; border-radius: 8px; }
            .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="/logo-for-church-larger.jpg" alt="Ukiah United Methodist Church" />
            </div>
            <div class="error">❌</div>
            <h1>Cancellation Failed</h1>
            <p>We encountered an error while trying to cancel your signup.</p>
            <p>Please try again or contact the church office for assistance.</p>
            <a href="https://liturgists.ukiahumc.org" class="button">Return to Signup Page</a>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    
    // Send error notification email
    try {
      const errorEmailHtml = generateErrorEmail({
        errorType: 'Email Link Cancellation API Error',
        errorMessage: String(error),
        stackTrace: error instanceof Error ? error.stack : undefined
      })
      
      // Can't detect table type here, default to liturgist
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: '🚨 ERROR: Email Link Cancellation System Error',
        html: errorEmailHtml,
        fromName: 'UUMC System'
      })
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError)
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>System Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .logo { margin-bottom: 20px; }
          .logo img { max-width: 120px; height: auto; border-radius: 8px; }
          .error { color: #dc3545; font-size: 48px; margin: 20px 0; }
          h1 { color: #333; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="/logo-for-church-larger.jpg" alt="Ukiah United Methodist Church" />
          </div>
          <div class="error">🚨</div>
          <h1>System Error</h1>
          <p>We encountered a system error while processing your request.</p>
          <p>Please try again later or contact the church office for assistance.</p>
          <a href="https://liturgists.ukiahumc.org" class="button">Return to Signup Page</a>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

export async function DELETE(request: NextRequest) {
  const handlerStamp = stamp('signup.DELETE');
  console.log('🚨🚨🚨 DELETE HANDLER CALLED - THIS SHOULD ALWAYS APPEAR! 🚨🚨🚨');
  console.log('🔍 HANDLER STAMP:', handlerStamp);
  
  // Extract params BEFORE try block so tableName is accessible in catch
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('recordId')
  const table = searchParams.get('table') || 'liturgists'
  const tableName = table === 'food' ? 'Food Distribution' : table === 'greeters' ? 'Greeters' : 'Liturgists'
  
  try {
    if (!recordId) {
      const errorResponse1 = NextResponse.json({ error: 'Missing recordId parameter', handler: handlerStamp }, { status: 400 });
      errorResponse1.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse1;
    }

    console.log('Using table:', tableName)

    // Get record info before deleting (for email notification)
    const recordData = await getSignupById(recordId, tableName)
    const cancelledRole = recordData.record?.role as string
    const serviceDate = recordData.record?.serviceDate as string
    
    // Delete from Airtable
    const result = await deleteSignup(recordId, tableName)

    if (result.success) {
      console.log('Signup cancelled successfully:', recordId)
      
      // CRITICAL: Invalidate ALL cache entries for this table type
      // Don't try to guess the quarter - just invalidate everything
      const tablePrefix = tableName === 'Food Distribution' ? 'food' : 'liturgists'
      const allKeys = serviceCache.getAllQuarters()
      const keysToInvalidate = allKeys.filter(key => key.startsWith(tablePrefix))
      keysToInvalidate.forEach(key => {
        serviceCache.invalidate(key)
        console.log(`✅ [CACHE] Invalidated cache key: ${key}`)
      })
      if (keysToInvalidate.length === 0) {
        console.log(`⚠️ [CACHE] No cache entries found for ${tablePrefix}`)
      }
      
      // BACKFILL LOGIC: If volunteer 1 or 2 cancelled, promote volunteer 3 & 4
      if (tableName === 'Food Distribution' && (cancelledRole === 'volunteer1' || cancelledRole === 'volunteer2')) {
        console.log(`🔄 [BACKFILL] ${cancelledRole} cancelled on ${serviceDate}, checking for volunteers to promote...`)
        
        // Get all signups for this date
        const { getSignups } = await import('@/lib/airtable')
        const { updateSignupRole } = await import('@/lib/airtable')
        const allSignups = await getSignups(tableName)
        const dateSignups = allSignups.filter((s: any) => s.serviceDate === serviceDate)
        
        console.log(`🔍 [BACKFILL] Found ${dateSignups.length} remaining volunteers for ${serviceDate}:`, 
          dateSignups.map((s: any) => `${s.role}: ${s.name}`))
        
        // Find volunteer3 and volunteer4
        const vol3 = dateSignups.find((s: any) => s.role === 'volunteer3')
        const vol4 = dateSignups.find((s: any) => s.role === 'volunteer4')
        
        if (cancelledRole === 'volunteer1') {
          // volunteer2 -> volunteer1, volunteer3 -> volunteer2, volunteer4 -> volunteer3
          const vol2 = dateSignups.find((s: any) => s.role === 'volunteer2')
          if (vol2) {
            await updateSignupRole(vol2.id, 'volunteer1', tableName)
            console.log(`✅ [BACKFILL] ${vol2.name}: volunteer2 → volunteer1`)
          }
          if (vol3) {
            await updateSignupRole(vol3.id, 'volunteer2', tableName)
            console.log(`✅ [BACKFILL] ${vol3.name}: volunteer3 → volunteer2`)
          }
          if (vol4) {
            await updateSignupRole(vol4.id, 'volunteer3', tableName)
            console.log(`✅ [BACKFILL] ${vol4.name}: volunteer4 → volunteer3`)
          }
          console.log('✅ [BACKFILL] Promotion complete after volunteer1 cancellation')
        } else if (cancelledRole === 'volunteer2') {
          // volunteer3 -> volunteer2, volunteer4 -> volunteer3
          if (vol3) {
            await updateSignupRole(vol3.id, 'volunteer2', tableName)
            console.log(`✅ [BACKFILL] ${vol3.name}: volunteer3 → volunteer2`)
          }
          if (vol4) {
            await updateSignupRole(vol4.id, 'volunteer3', tableName)
            console.log(`✅ [BACKFILL] ${vol4.name}: volunteer4 → volunteer3`)
          }
          console.log('✅ [BACKFILL] Promotion complete after volunteer2 cancellation')
        }
        
        // VALIDATION: Verify backfill worked correctly
        try {
          const verifySignups = await getSignups(tableName)
          const verifyDateSignups = verifySignups.filter((s: any) => s.serviceDate === serviceDate)
          
          // Check if volunteer3 exists but volunteer2 doesn't (gap after backfill)
          const hasVol3 = verifyDateSignups.some((v: any) => v.role === 'volunteer3')
          const hasVol2 = verifyDateSignups.some((v: any) => v.role === 'volunteer2')
          const hasVol1 = verifyDateSignups.some((v: any) => v.role === 'volunteer1')
          const stillHasGap = (hasVol3 && !hasVol2) || (hasVol2 && !hasVol1)
          
          if (stillHasGap) {
            // CRITICAL: Backfill failed - send alert email
            const errorEmailHtml = generateErrorEmail({
              errorType: 'CRITICAL: Backfill Validation Failed',
              errorMessage: `After cancelling ${cancelledRole} on ${serviceDate}, volunteers were not properly promoted. Gap detected in volunteer sequence.`,
              userName: recordData.record?.name as string || 'Unknown',
              userEmail: recordData.record?.email as string || 'Unknown',
              serviceDate,
              stackTrace: `Cancelled Role: ${cancelledRole}\nDate: ${serviceDate}\nTable: ${tableName}\nVerification found gap in volunteer sequence after backfill`,
              serviceType: tableName
            })
            
            await sendEmail({
              to: 'sam@samuelholley.com',
              subject: '🚨 CRITICAL: Food Distribution Backfill Failed',
              html: errorEmailHtml,
              fromName: 'UUMC Food Distribution'
            })
            console.error('❌ [BACKFILL VALIDATION] Failed - gap still exists after promotion')
          } else {
            console.log('✅ [BACKFILL VALIDATION] Success - no gaps detected')
          }
        } catch (validationError) {
          console.error('❌ [BACKFILL VALIDATION] Error during verification:', validationError)
        }
      }
      
      // Send cancellation email notifications
      if (recordData.success && recordData.record) {
        try {
          // Format display date for subject line
          let formattedDateForSubject = recordData.record.displayDate as string
          if (formattedDateForSubject && formattedDateForSubject.includes('T') && formattedDateForSubject.includes('Z')) {
            try {
              const date = new Date(formattedDateForSubject)
              formattedDateForSubject = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            } catch (error) {
              console.warn('Failed to parse displayDate for subject:', formattedDateForSubject)
            }
          }
          
          const userEmail = recordData.record.email as string
          const userRole = recordData.record.role as string
          const userName = recordData.record.name as string
          const isSamCancelling = userEmail.toLowerCase() === 'sam@samuelholley.com'
          const isFoodDistribution = tableName === 'Food Distribution'
          const systemName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
          
          const emailHtml = generateCancellationEmail({
            name: recordData.record.name as string,
            role: recordData.record.role as string,
            displayDate: recordData.record.displayDate as string,
            systemName
          })
          
          // Determine role label based on table type
          let roleLabel = ''
          if (isFoodDistribution) {
            roleLabel = 'Food Distribution Volunteer'
          } else {
            const role = userRole.toLowerCase().trim()
            const isBackup = role === 'backup'
            const isSecondLiturgist = role === 'liturgist2'
            roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
          }
          
          const firstName = userName.split(' ' )[0] || userName || 'Unknown'
          
          // Email CC/BCC logic for cancellations
          let ccRecipients: string | undefined
          let bccRecipients: string | undefined
          
          if (isFoodDistribution) {
            // Food Distribution: Trudy is CC'd, Sam is BCC'd
            // Exception: If Trudy is cancelling, no CC (she's already TO), Sam still BCC'd
            const isTrudyCancelling = userEmail.toLowerCase() === 'morganmiller@pacific.net'
            // Check if TO email goes to Sam (including aliases like sam+test@)
            const emailGoesToSam = userEmail.toLowerCase().includes('@samuelholley.com') || 
                                    userEmail.toLowerCase() === 'sam@samuelholley.com'
            
            ccRecipients = isTrudyCancelling ? undefined : 'morganmiller@pacific.net'
            bccRecipients = emailGoesToSam ? undefined : 'sam@samuelholley.com'
          } else {
            // Liturgist: Sam is CC'd (not BCC'd), no Trudy
            ccRecipients = isSamCancelling ? undefined : 'sam@samuelholley.com'
            bccRecipients = undefined
          }
          
          const finalSubject = `❌ ${roleLabel} Sign-up Cancelled: ${firstName} | ${formattedDateForSubject}`
          const fromName = isFoodDistribution ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
          
          await sendEmail({
            to: userEmail,
            cc: ccRecipients,
            bcc: bccRecipients,
            replyTo: 'sam@samuelholley.com',
            subject: finalSubject,
            html: emailHtml,
            fromName
          })
          
          console.log('Cancellation email notification sent successfully')
        } catch (emailError) {
          console.error('Failed to send cancellation email:', emailError)
          // Don't fail the cancellation if email fails
        }
      }
      
      const response = NextResponse.json({ success: true, message: 'Signup cancelled successfully', handler: handlerStamp });
      response.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return response;
    } else {
      console.error('Airtable deletion failed:', result.error)
      
      // Send error notification email
      try {
        const errorEmailHtml = generateErrorEmail({
          errorType: 'Cancellation Failed',
          errorMessage: String(result.error),
          stackTrace: result.error instanceof Error ? result.error.stack : undefined,
          serviceType: tableName
        })
        
        const cancelErrorSubject = tableName === 'Food Distribution'
          ? '🚨 ERROR: Food Distribution Cancellation Failed'
          : '🚨 ERROR: Liturgist Cancellation Failed'
        const cancelErrorFromName = tableName === 'Food Distribution' ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: cancelErrorSubject,
          html: errorEmailHtml,
          fromName: cancelErrorFromName
        })
      } catch (emailError) {
        console.error('Failed to send error email:', emailError)
      }      
      const errorResponse2 = NextResponse.json({ error: 'Failed to cancel signup', details: String(result.error), handler: handlerStamp }, { status: 500 });
      errorResponse2.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse2;
    }
  } catch (error) {
    console.error('API Error:', error)
    
    // Send error notification email
    try {
      const errorEmailHtml = generateErrorEmail({
        errorType: 'Cancellation API Error',
        errorMessage: String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        serviceType: tableName
      })
      
      const cancelSystemErrorSubject = tableName === 'Food Distribution'
        ? '🚨 ERROR: Food Distribution Cancellation System Error'
        : '🚨 ERROR: Liturgist Cancellation System Error'
      const cancelSystemErrorFromName = tableName === 'Food Distribution' ? 'UUMC Food Distribution' : 'UUMC Liturgist Scheduling'
      
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: cancelSystemErrorSubject,
        html: errorEmailHtml,
        fromName: cancelSystemErrorFromName
      })
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError)
    }
    
    const errorResponse = NextResponse.json({ error: 'Internal server error', details: String(error), handler: handlerStamp }, { status: 500 });
    errorResponse.headers.set('X-Handler', JSON.stringify(handlerStamp));
    return errorResponse;
  }
}
