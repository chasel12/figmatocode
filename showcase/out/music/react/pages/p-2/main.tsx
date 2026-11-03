import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/global.css'
import './page.css'
import { PageP2 } from './PageP2'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')
createRoot(el).render(
  <StrictMode>
    <PageP2 />
  </StrictMode>,
)
