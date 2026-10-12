import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { HistoryPage } from './components/HistoryPage.tsx'
import { RadarPage } from './components/RadarPage.tsx'
import { isMapPage } from './lib/radarEmbed.ts'

// "?map=1" is the full-tab radar (see RadarPage), "?history=1" the weather
// history page; everything else is the dashboard.
const params = new URLSearchParams(window.location.search)
const page = isMapPage(window.location.search) ? <RadarPage /> : params.get('history') === '1' ? <HistoryPage /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
