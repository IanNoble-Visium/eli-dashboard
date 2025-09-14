import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TimeRangeProvider } from '@/context/TimeRangeContext'
import { AuthProvider } from '@/context/AuthContext'
import { AlertsProvider } from '@/context/AlertsContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TimeRangeProvider>
        <AlertsProvider>
          <App />
        </AlertsProvider>
      </TimeRangeProvider>
    </AuthProvider>
  </StrictMode>,
)
