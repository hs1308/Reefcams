const params = new URLSearchParams(window.location.search);
const videoId = params.get('v');
const title = params.get('title') || 'ReefCams Player';
const player = document.getElementById('player');
const error = document.getElementById('error');
const errorText = document.getElementById('error-text');

document.title = title;

function showError(message) {
  player.style.display = 'none';
  error.style.display = 'flex';
  errorText.textContent = message;
}

if (!videoId) {
  showError('No YouTube video ID was provided to the hosted player.');
} else {
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1`;
  player.src = embedUrl;
}
