/*
 * Blog Media Block
 * Shows the authored thumbnail first and loads the player (AEM Assets video / audio,
 * YouTube or Vimeo) only when the user activates the play button.
 */

// interface wording of the player controls
const UI = {
  play: 'Play',
  pause: 'Pause',
  seek: 'Seek',
  of: 'of',
  loading: 'Loading',
  error: 'Sorry, this media could not be played.',
  openFile: 'Open the media file',
};

const TYPES = ['image', 'video', 'audio', 'youtube', 'vimeo'];
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|oga|ogg|opus|flac)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)$/i;
const VIDEO_MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
};

// waveform: decoded at a low sample rate, only for short audio, to bound memory and data use
const WAVEFORM_MAX_SECONDS = 600;
const WAVEFORM_MAX_BYTES = 15 * 1024 * 1024;
const WAVEFORM_SAMPLE_RATE = 8000;
const WAVEFORM_PEAKS = 240;
const SEEK_STEP = 5;
const SEEK_PAGE = 30;

// only one blog media element plays at a time
const players = new Set();

function toUrl(href) {
  try {
    return href ? new URL(href, window.location.href) : null;
  } catch (e) {
    return null;
  }
}

function getType(block, url) {
  const authored = TYPES.find((type) => block.classList.contains(type));
  if (authored) return authored;
  if (!url) return 'image';
  if (/(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/.test(url.hostname)) return 'youtube';
  if (/(^|\.)vimeo\.com$/.test(url.hostname)) return 'vimeo';
  if (AUDIO_EXT.test(url.pathname)) return 'audio';
  if (VIDEO_EXT.test(url.pathname)) return 'video';
  return 'image';
}

function getYouTubeSrc(url) {
  let id = url.searchParams.get('v');
  if (url.hostname === 'youtu.be') [, id] = url.pathname.split('/');
  const [, kind, path] = url.pathname.split('/');
  if (['embed', 'shorts', 'live'].includes(kind)) id = path;
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  const src = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  src.searchParams.set('autoplay', '1');
  src.searchParams.set('rel', '0');
  src.searchParams.set('playsinline', '1');
  const start = url.searchParams.get('t') || url.searchParams.get('start');
  if (start) src.searchParams.set('start', parseInt(start, 10));
  return src.href;
}

function getVimeoSrc(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.findIndex((part) => /^\d+$/.test(part));
  if (index < 0) return null;
  const src = new URL(`https://player.vimeo.com/video/${parts[index]}`);
  const hash = url.searchParams.get('h') || parts[index + 1];
  if (hash && /^[\da-f]+$/i.test(hash)) src.searchParams.set('h', hash);
  src.searchParams.set('autoplay', '1');
  src.searchParams.set('dnt', '1');
  return src.href;
}

function formatTime(seconds) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function registerPlayer(media) {
  players.add(media);
  media.addEventListener('play', () => {
    players.forEach((other) => { if (other !== media) other.pause(); });
  });
}

function showError(frame, href) {
  frame.querySelectorAll('.blog-media-player, .blog-media-audio').forEach((el) => el.remove());
  frame.classList.remove('is-playing');
  const message = document.createElement('p');
  message.className = 'blog-media-error';
  message.setAttribute('role', 'alert');
  message.textContent = `${UI.error} `;
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = UI.openFile;
    message.append(a);
  }
  frame.append(message);
}

function embedIframe(frame, src, title) {
  const iframe = document.createElement('iframe');
  iframe.className = 'blog-media-player';
  iframe.src = src;
  iframe.title = title;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.append(iframe);
  iframe.focus();
}

function playVideo(frame, href, title, captionsHref) {
  const video = document.createElement('video');
  video.className = 'blog-media-player';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', title);
  const poster = frame.querySelector('img');
  if (poster) video.poster = poster.currentSrc || poster.src;

  const source = document.createElement('source');
  source.src = href;
  const ext = toUrl(href)?.pathname.split('.').pop().toLowerCase();
  if (VIDEO_MIME[ext]) source.type = VIDEO_MIME[ext];
  source.addEventListener('error', () => showError(frame, href));
  video.append(source);

  if (captionsHref) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = captionsHref;
    track.srclang = document.documentElement.lang || 'en';
    track.label = track.srclang.toUpperCase();
    track.default = true;
    video.append(track);
  }

  video.addEventListener('error', () => showError(frame, href));
  registerPlayer(video);
  frame.append(video);
  video.focus();
  video.play().catch(() => { /* playback stays available through the native controls */ });
}

