const params = new URLSearchParams(window.location.search);
const videoId = params.get('v');
const title = params.get('title') || 'ReefCams Player';
const thumbnail = params.get('thumb');
const player = document.getElementById('player');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorText = document.getElementById('error-text');

document.title = title;

if (thumbnail) {
  loading.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.42)), url("${thumbnail.replace(/"/g, '%22')}")`;
}

function showError(message) {
  player.style.display = 'none';
  loading.classList.add('hidden');
  error.style.display = 'flex';
  errorText.textContent = message;
}

function revealPlayer() {
  player.classList.add('ready');
  loading.classList.add('hidden');
}

if (!videoId) {
  showError('No YouTube video ID was provided to the hosted player.');
} else {
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1`;
  player.addEventListener('load', revealPlayer, { once: true });
  player.src = embedUrl;

  window.setTimeout(revealPlayer, 2500);
}
