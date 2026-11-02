/*
 * Insight Cards Block
 * Section heading and blog / video / podcast cards. The cards turn red on hover or focus and
 * become a swipeable carousel with pagination on mobile.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// interface wording of the controls
const UI = {
  pagination: 'Choose a card',
  card: (index, total) => `Card ${index} of ${total}`,
};

const CAROUSEL_QUERY = '(width < 900px)';

// labels of the badge types authors pick from; Other shows the author's custom text
const BADGES = {
  blog: 'Blog',
  video: 'Video',
  podcast: 'Podcast',
};

/**
 * Returns the values of a cell that groups several fields, in model order: paragraphs
 * (AEM delivery) or text nodes (plain HTML), without comments and empty text.
 * @param {Element} [cell]
 * @returns {Node[]}
 */
function cellNodes(cell) {
  return [...(cell?.childNodes || [])].filter((node) => node.nodeType === Node.ELEMENT_NODE
    || (node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
}

/**
 * Reads the badge cell: badge type, custom text (for Other) and the category label.
 * The custom text is only used with Other, so the last other value is the category.
 * @param {Element} [cell]
 * @returns {{ type: string, text: string, category: string }}
 */
function readBadge(cell) {
  const values = cellNodes(cell).map((node) => node.textContent.trim()).filter(Boolean);
  const first = (values[0] || '').toLowerCase();
  if (!BADGES[first] && first !== 'other') {
    // no badge type selected: only the category is left
    return { type: '', text: '', category: values.at(-1) || '' };
  }
  const rest = values.slice(1);
  if (first === 'other') return { type: first, text: rest[0] || '', category: rest[1] || '' };
  return { type: first, text: '', category: rest.at(-1) || '' };
}

function imgOf(image) {
  return image?.tagName === 'IMG' ? image : image?.querySelector('img');
}

/**
 * Builds one card from an authored item row.
 * @param {Element} row
 * @param {string} headingTag
 * @returns {HTMLLIElement}
 */
function buildCard(row, headingTag) {
  // cells: badge (type, custom text, category), title (title, description),
  // link (link, button icon), image (illustration, alt, hover illustration)
  const [tagCell, titleCell, linkCell, imageCell] = row.children;
  const li = document.createElement('li');
  li.className = 'insight-cards-card';
  moveInstrumentation(row, li);

  const body = document.createElement('div');
  body.className = 'insight-cards-body';

  // the badge is a type from the authoring dropdown; Other shows the custom text
  const badge = readBadge(tagCell);
  const tag = badge.type === 'other' ? badge.text : BADGES[badge.type];
  if (tag) {
    const tagEl = document.createElement('p');
    tagEl.className = 'insight-cards-tag';
    tagEl.textContent = tag;
    li.dataset.badge = badge.type;
    body.append(tagEl);
  }

  const { category } = badge;
  if (category) {
    const categoryEl = document.createElement('p');
    categoryEl.className = 'insight-cards-category';
    categoryEl.textContent = category;
    body.append(categoryEl);
  }

  const heading = document.createElement(headingTag);
  heading.className = 'insight-cards-card-title';
  // the first value is the title, the rest is the description
  const [titleNode, ...descriptionNodes] = cellNodes(titleCell);
  const title = titleNode?.textContent.trim() || '';
  const link = linkCell?.querySelector('a[href]');
  const href = link?.href;
  if (href) {
    const a = document.createElement('a');
    a.className = 'insight-cards-link';
    a.href = href;
    a.textContent = title;
    heading.append(a);
  } else {
    heading.textContent = title;
  }
  body.append(heading);

  if (descriptionNodes.some((node) => node.textContent.trim())) {
    const description = document.createElement('div');
    description.className = 'insight-cards-description';
    description.append(...descriptionNodes);
    body.append(description);
  }
  li.append(body);

  // the whole card is the link; the round button is its visual cue only
  const iconValue = cellNodes(linkCell)
    .filter((node) => node !== link && !node.contains?.(link))
    .map((node) => node.textContent.trim().toLowerCase())
    .find(Boolean);
  const icon = iconValue === 'play' ? 'play' : 'arrow';
  const button = document.createElement('span');
  button.className = 'insight-cards-button';
  button.setAttribute('aria-hidden', 'true');
  button.innerHTML = `<span class="insight-cards-icon insight-cards-icon-${icon}"></span>`;
  li.append(button);

  // the first picture is the illustration, a second one the hover illustration
  const pictures = [...(imageCell?.querySelectorAll('picture') || [])];
  if (!pictures.length) pictures.push(...(imageCell?.querySelectorAll('img') || []));
  const [image, hover] = pictures;
  if (image) {
    const illustration = document.createElement('div');
    illustration.className = 'insight-cards-illustration';
    const alt = imgOf(image)?.alt || '';
    image.classList.add('insight-cards-illustration-default');
    illustration.append(image);
    if (hover) {
      // the hover version shows the same picture, so it is hidden from assistive technology
      const hoverImg = imgOf(hover);
      if (hoverImg) hoverImg.alt = '';
      hover.classList.add('insight-cards-illustration-hover');
      hover.setAttribute('aria-hidden', 'true');
      illustration.append(hover);
      illustration.classList.add('insight-cards-illustration-has-hover');
    }
    if (imgOf(image)) imgOf(image).alt = alt;
    li.append(illustration);
  }
  return li;
}

/**
 * Adds the pagination of the mobile carousel.
 * @param {HTMLUListElement} list
 * @param {HTMLLIElement[]} cards
 * @returns {HTMLElement}
 */
function buildPagination(list, cards) {
  const pagination = document.createElement('div');
  pagination.className = 'insight-cards-pagination';
  pagination.setAttribute('role', 'group');
  pagination.setAttribute('aria-label', UI.pagination);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const dots = cards.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'insight-cards-dot';
    dot.setAttribute('aria-label', UI.card(i + 1, cards.length));
    dot.addEventListener('click', () => {
      list.scrollTo({
        left: card.offsetLeft - cards[0].offsetLeft,
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    });
    pagination.append(dot);
    return dot;
  });

  const setCurrent = (index) => {
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };
  setCurrent(0);

  // the card whose start is closest to the start of the scroller is the current one
  let frame = 0;
  list.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const start = list.scrollLeft;
      const distances = cards
        .map((card) => Math.abs(card.offsetLeft - cards[0].offsetLeft - start));
      const atEnd = start + list.clientWidth >= list.scrollWidth - 2;
      setCurrent(atEnd ? cards.length - 1 : distances.indexOf(Math.min(...distances)));
    });
  }, { passive: true });

  return pagination;
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
  header.className = 'insight-cards-header';
  header.append(...(textRow?.firstElementChild?.childNodes || []));
  const sectionHeading = header.querySelector('h1, h2, h3, h4, h5');
  sectionHeading?.classList.add('insight-cards-title');
  const level = sectionHeading ? Math.min(Number(sectionHeading.tagName[1]) + 1, 6) : 3;

  const list = document.createElement('ul');
  list.className = 'insight-cards-list';
  // list semantics are kept when the list is laid out as a grid or a scroller
  list.setAttribute('role', 'list');
  const cards = itemRows.map((row) => buildCard(row, `h${level}`));
  list.append(...cards);

  const content = [];
  if (header.childNodes.length) content.push(header);
  content.push(list);
  if (cards.length > 1) {
    const pagination = buildPagination(list, cards);
    const media = window.matchMedia(CAROUSEL_QUERY);
    const sync = () => { pagination.hidden = !media.matches; };
    media.addEventListener('change', sync);
    sync();
    content.push(pagination);
  }
  block.replaceChildren(...content);
}
