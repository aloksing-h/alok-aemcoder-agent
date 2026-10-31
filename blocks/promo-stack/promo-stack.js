import { moveInstrumentation } from '../../scripts/scripts.js';

const SWIPE_THRESHOLD = 40;
const DRAG_START = 4;
const MAX_TILT = 12;
const VISIBLE_BEHIND = 2;
// keep in sync with --promo-duration
const LEAVE_DURATION = 500;
const AUTOPLAY_INTERVAL = 1500;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Text of an element with line breaks and blocks read as spaces, for accessible names.
 * @param {Element} element
 * @returns {string}
 */
function labelOf(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  clone.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li').forEach((node) => node.append(' '));
  return clone.textContent.replace(/\s+/g, ' ').trim();
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
  a.className = 'promo-stack-cta';
  a.innerHTML = '<span class="promo-stack-cta-label"></span><span class="promo-stack-cta-icon" aria-hidden="true"></span>';
  a.querySelector('.promo-stack-cta-label').textContent = source.textContent.trim();
  if (source.title) a.title = source.title;
  return a;
}

/**
 * Builds one promotional card from an authored item row.
 * @param {Element} row
 * @param {number} index
 * @param {number} total
 * @returns {HTMLElement}
 */
function buildCard(row, index, total) {
  const [tagCell, textCell, themeCell, linkCell] = row.children;
  const card = document.createElement('div');
  const theme = themeCell?.textContent.trim().toLowerCase() || 'red';
  card.className = `promo-stack-card promo-stack-card-${theme}`;
  card.setAttribute('role', 'group');
  card.setAttribute('aria-roledescription', 'slide');
  card.setAttribute('aria-label', `${index + 1} / ${total}`);
  moveInstrumentation(row, card);

  const tag = tagCell?.textContent.trim();
  if (tag) {
    const tagEl = document.createElement('p');
    tagEl.className = 'promo-stack-tag';
    tagEl.textContent = tag;
    card.append(tagEl);
  }

  const offer = document.createElement('div');
  offer.className = 'promo-stack-offer';
  offer.append(...(textCell?.childNodes || []));
  card.append(offer);

  const link = linkCell?.querySelector('a[href]');
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.className = 'promo-stack-card-link';
    // native link dragging would cancel the swipe gesture
    a.draggable = false;
    a.setAttribute('aria-label', labelOf(offer));
    card.append(a);
  }
  return card;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const [textRow, linkRow] = rows.filter((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);

  const content = document.createElement('div');
  content.className = 'promo-stack-content';
  content.append(...(textRow?.firstElementChild?.childNodes || []));
  const cta = buildCta(linkRow?.firstElementChild);
  if (cta) content.append(cta);

  const cards = itemRows.map((row, i) => buildCard(row, i, itemRows.length));
  const carousel = document.createElement('div');
  carousel.className = 'promo-stack-carousel';
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-roledescription', 'carousel');
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.id = heading.id || `promo-stack-${Math.random().toString(36).slice(2, 8)}`;
    carousel.setAttribute('aria-labelledby', heading.id);
  }

  const deck = document.createElement('div');
  deck.className = 'promo-stack-deck';
  deck.setAttribute('aria-live', 'polite');
  deck.append(...cards);
  carousel.append(deck);

  const pagination = document.createElement('div');
  pagination.className = 'promo-stack-pagination';
  const buttons = cards.map((card, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'promo-stack-page';
    button.textContent = pad(i + 1);
    button.setAttribute('aria-label', labelOf(card.querySelector('.promo-stack-offer')) || pad(i + 1));
    pagination.append(button);
    return button;
  });
  const line = document.createElement('span');
  line.className = 'promo-stack-line';
  line.setAttribute('aria-hidden', 'true');
  if (cards.length > 1) carousel.append(pagination);

  let active = 0;
  const show = (index) => {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) => {
      const position = (i - active + cards.length) % cards.length;
      card.dataset.position = position > VISIBLE_BEHIND ? 'hidden' : String(position);
      // cards behind stay clickable (they come forward) but out of the tab order
      const isActive = position === 0;
      card.setAttribute('aria-hidden', String(!isActive));
      card.querySelectorAll('a, button').forEach((el) => { el.tabIndex = isActive ? 0 : -1; });
    });
    buttons.forEach((button, i) => {
      if (i === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    buttons[active]?.after(line);
  };

  // next: the front card flies out, the cards behind move up; previous: the card flies back in
  let busy = false;
  // a page chosen while a card is still moving is shown once the motion ends
  let pending = null;
  let goTo;
  const done = () => {
    busy = false;
    if (pending !== null) {
      const index = pending;
      pending = null;
      goTo(index);
    }
  };
  const go = (delta) => {
    const target = active + delta;
    if (busy) return;
    if (REDUCED_MOTION.matches || cards.length < 2 || Math.abs(delta) !== 1) {
      show(target);
      return;
    }
    busy = true;
    if (delta === 1) {
      const leaving = cards[active];
      leaving.classList.add('is-leaving');
      show(target);
      setTimeout(() => {
        // put the card at the back of the stack without animating, then fade it in
        leaving.classList.add('is-instant', 'is-faded');
        leaving.classList.remove('is-leaving');
        leaving.getBoundingClientRect();
        leaving.classList.remove('is-instant');
        requestAnimationFrame(() => {
          leaving.classList.remove('is-faded');
          done();
        });
      }, LEAVE_DURATION);
    } else {
      const entering = cards[(active - 1 + cards.length) % cards.length];
      entering.classList.add('is-instant', 'is-leaving');
      entering.getBoundingClientRect();
      entering.classList.remove('is-instant');
      show(target);
      requestAnimationFrame(() => {
        entering.classList.remove('is-leaving');
        setTimeout(done, LEAVE_DURATION);
      });
    }
  };

  goTo = (index) => {
    if (busy) {
      pending = index;
      return;
    }
    const delta = (index - active + cards.length) % cards.length;
    if (delta === 1) go(1);
    else if (delta === cards.length - 1) go(-1);
    else if (delta) show(index);
  };

  buttons.forEach((button, i) => button.addEventListener('click', () => goTo(i)));

  // a drag ends with a click, which must not switch the card again or follow its link
  let dragged = false;

  // a card peeking behind the front card brings it forward
  deck.addEventListener('click', (event) => {
    if (dragged) {
      dragged = false;
      event.preventDefault();
      return;
    }
    const card = event.target.closest('.promo-stack-card');
    if (card && card.dataset.position !== '0') goTo(cards.indexOf(card));
  });

  // the front card follows the pointer, and is thrown away past the threshold
  deck.addEventListener('pointerdown', (event) => {
    const front = event.target.closest('.promo-stack-card[data-position="0"]');
    if (!front || busy || event.button > 0) return;
    const startX = event.clientX;
    let delta = 0;
    const move = (e) => {
      delta = e.clientX - startX;
      if (Math.abs(delta) < DRAG_START) return;
      dragged = true;
      front.classList.add('is-dragging');
      front.style.setProperty('--promo-drag', `${delta}px`);
      front.style.setProperty('--promo-tilt', `${Math.max(-MAX_TILT, Math.min(MAX_TILT, delta / 20))}deg`);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      front.classList.remove('is-dragging');
      front.style.removeProperty('--promo-drag');
      front.style.removeProperty('--promo-tilt');
      if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  });

  carousel.addEventListener('keydown', (event) => {
    if (!event.target.closest('.promo-stack-pagination')) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    go(event.key === 'ArrowRight' ? 1 : -1);
    buttons[active].focus();
  });

  block.replaceChildren(content, carousel);
  if (cards.length) show(0);

  // auto-slide; paused while the user hovers, focuses, drags or cannot see it
  const autoplay = cards.length > 1
    && !block.classList.contains('no-autoplay')
    && !REDUCED_MOTION.matches
    && !document.documentElement.classList.contains('adobe-ue-edit');
  if (!autoplay) return;
  let timer = null;
  let hovering = false;
  let focused = false;
  let pressing = false;
  let inView = false;
  const schedule = () => {
    clearTimeout(timer);
    if (hovering || focused || pressing || !inView || document.hidden) return;
    timer = setTimeout(() => {
      go(1);
      schedule();
    }, AUTOPLAY_INTERVAL);
  };
  block.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  block.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  block.addEventListener('focusin', () => { focused = true; schedule(); });
  block.addEventListener('focusout', (event) => {
    if (block.contains(event.relatedTarget)) return;
    focused = false;
    schedule();
  });
  deck.addEventListener('pointerdown', () => { pressing = true; schedule(); });
  window.addEventListener('pointerup', () => {
    if (!pressing) return;
    pressing = false;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }, { threshold: 0.5 }).observe(deck);
}
