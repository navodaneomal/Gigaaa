# 🐷🏐 Piggy’s Netball Mission: deploy

This folder is the whole site. It is static, so there is no build step, no server code and nothing to install.

## Vercel (recommended)

**Option 1: CLI (about one minute)**

```bash
cd piggys-netball-mission
npx vercel          # first time: log in, accept the defaults (framework: "Other")
npx vercel --prod   # publish to your production URL
```

**Option 2: Dashboard via GitHub**

1. Put this folder in a GitHub repo, either at the root or in a subfolder.
2. On vercel.com, go to **Add New… → Project** and import that repo.
3. Use these settings:
   - **Framework Preset:** *Other*
   - **Build Command:** leave empty
   - **Output Directory:** leave empty
   - **Root Directory:** the subfolder, if you used one
4. Click **Deploy**.

`vercel.json` turns on clean URLs, sensible caching for fonts and icons, and a few security headers. No environment variables are needed.

## Anywhere else

- **Netlify:** drag this folder onto <https://app.netlify.com/drop>.
- **GitHub Pages or Cloudflare Pages:** publish this folder as-is.
- **Offline:** double-click `index.html`. Fonts are embedded for `file://`.

## Editing

- **All text:** `data/messages.js`
- **All timing:** `data/timing.js`. Setting `speed: 1.2` makes the whole film 20% faster.

Redeploy after editing.
