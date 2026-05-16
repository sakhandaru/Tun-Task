import type { Todo } from '../db/types'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

let tokenClient: any = null

export function initGoogleAuth() {
  if (typeof window === 'undefined' || !window.google) return
  
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (response: any) => {
      if (response.access_token) {
        localStorage.setItem('gcal_token', response.access_token)
        localStorage.setItem('gcal_token_expiry', Date.now() + response.expires_in * 1000 + '')
      }
    },
  })
}

export async function ensureAuth() {
  const token = localStorage.getItem('gcal_token')
  const expiry = localStorage.getItem('gcal_token_expiry')
  
  if (!token || !expiry || Date.now() > parseInt(expiry)) {
    return new Promise((resolve) => {
      tokenClient.callback = (response: any) => {
        if (response.access_token) {
          localStorage.setItem('gcal_token', response.access_token)
          localStorage.setItem('gcal_token_expiry', Date.now() + response.expires_in * 1000 + '')
          resolve(response.access_token)
        }
      }
      tokenClient.requestAccessToken({ prompt: 'none' })
    })
  }
  return token
}

export async function loginGoogle() {
  if (!tokenClient) initGoogleAuth()
  tokenClient.requestAccessToken({ prompt: 'consent' })
}

export async function syncTodoToCalendar(todo: Todo) {
  if (!todo.scheduledAt) return // Only sync if it has a time

  const token = await ensureAuth()
  if (!token) return

  const startTime = new Date(todo.scheduledAt)
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // Default 30 mins

  const event = {
    summary: todo.title,
    description: 'Sent from TunTask',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Jakarta',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Jakarta',
    },
  }

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
    
    if (response.ok) {
      console.log('GCal: Event created')
    }
  } catch (err) {
    console.error('GCal Sync Error:', err)
  }
}
