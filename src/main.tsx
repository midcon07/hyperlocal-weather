import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { RadarPage } from './components/RadarPage.tsx'
import { isMapPage } from './lib/radarEmbed.ts'

// "?map=1" is the full-tab radar (see RadarPage); everything else is the dashboard.
createRoot(document.getElementById('root')!).render(
  <StrictMode>{isMapPage(window.location.search) ? <RadarPage /> : <App />}</StrictMode>,
)
