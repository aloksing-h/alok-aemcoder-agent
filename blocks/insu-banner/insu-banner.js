/*
 * Insu Banner Block
 * Inner page banner: heading, description, call to action, reading time, views,
 * a share menu (email, WhatsApp, copy link) and an illustration.
 */

// interface wording of the controls
const UI = {
  share: 'Share this page',
  email: 'Share by email',
  whatsapp: 'Share on WhatsApp',
  copy: 'Copy link',
  copied: 'Link copied',
  copyFailed: 'Could not copy the link',
};

let bannerCount = 0;

function icon(name) {
  const span = document.createElement('span');
  span.className = `insu-banner-icon insu-banner-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/**
 * Builds the call to action from the authored link.
 * @param {Element} [cell]
 * @returns {HTMLAnchorElement|null}
 */
function buildCta(cell) {
  const source = cell?.querySelector('a[href]');
  if (!source) return null;
  const a = document.createElement('a');
  a.href = source.href;
  a.className = 'insu-banner-cta';
  if (source.title) a.title = source.title;
  const label = document.createElement('span');
  label.className = 'insu-banner-cta-label';
  label.textContent = source.textContent.trim();
  const arrow = document.createElement('span');
  arrow.className = 'insu-banner-cta-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.append(icon('arrow'));
  a.append(label, arrow);
  return a;
}

/**
 * Builds the reading time and views from the authored meta cell.
 * @param {Element} [cell]
 * @returns {HTMLElement[]}
 */
function buildStats(cell) {
  const values = [...(cell?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  if (!values.length && cell?.textContent.trim()) values.push(cell.textContent.trim());
  return values.filter(Boolean).slice(0, 2).map((value, i) => {
    const item = document.createElement('span');
    item.className = 'insu-banner-stat';
    const text = document.createElement('span');
    text.textContent = value;
    item.append(icon(i === 0 ? 'clock' : 'eye'), text);
    return item;
  });
}

/**
 * Builds the share button and its menu.
 * @param {string} id
 * @returns {HTMLElement}
 */
function buildShare(id) {
  const share = document.createElement('div');
  share.className = 'insu-banner-share';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'insu-banner-share-toggle';
  toggle.setAttribute('aria-label', UI.share);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', `${id}-share`);
  toggle.append(icon('share'));

  const menu = document.createElement('div');
  menu.className = 'insu-banner-share-menu';
  menu.id = `${id}-share`;
  menu.hidden = true;

  const url = window.location.href.split('#')[0];
  const { title } = document;

  const email = document.createElement('a');
  email.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  email.setAttribute('aria-label', UI.email);
  email.append(icon('mail'));

  const whatsapp = document.createElement('a');
  whatsapp.href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  whatsapp.target = '_blank';
  whatsapp.rel = 'noopener noreferrer';
  whatsapp.setAttribute('aria-label', UI.whatsapp);
  whatsapp.append(icon('whatsapp'));

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.setAttribute('aria-label', UI.copy);
  copy.append(icon('copy'));

  [email, whatsapp, copy].forEach((el) => el.classList.add('insu-banner-share-option'));
  menu.append(email, whatsapp, copy);

  const status = document.createElement('span');
  status.className = 'insu-banner-share-status';
  status.setAttribute('role', 'status');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (!open) status.textContent = '';
  };

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = UI.copied;
    } catch (e) {
      status.textContent = UI.copyFailed;
    }
  });
  share.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  // the menu closes when focus or a click moves elsewhere on the page
  share.addEventListener('focusout', (event) => {
    if (!share.contains(event.relatedTarget) && event.relatedTarget) setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !share.contains(event.target)) setOpen(false);
  });

  share.append(toggle, menu, status);
  return share;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map((row) => row.firstElementChild || row);
  const textCell = cells[0];
  const linkCell = cells.find((cell, i) => i > 0 && cell.querySelector('a[href]') && !cell.querySelector('picture, img'));
  const imageCell = cells.find((cell, i) => i > 0 && cell.querySelector('picture, img'));
  const metaCell = cells.find((cell, i) => i > 0 && cell !== linkCell && cell !== imageCell);

  bannerCount += 1;
  const id = `insu-banner-${bannerCount}`;

  const content = document.createElement('div');
  content.className = 'insu-banner-content';

  const text = document.createElement('div');
  text.className = 'insu-banner-text';
  text.append(...(textCell?.childNodes || []));
  text.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('insu-banner-title');
  content.append(text);

  const cta = buildCta(linkCell);
  if (cta) content.append(cta);

  const meta = document.createElement('div');
  meta.className = 'insu-banner-meta';
  const stats = buildStats(metaCell);
  meta.append(...stats);
  if (stats.length) {
    const divider = document.createElement('span');
    divider.className = 'insu-banner-divider';
    divider.setAttribute('aria-hidden', 'true');
    meta.append(divider);
  }
  meta.append(buildShare(id));
  content.append(meta);

  const body = document.createElement('div');
  body.className = 'insu-banner-body';
  body.append(content);

  // illustration: the first image, and an optional second one for mobile
  const images = [...(imageCell?.querySelectorAll('picture') || [])];
  if (!images.length) images.push(...(imageCell?.querySelectorAll('img') || []));
  if (images.length) {
    const illustration = document.createElement('div');
    illustration.className = 'insu-banner-illustration';
    if (images.length > 1) illustration.classList.add('insu-banner-illustration-has-mobile');
    const imgOf = (image) => (image.tagName === 'IMG' ? image : image.querySelector('img'));
    // the mobile illustration shows the same picture, so it takes the authored alt text
    const alt = imgOf(images[0])?.alt || '';
    images.slice(0, 2).forEach((image, i) => {
      const img = imgOf(image);
      if (img) img.alt = alt;
      image.classList.add(i === 0 ? 'insu-banner-illustration-default' : 'insu-banner-illustration-mobile');
      illustration.append(image);
    });
    body.append(illustration);
  }

  block.replaceChildren(body);
}
