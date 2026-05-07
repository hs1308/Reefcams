const params = new URLSearchParams(window.location.search);
const videoId = params.get('v');
const title = params.get('title') || 'ReefCams Player';
const thumbnail = params.get('thumb');
const player = document.getElementById('player');
const loading = document.getElementById('loading');
const loadingHint = document.getElementById('loading-hint');
const error = document.getElementById('error');
const errorText = document.getElementById('error-text');

let slowLoadTimer = null;
let retryTimer = null;
let revealed = false;
let retried = false;

document.title = title;

if (thumbnail) {
  loading.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.42)), url("${thumbnail.replace(/"/g, '%22')}")`;
}

function showError(message) {
  clearTimers();
  window.removeEventListener('message', onYouTubeMessage);
  player.style.display = 'none';
  loading.classList.add('hidden');
  error.style.display = 'flex';
  errorText.textContent = message;
}

function clearTimers() {
  if (slowLoadTimer) { window.clearTimeout(slowLoadTimer); slowLoadTimer = null; }
  if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = null; }
}

function revealPlayer() {
  if (revealed) return;
  revealed = true;
  clearTimers();
  window.removeEventListener('message', onYouTubeMessage);
  player.classList.add('ready');
  loading.classList.add('hidden');
}

// YouTube sends postMessage events when enablejsapi=1 is in the embed URL.
// playerState 1 = playing, 3 = buffering — either means content is live.
function onYouTubeMessage(event) {
  if (!event.origin.includes('youtube.com')) return;
  let data;
  try { data = JSON.parse(event.data); } catch { return; }
  const state = data?.info?.playerState;
  if (state === 1 || state === 3) revealPlayer();
}

function startLoad(embedUrl) {
  clearTimers();
  revealed = false;
  player.src = embedUrl;

  // If no playback state arrives within 3s, retry once automatically.
  // This replicates the "switch away and back" fix the user does manually.
  retryTimer = window.setTimeout(() => {
    if (revealed) return;
    if (!retried) {
      retried = true;
      player.src = '';
      window.setTimeout(() => startLoad(embedUrl), 150);
    } else {
      // Second attempt also timed out — reveal whatever YouTube is showing.
      revealPlayer();
    }
  }, 3000);

  slowLoadTimer = window.setTimeout(() => {
    loadingHint.classList.add('visible');
  }, 6000);
}

if (!videoId) {
  showError('No YouTube video ID was provided to the hosted player.');
} else {
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&enablejsapi=1`;
  window.addEventListener('message', onYouTubeMessage);
  startLoad(embedUrl);
}
