import Airtable from 'airtable'

// Initialize Airtable with PAT token
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_PAT_TOKEN,
})

const base = airtable.base(process.env.AIRTABLE_BASE_ID || '')

// Table constants for multi-table support
export const TABLES = {
  LITURGISTS: process.env.AIRTABLE_LITURGISTS_TABLE || 'Liturgists',
  FOOD_DISTRIBUTION: process.env.AIRTABLE_FOOD_TABLE || 'Food Distribution'
}

// Helper to get table by name
const getTable = (tableName: string) => base(tableName)

export interface SignupData {
  serviceDate: string
  displayDate: string
  name: string
  email: string
  phone?: string
  role: 'Liturgist' | 'Backup Liturgist' | 'Attendance'
  attendanceStatus?: 'Yes' | 'No' | 'Maybe'
  notes?: string
}

/**
 * Submit a signup to Airtable
 */
export async function submitSignup(data: SignupData, tableName: string = TABLES.LITURGISTS) {
  try {
    const table = getTable(tableName)
    
    // Build fields object - only include Attendance Status for Liturgists table
    const fields: Record<string, any> = {
      'Service Date': data.serviceDate,
      'Display Date': data.displayDate,
      'Name': data.name,
      'Email': data.email,
      'Phone': data.phone || '',
      'Role': data.role,
      'Notes': data.notes || '',
      'Submitted At': new Date().toISOString(),
    }
    
    // Only add Attendance Status for Liturgists table (not Food Distribution)
    if (tableName === TABLES.LITURGISTS && data.attendanceStatus) {
      fields['Attendance Status'] = data.attendanceStatus
    }
    
    const record = await table.create([{ fields }])

    return { success: true, record: record[0] }
  } catch (error) {
    console.error('Error submitting to Airtable:', error)
    return { success: false, error }
  }
}

/**
 * Get all signups from Airtable
 */
export async function getSignups(tableName: string = TABLES.LITURGISTS) {
  try {
    const table = getTable(tableName)
    const records = await table.select().all()
    
    return records.map((record) => ({
      id: record.id,
      serviceDate: record.get('Service Date'),
      displayDate: record.get('Display Date'),
      name: record.get('Name'),
      email: record.get('Email'),
      phone: record.get('Phone'),
      role: record.get('Role'),
      attendanceStatus: record.get('Attendance Status'),
      notes: record.get('Notes'),
      submittedAt: record.get('Submitted At'),
    }))
  } catch (error) {
    console.error('Error fetching from Airtable:', error)
    return []
  }
}

/**
 * Get a single signup record by ID
 */
export async function getSignupById(recordId: string, tableName: string = TABLES.LITURGISTS) {
  try {
    const table = getTable(tableName)
    const record = await table.find(recordId)
    return {
      success: true,
      record: {
        id: record.id,
        serviceDate: record.get('Service Date'),
        displayDate: record.get('Display Date'),
        name: record.get('Name'),
        email: record.get('Email'),
        phone: record.get('Phone'),
        role: record.get('Role'),
        attendanceStatus: record.get('Attendance Status'),
        notes: record.get('Notes'),
        submittedAt: record.get('Submitted At'),
      }
    }
  } catch (error) {
    console.error('Error fetching record from Airtable:', error)
    return { success: false, error }
  }
}

/**
 * Delete a signup from Airtable by record ID
 */
export async function deleteSignup(recordId: string, tableName: string = TABLES.LITURGISTS) {
  try {
    const table = getTable(tableName)
    await table.destroy([recordId])
    return { success: true }
  } catch (error) {
    console.error('Error deleting from Airtable:', error)
    return { success: false, error }
  }
}

export { base, getTable }
