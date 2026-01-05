// Liturgist Contact Information
// This file contains the list of regular and occasional liturgists

export interface Liturgist {
  name: string
  email: string
  phone?: string
  frequency: 'regular' | 'occasional'
}

export const liturgists: Liturgist[] = [
  // Regular Liturgists
  {
    name: 'Kay Lieberknecht',
    email: 'kay.hoofin.it@gmail.com',
    frequency: 'regular'
  },
  {
    name: 'Linda Nagel',
    email: 'lindab.nagel@gmail.com',
    frequency: 'regular'
  },
  {
    name: 'Lori Bialkowsky',
    email: 'lbialkowsky@hotmail.com',
    frequency: 'regular'
  },
  {
    name: 'Doug Pratt',
    email: 'dmpratt@sbcglobal.net',
    frequency: 'regular'
  },
  {
    name: 'Gwen Hardage-Vergeer',
    email: 'gwenehv@gmail.com',
    frequency: 'regular'
  },
  {
    name: 'Mikey Pitts KLMP',
    email: 'pitts.mikey8@gmail.com',
    frequency: 'regular'
  },
  {
    name: 'Michelle Linderman',
    email: 'chelle5869@gmail.com',
    phone: '707-485-4138',
    frequency: 'regular'
  },
  
  // Occasional Liturgists
  {
    name: 'Paula Martin',
    email: 'paulamartinukiah@gmail.com',
    frequency: 'occasional'
  },
  {
    name: 'Patrick Okey',
    email: 'pokey95519@gmail.com',
    frequency: 'occasional'
  },
  {
    name: 'Vicki Okey',
    email: 'vokey123@gmail.com',
    frequency: 'occasional'
  },
  {
    name: 'Chad Raugewitz',
    email: 'craugewitz@uusd.net',
    frequency: 'occasional'
  },
  {
    name: 'Samuel Holley',
    email: 'sam@samuelholley.com',
    frequency: 'regular'
  },
  {
    name: 'Test User',
    email: 'sam+test@samuelholley.com',
    frequency: 'regular'
  }
]

// Get all liturgists
export const getAllLiturgists = () => liturgists

// Get regular liturgists only
export const getRegularLiturgists = () => 
  liturgists.filter(l => l.frequency === 'regular')

// Get occasional liturgists only
export const getOccasionalLiturgists = () => 
  liturgists.filter(l => l.frequency === 'occasional')

// Get liturgist by email
export const getLiturgistByEmail = (email: string) => 
  liturgists.find(l => l.email.toLowerCase() === email.toLowerCase())

// Get all email addresses
export const getAllEmails = () => 
  liturgists.map(l => l.email)

// Get email addresses as comma-separated string
export const getEmailsAsString = () => 
  liturgists.map(l => l.email).join(', ')
