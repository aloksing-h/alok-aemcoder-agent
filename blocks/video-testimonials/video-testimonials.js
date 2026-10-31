/*
 * Video Testimonials Block
 * Expanding card carousel; the video plays in a dialog, loaded only when the user presses play.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// interface wording of the controls
const UI = {
  play: 'Play',
  close: 'Close',
  previous: 'Previous video',
  next: 'Next video',
  error: 'Sorry, this video could not be played.',
};

const VISIBLE = 3;
const SWIPE_THRESHOLD = 40;
const VIDEO_MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
};

function toUrl(href) {
  try {
    return href ? new URL(href, window.location.href) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns the embed URL for YouTube and Vimeo links, null for other links.
 * @param {URL} url
 * @returns {string|null}
 */
function getEmbedSrc(url) {
  if (/(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/.test(url.hostname)) {
    let id = url.searchParams.get('v');
    const [, kind, path] = url.pathname.split('/');
    if (url.hostname === 'youtu.be') id = kind;
    if (['embed', 'shorts', 'live'].includes(kind)) id = path;
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
  }
  if (/(^|\.)vimeo\.com$/.test(url.hostname)) {
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
  return null;
}

/**
 * Creates the player for one testimonial.
 * @param {{ url: URL, title: string, poster: string }} item
 * @returns {HTMLElement}
 */
function createPlayer(item) {
  const embed = getEmbedSrc(item.url);
  if (embed) {
    const iframe = document.createElement('iframe');
    iframe.className = 'video-testimonials-player';
    iframe.src = embed;
    iframe.title = item.title;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    return iframe;
  }
  const video = document.createElement('video');
  video.className = 'video-testimonials-player';
  video.controls = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('aria-label', item.title);
  if (item.poster) video.poster = item.poster;
  const source = document.createElement('source');
  source.src = item.url.href;
  const ext = item.url.pathname.split('.').pop().toLowerCase();
  if (VIDEO_MIME[ext]) source.type = VIDEO_MIME[ext];
  video.append(source);
  const fail = () => {
    const message = document.createElement('p');
    message.className = 'video-testimonials-error';
    message.setAttribute('role', 'alert');
    message.textContent = UI.error;
    video.replaceWith(message);
  };
  source.addEventListener('error', fail);
  video.addEventListener('error', fail);
  return video;
}

function iconButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  button.innerHTML = '<span class="video-testimonials-icon" aria-hidden="true"></span>';
  return button;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const textRow = rows.find((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);

  const header = document.createElement('div');
  header.className = 'video-testimonials-header';
  header.append(...(textRow?.firstElementChild?.childNodes || []));
  const heading = header.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && !heading.id) heading.id = `video-testimonials-${Math.random().toString(36).slice(2, 8)}`;

  const items = itemRows.map((row, i) => {
    const [imageCell, videoCell] = row.children;
    const picture = imageCell?.querySelector('picture');
    const link = videoCell?.querySelector('a[href]');
    const img = picture?.querySelector('img');
    const title = link?.title.trim() || img?.alt || `${i + 1} / ${itemRows.length}`;

    const card = document.createElement('div');
    card.className = 'video-testimonials-card';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `${i + 1} / ${itemRows.length}`);
    moveInstrumentation(row, card);
    if (picture) card.append(picture);
    // native image dragging would cancel the swipe gesture
    if (img) img.draggable = false;

    const url = toUrl(link?.href || '');
    let play = null;
    if (url) {
      play = iconButton('video-testimonials-play', `${UI.play}: ${title}`);
      card.append(play);
    }
    return {
      card, play, url, title, poster: img?.currentSrc || img?.src || '',
    };
  });

  const carousel = document.createElement('div');
  carousel.className = 'video-testimonials-carousel';
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-roledescription', 'carousel');
  if (heading) carousel.setAttribute('aria-labelledby', heading.id);
  const track = document.createElement('div');
  track.className = 'video-testimonials-track';
  track.append(...items.map((item) => item.card));
  carousel.append(track);

  const pagination = document.createElement('div');
  pagination.className = 'video-testimonials-pagination';
  const dots = items.map((item) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'video-testimonials-dot';
    dot.setAttribute('aria-label', item.title);
    pagination.append(dot);
    return dot;
  });
  if (items.length > 1) carousel.append(pagination);

  let active = 0;
  const show = (index) => {
    active = (index + items.length) % items.length;
    // cards keep their authored order; a window of VISIBLE cards around the active one is shown
    const start = Math.max(0, Math.min(active - 1, items.length - VISIBLE));
    items.forEach((item, i) => {
      const inWindow = i >= start && i < start + VISIBLE;
      if (i === active) item.card.dataset.position = '0';
      else item.card.dataset.position = inWindow ? 'strip' : 'hidden';
      // narrow cards stay clickable (they expand); their play button is hidden until then
      const isActive = i === active;
      item.card.setAttribute('aria-hidden', String(!isActive));
    });
    dots.forEach((dot, i) => {
      if (i === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  // a swipe ends with a click, which must not switch the card a second time
  let swiped = false;
  track.addEventListener('click', (event) => {
    if (swiped) {
      swiped = false;
      return;
    }
    const card = event.target.closest('.video-testimonials-card');
    if (card && card.dataset.position !== '0') show(items.findIndex((item) => item.card === card));
  });
  let startX = null;
  track.addEventListener('pointerdown', (event) => { startX = event.clientX; });
  track.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      swiped = true;
      show(active + (delta < 0 ? 1 : -1));
    }
  });
  track.addEventListener('pointercancel', () => { startX = null; });
  pagination.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    show(active + (event.key === 'ArrowRight' ? 1 : -1));
    dots[active].focus();
  });

  // video dialog, created on first use
  let dialog = null;
  let stage = null;
  let current = 0;
  let prev = null;
  let next = null;
  const playable = items.filter((item) => item.url);

  const load = (index) => {
    current = index;
    const item = playable[current];
    dialog.setAttribute('aria-label', item.title);
    stage.replaceChildren(createPlayer(item));
    prev.disabled = current === 0;
    next.disabled = current === playable.length - 1;
    show(items.indexOf(item));
  };

  const openDialog = (item) => {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'video-testimonials-dialog';
      const close = iconButton('video-testimonials-close', UI.close);
      prev = iconButton('video-testimonials-prev', UI.previous);
      next = iconButton('video-testimonials-next', UI.next);
      stage = document.createElement('div');
      stage.className = 'video-testimonials-stage';
      const nav = document.createElement('div');
      nav.className = 'video-testimonials-nav';
      nav.append(prev, next);
      dialog.append(close, stage, nav);
      close.addEventListener('click', () => dialog.close());
      prev.addEventListener('click', () => load(current - 1));
      next.addEventListener('click', () => load(current + 1));
      // a click on the backdrop closes the dialog
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      // removing the player stops playback; focus returns to the card now in front
      dialog.addEventListener('close', () => {
        stage.replaceChildren();
        items[active].play?.focus();
      });
      block.append(dialog);
    }
    dialog.showModal();
    load(playable.indexOf(item));
    if (playable.length < 2) dialog.querySelector('.video-testimonials-nav').hidden = true;
  };

  items.forEach((item) => item.play?.addEventListener('click', () => openDialog(item)));

  block.replaceChildren(header, carousel);
  if (items.length) show(0);
}
