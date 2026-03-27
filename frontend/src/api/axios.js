import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'

// ── Spring Boot backend client
export const backendClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// ── Flask AI service client
export const aiClient = axios.create({
  baseURL: import.meta.env.VITE_AI_SERVICE_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000,   // longer — STT can take a few seconds
  headers: { Accept: 'application/json' },
  // NOTE: do NOT set Content-Type globally — FormData uploads need it omitted
  //       so the browser can set the correct multipart boundary automatically.
})

// ── Attach JWT to every request ──────────────────────────────────────
function attachToken(config) {
  const token = useAuthStore.getState().token
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
}

backendClient.interceptors.request.use(attachToken, Promise.reject)
aiClient.interceptors.request.use(attachToken, Promise.reject)

// ── Global response error handler ───────────────────────────────────
function handleError(error) {
  const status  = error?.response?.status
  const message = error?.response?.data?.message
              || error?.response?.data?.error
              || error?.message
              || 'Something went wrong'

  if (status === 401) {
    useAuthStore.getState().logout()
    toast.error('Session expired. Please login again.')
    window.location.href = '/login'
  } else if (status === 403) {
    toast.error('Permission denied.')
  } else if (status === 404) {
    toast.error('Resource not found.')
  } else if (status >= 500) {
    toast.error('Server error. Please try again.')
  } else if (!error.response) {
    toast.error('Network error — check that backend services are running.')
  } else {
    // Surface AI / backend business errors directly to the UI
    toast.error(message)
  }

  return Promise.reject(error)
}

backendClient.interceptors.response.use(r => r, handleError)
aiClient.interceptors.response.use(r => r, handleError)

export default backendClient