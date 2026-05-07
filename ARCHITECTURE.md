# ReefCams Architecture

## Core Principle: Stream Load Time is Everything

**Stream load time is the single most important metric for this product.** Every technical decision must be evaluated against its impact on how fast the stream appears after a user opens a new tab or switches cams.

Rules that follow from this:
- Nothing on the critical path (auth → cam list → player iframe → YouTube) may be made synchronous or blocking without strong justification
- All analytics, telemetry, and non-essential network calls must be fire-and-forget — never awaited before rendering
- UI interactions (add cam, remove cam, reorder) must use optimistic updates so the interface never waits on Supabase
- Any new feature that touches the boot sequence or the iframe loading chain must be benchmarked against `reefcams_stream_load_events` before shipping

---

## Overview

ReefCams is a Chrome extension that replaces the new tab page with a live wildlife camera viewer. It is built across three components that are deployed and versioned independently.

```
Chrome Extension (newtab.html/js)
    │
    │  iframe
    ▼
Hosted Player (reefcams.vercel.app/player.html)
    │
    │  iframe
    ▼
YouTube Live Stream Embed
```

---

## Components

### 1. Chrome Extension
- Overrides the new tab page via Manifest V3
- Authenticates users anonymously via Supabase on first load
- Fetches the user's cam list from Supabase and caches it in localStorage
- Renders the sidebar and loads the selected stream into an iframe pointing to the hosted player
- **No build step** — plain HTML/CSS/JS, loaded unpacked or via Chrome Web Store

### 2. Hosted Player (`reefcams.vercel.app`)
- A static page deployed to Vercel, separate from the extension
- Receives the YouTube video ID, cam title, thumbnail, and user ID as URL params
- Embeds the YouTube livestream in an iframe with `enablejsapi=1`
- Handles loading states, retry logic, and telemetry
- **Deployed independently from the extension** — speed improvements here take effect for all users immediately, regardless of which extension version they have installed

### 3. Supabase Backend
- Stores the global cam catalog (`reefcams_catalog`)
- Stores each user's selected cams (`reefcams_user_cams`)
- Stores stream load telemetry (`reefcams_stream_load_events`)
- Stores notification banners (`reefcams_notifications`)
- Anonymous auth: users are signed in automatically with no account required
- localStorage cache in the extension means Supabase is not on the critical path for returning users

---

## Stream Loading Flow

1. User opens a new tab
2. Extension boots, checks localStorage for cached session and cam list
3. If cache exists, sidebar and first stream render immediately (no Supabase wait)
4. `showCam()` sets the outer iframe src to `https://reefcams.vercel.app/player.html?v=VIDEO_ID&...`
5. Hosted player loads (static asset from Vercel CDN, fast)
6. Hosted player sets the inner iframe src to the YouTube embed URL with `enablejsapi=1`
7. YouTube iframe loads and sends postMessage state events
8. On `playerState 1` (playing) or `3` (buffering), loading overlay fades out and stream is visible

---

## Key Decisions for Load Time

### Separate hosted player
The YouTube embed cannot be loaded directly inside the extension because Chrome extensions require HTTPS isolation for embedded iframes from external origins. The hosted player is a minimal static page — there is no server-side rendering or cold start, so the first hop (extension → player.html) is fast.

### localStorage cache
The extension caches the user's cam list in localStorage after the first Supabase fetch. On every subsequent new tab open, the sidebar and first stream load immediately from cache while a background Supabase fetch runs to check for updates. Supabase is not on the critical path for returning users.

### YouTube postMessage API (`enablejsapi=1`)
Rather than using a fixed timer to decide when to hide the loading overlay, the hosted player listens for `playerState 1` (playing) or `3` (buffering) via postMessage. This means the overlay disappears the moment the stream is actually ready — typically 1.3–1.9s — rather than waiting for an arbitrary timeout.

The handshake sequence:
1. On iframe `load`, send `{ event: 'listening' }` to YouTube
2. YouTube responds with `onReady`
3. Send `addEventListener onStateChange` command
4. YouTube sends state change events from then on

### Retry on no playback confirmation
YouTube live streams sometimes fail to start on first embed load — they silently get stuck in state `-1` (unstarted) without transitioning to buffering or playing. If postMessage has not confirmed playback within **3.5s**, the hosted player silently blanks the iframe src and reloads it once. This replicates the "switch away and come back" fix users previously had to do manually.

The 3.5s threshold was chosen based on telemetry: normal first loads confirm playback within 1.3–3.5s, so the timer gives them enough time to load naturally. Truly stuck streams (no postMessage at all) are caught and retried.

State `-1` (unstarted) is YouTube's normal initial state and is intentionally ignored — only the absence of any playback confirmation triggers the retry.

### Retry only once
After one retry, if YouTube still does not confirm playback within a further 2.5s, the overlay is removed regardless and whatever YouTube is showing (its own loading/error UI) becomes visible. This prevents the user from seeing a permanent loading screen.

### Optimistic UI updates
Add cam, remove cam, and reorder operations update local state and re-render immediately, then sync to Supabase in the background. On error they revert. This means the sidebar and modal never feel slow regardless of network conditions.

---

## Telemetry

Every stream load writes a row to `reefcams_stream_load_events` in Supabase via a fire-and-forget `fetch` with `keepalive: true`. This does not block or affect the player.

| Column | Description |
|---|---|
| `video_id` | YouTube video ID |
| `cam_title` | Cam name |
| `user_id` | Anonymous user ID passed from the extension |
| `event` | `revealed` or `retried` |
| `source` | How the event was triggered (see below) |
| `elapsed_ms` | Time from load start to this event |
| `retried` | Whether a retry happened before reveal |

**Sources:**
- `yt_state` — YouTube `onStateChange` postMessage confirmed playback
- `yt_info` — YouTube `infoDelivery` postMessage confirmed playback
- `no_playback_state` — 3.5s timer fired with no playback confirmation, retry triggered
- `force_reveal_retry` — 2.5s timer fired after retry with still no confirmation, forced reveal
