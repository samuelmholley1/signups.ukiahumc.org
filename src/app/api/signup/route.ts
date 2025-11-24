import { NextRequest, NextResponse } from 'next/server'
import { submitSignup, getSignups, deleteSignup, getSignupById } from '@/lib/airtable'
import { sendEmail, generateSignupEmail, generateCancellationEmail, generateErrorEmail } from '@/lib/email'

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
  try {
    const body = await request.json()
    
    console.log('Received signup request:', body)
    
    // Determine which table to use
    const tableName = body.table === 'food' ? 'Food Distribution' : 'Liturgists'
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

    // CRITICAL: Server-side duplicate prevention (race condition fix)
    const existingSignups = await getSignups(tableName)
    const duplicate = existingSignups.find(
      (s: any) => s.serviceDate === body.serviceDate && s.role === body.role
    )
    
    if (duplicate) {
      console.warn('Duplicate signup attempt blocked:', {
        serviceDate: body.serviceDate,
        role: body.role,
        existingName: duplicate.name,
        attemptedName: body.name
      })
      return NextResponse.json(
        { 
          error: `This role is already taken by ${duplicate.name}. Please refresh the page to see updated availability.`,
          isDuplicate: true
        },
        { status: 409 } // 409 Conflict
      )
    }

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
      
      // Send email notifications
      try {
        const emailHtml = generateSignupEmail({
          name: body.name,
          email: body.email,
          phone: body.phone || '',
          role: body.role,
          displayDate: body.displayDate,
          notes: body.notes,
          recordId: result.record?.id || ''
        })
        
        // Send email confirmation
        // If Sam signs up: TO sam@ only (no CC)
        // If others sign up: TO their email, CC sam@
        const isSamSigningUp = body.email.toLowerCase() === 'sam@samuelholley.com'
        const role = body.role.toLowerCase().trim()
        const isBackup = role === 'backup'
        const isSecondLiturgist = role === 'liturgist2'
        const roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
        const firstName = body.name.split(' ')[0] || body.name || 'Unknown'
        
        await sendEmail({
          to: body.email,
          cc: isSamSigningUp ? undefined : 'sam@samuelholley.com',
          replyTo: 'sam@samuelholley.com',
          subject: `✅ ${roleLabel} Sign-up Confirmed: ${firstName} | ${body.displayDate}`,
          html: emailHtml
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
    } else {
      console.error('Airtable submission failed:', result.error)
      
      // Send error notification email
      try {
        const errorEmailHtml = generateErrorEmail({
          errorType: 'Airtable Submission Failed',
          errorMessage: String(result.error),
          userName: body.name,
          userEmail: body.email,
          serviceDate: body.displayDate,
          stackTrace: result.error instanceof Error ? result.error.stack : undefined
        })
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: '🚨 ERROR: Liturgist Signup Failed',
          html: errorEmailHtml
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
        stackTrace: error instanceof Error ? error.stack : undefined
      })
      
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: '🚨 ERROR: Liturgist Signup System Error',
        html: errorEmailHtml
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
        
        const emailHtml = generateCancellationEmail({
          name: recordData.record.name as string,
          role: recordData.record.role as string,
          displayDate: recordData.record.displayDate as string
        })
        
        const userEmail = recordData.record.email as string
          const userRole = recordData.record.role as string
          const userName = recordData.record.name as string
          const isSamCancelling = userEmail.toLowerCase() === 'sam@samuelholley.com'
          
          // Determine role label and name
          const role = userRole.toLowerCase().trim()
          const isBackup = role === 'backup'
          const isSecondLiturgist = role === 'liturgist2'
          const roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
          const firstName = userName.split(' ' )[0] || userName || 'Unknown'
          
          // CC logic: always CC sam@ except when sam@ is TO recipient
          const shouldCCSam = !isSamCancelling
          
          const finalSubject = `❌ ${roleLabel} Sign-up Cancelled: ${firstName} | ${formattedDateForSubject}`
          const finalCC = shouldCCSam ? 'sam@samuelholley.com' : undefined
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
        const errorEmailHtml = generateErrorEmail({
          errorType: 'Email Link Cancellation Failed',
          errorMessage: String(result.error),
          userName: recordData.record.name as string,
          userEmail: recordData.record.email as string,
          serviceDate: recordData.record.displayDate as string,
          stackTrace: result.error instanceof Error ? result.error.stack : undefined
        })
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: '🚨 ERROR: Email Link Cancellation Failed',
          html: errorEmailHtml
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
      
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: '🚨 ERROR: Email Link Cancellation System Error',
        html: errorEmailHtml
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
  
  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')
    const table = searchParams.get('table') || 'liturgists'
    
    if (!recordId) {
      const errorResponse1 = NextResponse.json({ error: 'Missing recordId parameter', handler: handlerStamp }, { status: 400 });
      errorResponse1.headers.set('X-Handler', JSON.stringify(handlerStamp));
      return errorResponse1;
    }

    // Determine which table to use
    const tableName = table === 'food' ? 'Food Distribution' : 'Liturgists'
    console.log('Using table:', tableName)

    // Get record info before deleting (for email notification)
    const recordData = await getSignupById(recordId, tableName)
    
    // Delete from Airtable
    const result = await deleteSignup(recordId, tableName)

    if (result.success) {
      console.log('Signup cancelled successfully:', recordId)
      
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
          
          const emailHtml = generateCancellationEmail({
            name: recordData.record.name as string,
            role: recordData.record.role as string,
            displayDate: recordData.record.displayDate as string
          })
          
          const userEmail = recordData.record.email as string
          const userRole = recordData.record.role as string
          const userName = recordData.record.name as string
          const isSamCancelling = userEmail.toLowerCase() === 'sam@samuelholley.com'
          
          // Determine role label and name
          const role = userRole.toLowerCase().trim()
          const isBackup = role === 'backup'
          const isSecondLiturgist = role === 'liturgist2'
          const roleLabel = isBackup ? 'Backup Liturgist' : (isSecondLiturgist ? 'Second Liturgist' : 'Liturgist')
          const firstName = userName.split(' ' )[0] || userName || 'Unknown'
          
          // CC logic: always CC sam@ except when sam@ is TO recipient
          const shouldCCSam = !isSamCancelling
          
          const finalSubject = `❌ ${roleLabel} Sign-up Cancelled: ${firstName} | ${formattedDateForSubject}`
          const finalCC = shouldCCSam ? 'sam@samuelholley.com' : undefined
          
          await sendEmail({
            to: userEmail,
            cc: finalCC,
            replyTo: 'sam@samuelholley.com',
            subject: finalSubject,
            html: emailHtml
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
          stackTrace: result.error instanceof Error ? result.error.stack : undefined
        })
        
        await sendEmail({
          to: 'sam@samuelholley.com',
          subject: '❌ Cancellation Failed',
          html: errorEmailHtml
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
        stackTrace: error instanceof Error ? error.stack : undefined
      })
      
      await sendEmail({
        to: 'sam@samuelholley.com',
        subject: '🚨 ERROR: Liturgist Cancellation System Error',
        html: errorEmailHtml
      })
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError)
    }
    
    const errorResponse = NextResponse.json({ error: 'Internal server error', details: String(error), handler: handlerStamp }, { status: 500 });
    errorResponse.headers.set('X-Handler', JSON.stringify(handlerStamp));
    return errorResponse;
  }
}
