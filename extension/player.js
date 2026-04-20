const params = new URLSearchParams(window.location.search);
const videoId = params.get('v');

if (videoId) {
  const url = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1`;
  document.getElementById('yt').src = url;
}
