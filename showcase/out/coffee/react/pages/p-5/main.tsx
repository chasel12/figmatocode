import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/global.css'
import './page.css'
import { PageP5 } from './PageP5'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')
createRoot(el).render(
  <StrictMode>
    <PageP5 />
  </StrictMode>,
)
