const SUPABASE_URL = 'https://auwbrydulogqlscfymbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1d2JyeWR1bG9ncWxzY2Z5bWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyMzgsImV4cCI6MjA4NTk2MjIzOH0.0iylWRsxOnu265xefq0Ly7_qIOmH50x1spUn6V5WunY';

const params = new URLSearchParams(window.location.search);
const videoId = params.get('v');
const title = params.get('title') || 'ReefCams Player';
const thumbnail = params.get('thumb');
const player = document.getElementById('player');
const loading = document.getElementById('loading');
const loadingHint = document.getElementById('loading-hint');
const error = document.getElementById('error');
const errorText = document.getElementById('error-text');

let revealTimer = null;
let hintTimer = null;
let revealed = false;
let retried = false;
let loadStart = Date.now();
let embedUrl = null;

document.title = title;

if (thumbnail) {
  loading.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.42)), url("${thumbnail.replace(/"/g, '%22')}")`;
}

function log(...args) {
  console.log('[ReefCams]', ...args);
}

function logToSupabase(event, source, elapsedMs) {
  try {
    fetch(`${SUPABASE_URL}/rest/v1/stream_load_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([{ video_id: videoId, cam_title: title, event, source, elapsed_ms: elapsedMs, retried }]),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}
}

function showError(message) {
  clearTimeout(revealTimer);
  clearTimeout(hintTimer);
  window.removeEventListener('message', onYouTubeMessage);
  player.style.display = 'none';
  loading.classList.add('hidden');
  error.style.display = 'flex';
  errorText.textContent = message;
}

function revealPlayer(source) {
  if (revealed) return;
  revealed = true;
  clearTimeout(revealTimer);
  clearTimeout(hintTimer);
  window.removeEventListener('message', onYouTubeMessage);
  const elapsed = Date.now() - loadStart;
  log(`revealed via "${source}" at ${elapsed}ms, retried=${retried}`);
  logToSupabase('revealed', source, elapsed);
  player.classList.add('ready');
  loading.classList.add('hidden');
}

// YouTube API handshake: on iframe load, tell YouTube we're listening.
// YouTube responds with onReady, then we subscribe to state changes.
function initYouTubeApi() {
  try {
    player.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
  } catch (e) {}
}

function onYouTubeMessage(event) {
  if (!event.origin.includes('youtube.com')) return;
  let data;
  try { data = JSON.parse(event.data); } catch { return; }

  if (data.event === 'onReady') {
    log('YouTube onReady at', Date.now() - loadStart, 'ms');
    try {
      player.contentWindow.postMessage(JSON.stringify({
        event: 'command', func: 'addEventListener', args: ['onStateChange']
      }), 'https://www.youtube.com');
    } catch (e) {}
    return;
  }

  // playerState: -1=unstarted, 1=playing, 2=paused, 3=buffering
  const state = data.event === 'onStateChange' && typeof data.info === 'number'
    ? data.info
    : data.event === 'infoDelivery' && data.info?.playerState != null
    ? data.info.playerState
    : null;

  if (state === null) return;
  log('player state', state, 'at', Date.now() - loadStart, 'ms');

  if (state === 1 || state === 3) {
    revealPlayer(data.event === 'onStateChange' ? 'yt_state' : 'yt_info');
  } else if (state === -1 && !retried && !revealed) {
    doRetry();
  }
}

function doRetry() {
  retried = true;
  clearTimeout(revealTimer);
  clearTimeout(hintTimer);
  loadingHint.classList.remove('visible');
  log('stream unstarted — retrying at', Date.now() - loadStart, 'ms');
  logToSupabase('retried', 'yt_state_unstarted', Date.now() - loadStart);
  player.src = '';
  loadStart = Date.now();
  setTimeout(() => {
    player.src = embedUrl;
    revealTimer = setTimeout(() => revealPlayer('force_reveal_retry'), 2500);
    hintTimer = setTimeout(() => loadingHint.classList.add('visible'), 6000);
  }, 150);
}

if (!videoId) {
  showError('No YouTube video ID was provided to the hosted player.');
} else {
  embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1`;

  player.addEventListener('load', initYouTubeApi);
  window.addEventListener('message', onYouTubeMessage);

  player.src = embedUrl;
  loadStart = Date.now();

  // Same 2.5s force-reveal as the original — no added delay if postMessage doesn't fire
  revealTimer = setTimeout(() => revealPlayer('force_reveal'), 2500);
  hintTimer = setTimeout(() => loadingHint.classList.add('visible'), 6000);
}
