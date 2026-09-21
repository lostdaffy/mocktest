import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Same value in the browser bundle and the prerender bundle, so the
  // footer's © year can never differ between the server HTML and what React
  // renders when it hydrates.
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },

  build: {
    // Vite's default CSS target is recent enough that the minifier rewrites
    // every `@media (min-width: 1024px)` into range syntax,
    // `@media (width >= 1024px)`. Safari before 16.4 (iOS 15 and early iOS 16)
    // doesn't understand that and silently drops the rule - so every
    // breakpoint in the site would vanish on those phones. Targeting slightly
    // older browsers keeps the classic, universally supported form.
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },

  server: { port: 4176, strictPort: true },
  preview: { port: 4176, strictPort: true },
})
