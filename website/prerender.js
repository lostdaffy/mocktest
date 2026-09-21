// Last step of `npm run build`: turns the React app into one real HTML file
// per page (dist/index.html, dist/terms/index.html, ...).
//
// Why bother, when the site already works as a React app: a plain React
// build ships an empty <div id="root"> and builds the page in the browser.
// Google, the Razorpay and Play Store reviewers who check the policy pages,
// and WhatsApp/Facebook link previews all read the raw HTML - with this step
// they see the full page, with its own title and description, instead of a
// blank shell. React then hydrates it in the browser as normal.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const DIST = join(ROOT, 'dist')
const SSR_DIR = join(ROOT, 'dist-ssr')

const { render, routes, notFound } = await import(pathToFileURL(join(SSR_DIR, 'entry-server.js')).href)

const site = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'))
const siteUrl = String(site.siteUrl || '').replace(/\/$/, '')
const template = readFileSync(join(DIST, 'index.html'), 'utf8')

for (const marker of ['<!--app-head-->', '<!--app-html-->']) {
  if (!template.includes(marker)) throw new Error(`index.html is missing the ${marker} marker`)
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function headTags(meta, urlPath) {
  const url = siteUrl + urlPath
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    meta.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(site.brandName)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${siteUrl}/images/og-image.jpg" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:locale" content="en_IN" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ]

  if (meta.organizationSchema) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.brandName,
      url: siteUrl,
      logo: `${siteUrl}/images/logo-mark.png`,
    }
    // `<` escaped so nothing inside the JSON can ever close the script tag.
    tags.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`)
  }

  return tags.join('\n    ')
}

function writePage(renderUrl, urlPath, outFile, meta) {
  // Function replacers, not strings: a "$" in page content would otherwise be
  // read as a replacement pattern and silently corrupt the output.
  const html = template
    .replace('<!--app-head-->', () => headTags(meta, urlPath))
    .replace('<!--app-html-->', () => render(renderUrl))

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, html)
  console.log(`  ${urlPath.padEnd(20)} -> ${outFile.slice(ROOT.length + 1).replace(/\\/g, '/')}`)
}

console.log('\nPrerendering pages:')

const sitemap = []
for (const { path, meta } of routes) {
  const urlPath = path === '/' ? '/' : `${path}/`
  const outFile = path === '/' ? join(DIST, 'index.html') : join(DIST, path.slice(1), 'index.html')
  writePage(urlPath, urlPath, outFile, meta)
  if (!meta.noindex) sitemap.push({ loc: siteUrl + urlPath, priority: path === '/' ? '1.0' : '0.5' })
}

// Served by the web server (.htaccess ErrorDocument) for any unknown URL.
// Rendered at a path no route matches, so it contains the NotFound page.
writePage('/__not-found__', '/404.html', join(DIST, '404.html'), notFound.meta)

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemap.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n',
)

rmSync(SSR_DIR, { recursive: true, force: true })

console.log(`\n✓ ${routes.length + 1} pages prerendered, sitemap.xml with ${sitemap.length} URLs`)

// Details a payment gateway / Play Store reviewer looks for. Missing ones show
// as yellow placeholders on the site, so they're listed on every build.
const REQUIRED = {
  legalName: 'Legal / proprietor name (policies and footer)',
  supportEmail: 'Support email that actually receives mail',
  businessAddress: 'Business address (payment gateways require it)',
  grievanceOfficerName: 'Grievance Officer name (Indian IT Rules)',
  jurisdictionCity: 'City for the governing-law clause in Terms',
}
const missing = Object.entries(REQUIRED).filter(([key]) => !String(site[key] || '').trim())
if (missing.length) {
  console.log('\n⚠️  Fill these in site.config.json before going live - they currently')
  console.log('   show as yellow placeholders on the policy and contact pages:\n')
  for (const [key, label] of missing) console.log(`   • ${key.padEnd(22)} ${label}`)
  console.log('')
}

if (!existsSync(join(DIST, '.htaccess'))) {
  console.log("⚠️  dist/.htaccess missing - HTTPS redirect, caching and the 404 page won't work.\n")
}
