import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './routes/index.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #1e3a5f',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.875rem',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#22d3ee', secondary: '#0f172a' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  )
}