/**
 * Reads the audio file and reduces it to normalized peak values.
 * @param {string} href audio file
 * @returns {Promise<Float32Array|null>}
 */
async function loadPeaks(href) {
  const Context = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Context) return null;
  const controller = new AbortController();
  const response = await fetch(href, { signal: controller.signal });
  if (!response.ok) return null;
  const length = Number(response.headers.get('content-length'));
  if (length > WAVEFORM_MAX_BYTES) {
    controller.abort();
    return null;
  }
  const data = await response.arrayBuffer();
  const context = new Context(1, 1, WAVEFORM_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(data);
  const channel = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(channel.length / WAVEFORM_PEAKS));
  const peaks = new Float32Array(WAVEFORM_PEAKS);
  let max = 0;
  for (let i = 0; i < WAVEFORM_PEAKS; i += 1) {
    let peak = 0;
    const end = Math.min(channel.length, (i + 1) * size);
    for (let j = i * size; j < end; j += 1) {
      const value = Math.abs(channel[j]);
      if (value > peak) peak = value;
    }
    peaks[i] = peak;
    if (peak > max) max = peak;
  }
  if (max > 0) peaks.forEach((peak, i) => { peaks[i] = peak / max; });
  return peaks;
}

function playAudio(frame, href, title) {
  const panel = document.createElement('div');
  panel.className = 'blog-media-audio';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', title);
  panel.innerHTML = `
    <button type="button" class="blog-media-toggle" aria-label="${UI.pause}">
      <span class="blog-icon blog-media-toggle-icon" aria-hidden="true"></span>
    </button>
    <div class="blog-media-wave" role="slider" tabindex="0" aria-label="${UI.seek}"
      aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="${formatTime(0)}">
      <canvas aria-hidden="true"></canvas>
      <span class="blog-media-progress" aria-hidden="true"></span>
    </div>
    <span class="blog-media-time" aria-hidden="true">${formatTime(0)}</span>
    <span class="blog-media-status" role="status">${UI.loading}</span>`;

  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.src = href;
  panel.append(audio);
  registerPlayer(audio);

  const toggle = panel.querySelector('.blog-media-toggle');
  const wave = panel.querySelector('.blog-media-wave');
  const canvas = wave.querySelector('canvas');
  const time = panel.querySelector('.blog-media-time');
  const status = panel.querySelector('.blog-media-status');
  let peaks = null;
  let frameRequest = 0;

  const progress = () => (audio.duration ? audio.currentTime / audio.duration : 0);

  const draw = () => {
    if (!peaks) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const styles = getComputedStyle(wave);
    const bar = parseFloat(styles.getPropertyValue('--blog-wave-bar')) || 2;
    const gap = parseFloat(styles.getPropertyValue('--blog-wave-gap')) || 2;
    const played = styles.getPropertyValue('--blog-wave-played').trim();
    const pending = styles.getPropertyValue('--blog-wave-pending').trim();
    const count = Math.max(1, Math.floor(width / (bar + gap)));
    const done = progress() * count;
    for (let i = 0; i < count; i += 1) {
      const peak = peaks[Math.floor((i / count) * peaks.length)];
      const h = Math.max(bar, peak * height);
      ctx.fillStyle = i < done ? played : pending;
      ctx.fillRect(i * (bar + gap), (height - h) / 2, bar, h);
    }
  };

  const update = () => {
    const { currentTime, duration } = audio;
    wave.setAttribute('aria-valuenow', String(Math.floor(currentTime)));
    wave.setAttribute('aria-valuetext', `${formatTime(currentTime)} ${UI.of} ${formatTime(duration)}`);
    wave.style.setProperty('--blog-wave-progress', String(progress()));
    time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    draw();
  };

  const loop = () => {
    update();
    frameRequest = window.requestAnimationFrame(loop);
  };

  const seekTo = (seconds) => {
    if (!audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, seconds));
    update();
  };

  const seekToPointer = (event) => {
    const rect = wave.getBoundingClientRect();
    seekTo(((event.clientX - rect.left) / rect.width) * audio.duration);
  };

  toggle.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  wave.addEventListener('pointerdown', (event) => {
    wave.setPointerCapture(event.pointerId);
    seekToPointer(event);
  });
  wave.addEventListener('pointermove', (event) => {
    if (wave.hasPointerCapture(event.pointerId)) seekToPointer(event);
  });
  wave.addEventListener('keydown', (event) => {
    const steps = {
      ArrowLeft: -SEEK_STEP,
      ArrowDown: -SEEK_STEP,
      ArrowRight: SEEK_STEP,
      ArrowUp: SEEK_STEP,
      PageDown: -SEEK_PAGE,
      PageUp: SEEK_PAGE,
    };
    if (event.key in steps) seekTo(audio.currentTime + steps[event.key]);
    else if (event.key === 'Home') seekTo(0);
    else if (event.key === 'End') seekTo(audio.duration);
    else return;
    event.preventDefault();
  });

  audio.addEventListener('loadedmetadata', () => {
    wave.setAttribute('aria-valuemax', String(Math.floor(audio.duration)));
    update();
    if (audio.duration <= WAVEFORM_MAX_SECONDS) {
      loadPeaks(href).then((result) => {
        if (!result) return;
        peaks = result;
        panel.classList.add('has-waveform');
        draw();
      }).catch(() => { /* keep the plain progress bar */ });
    }
  });
  audio.addEventListener('playing', () => { status.textContent = ''; });
  audio.addEventListener('waiting', () => { status.textContent = UI.loading; });
  audio.addEventListener('play', () => {
    toggle.setAttribute('aria-label', UI.pause);
    panel.classList.add('is-playing');
    window.cancelAnimationFrame(frameRequest);
    frameRequest = window.requestAnimationFrame(loop);
  });
  audio.addEventListener('pause', () => {
    toggle.setAttribute('aria-label', UI.play);
    panel.classList.remove('is-playing');
    window.cancelAnimationFrame(frameRequest);
    update();
  });
  audio.addEventListener('ended', () => { status.textContent = ''; });
  const resizeObserver = new ResizeObserver(() => draw());
  resizeObserver.observe(wave);

  audio.addEventListener('error', () => {
    window.cancelAnimationFrame(frameRequest);
    resizeObserver.disconnect();
    players.delete(audio);
    showError(frame, href);
  });

  frame.append(panel);
  toggle.focus();
  audio.play().catch(() => {
    toggle.setAttribute('aria-label', UI.play);
    status.textContent = '';
  });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [imageRow, mediaRow, captionsRow] = block.children;
  const picture = imageRow?.querySelector('picture');
  const mediaLink = mediaRow?.querySelector('a[href]');
  const href = mediaLink?.href || mediaRow?.textContent.trim() || '';
  const url = toUrl(href);
  const type = getType(block, url);
  const captionsHref = captionsRow?.querySelector('a[href]')?.href;
  const title = mediaLink?.title.trim() || picture?.querySelector('img')?.alt || '';

  const frame = document.createElement('div');
  frame.className = 'blog-media-frame';
  if (picture) frame.append(picture);
  block.replaceChildren(frame);
  block.dataset.mediaType = type;

  if (type === 'image' || !url) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blog-media-play';
  button.setAttribute('aria-label', title ? `${UI.play}: ${title}` : UI.play);
  button.innerHTML = '<span class="blog-icon blog-media-play-icon" aria-hidden="true"></span>';
  frame.append(button);

  button.addEventListener('click', () => {
    button.remove();
    frame.classList.add('is-playing');
    const label = title || UI.play;
    if (type === 'youtube' || type === 'vimeo') {
      const src = type === 'youtube' ? getYouTubeSrc(url) : getVimeoSrc(url);
      if (src) embedIframe(frame, src, label);
      else showError(frame, url.href);
    } else if (type === 'audio') {
      playAudio(frame, url.href, label);
    } else {
      playVideo(frame, url.href, label, captionsHref);
    }
  }, { once: true });
}
