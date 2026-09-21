import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // The public website owns the root of rankveer.com, so the admin panel is
  // served from rankveer.com/admin/. Every asset URL, the router basename
  // and the logout redirect all derive from this one value via
  // import.meta.env.BASE_URL - change it here and nowhere else.
  //
  // (A separate admin.rankveer.com would be cleaner, but that needs a DNS
  // record we can't add until the registrar lock on the domain is lifted.)
  base: '/admin/',
})
