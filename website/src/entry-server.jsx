import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App.jsx'

export { routes, notFound } from './App.jsx'

// Used only at build time by prerender.js - never shipped to the browser.
// Renders one URL of the site to an HTML string, wrapped exactly like
// main.jsx wraps it, so the browser can hydrate it without mismatches.
export function render(url) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
}
