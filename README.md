# 🪸 ReefCams

Beautiful wildlife live cams on every new tab.

---

## Setup

### 1. Supabase

1. Go to your Supabase project → **SQL Editor**
2. Run `supabase/schema.sql`
3. Run `supabase/seed.sql`
4. Go to **Authentication → Providers** and enable **Google** (add your OAuth credentials)

### 2. Configure the Extension

Open `extension/supabase.js` and replace:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const HOSTED_PLAYER_BASE_URL = 'https://YOUR_HOSTED_PLAYER_DOMAIN';
```

Get the Supabase values from: Supabase → **Project Settings → API**

`HOSTED_PLAYER_BASE_URL` should point to a deployed HTTPS copy of the `hosted-player/` folder.

Example:

```js
const HOSTED_PLAYER_BASE_URL = 'https://reefcams-player.yourdomain.com';
```

### 3. Load in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 4. Icons

Add PNG icons to `extension/icons/`:
- `icon16.png` (16×16)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

You can use any reef/wave icon for now.

---

## Folder Structure

```
ReefCams/
├── supabase/
│   ├── schema.sql      ← Run first
│   └── seed.sql        ← Run second (loads the 6 cams)
└── extension/
    ├── manifest.json
    ├── supabase.js     ← Add your Supabase credentials here
    ├── newtab.html / newtab.css / newtab.js
    └── icons/
```

```
hosted-player/
├── player.html
└── player.js
```

Deploy `hosted-player/` to any static HTTPS host. The extension loads that page inside the new-tab iframe, and the hosted page embeds the YouTube livestream.

---

## Adding More Cams

Just insert rows directly into `reefcams_catalog` in your Supabase dashboard.  
YouTube embed URL format: `https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1`  
Thumbnail: `https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg`

---

## Publishing to Chrome Web Store

1. Zip the `extension/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip, fill in details, submit for review

Chrome auto-updates the extension for all users when you publish a new version (bump the `version` in `manifest.json`).
