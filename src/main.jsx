import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TimeRangeProvider } from '@/context/TimeRangeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TimeRangeProvider>
      <App />
    </TimeRangeProvider>
  </StrictMode>,
)
