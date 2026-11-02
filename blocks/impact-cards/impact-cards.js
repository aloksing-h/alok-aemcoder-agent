/*
 * Impact Cards Block
 * Section heading with a button, then a grid of an optional quote card and stat cards.
 * The first two cards are tall, the next two share a column (as in Figma).
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

const ITEM_IDS = ['impact-stat', 'impact-quote'];

// colours of a stat card
const THEMES = ['light', 'red'];

function imgOf(image) {
  return image?.tagName === 'IMG' ? image : image?.querySelector('img');
}

function pictures(cell) {
  const found = [...(cell?.querySelectorAll('picture') || [])];
  return found.length ? found : [...(cell?.querySelectorAll('img') || [])];
}

/**
 * Returns the values of a cell that groups several fields, in model order: paragraphs
 * (AEM delivery) or text nodes (plain HTML), without comments and empty text.
 * @param {Element} [cell]
 * @returns {string[]}
 */
function cellValues(cell) {
  return [...(cell?.childNodes || [])]
    .filter((node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean);
}

/**
 * Moves the authored inline content of a richtext cell into an element.
 * @param {Element} cell
 * @param {Element} target
 */
function moveInline(cell, target) {
  const blocks = [...cell.children];
  if (blocks.length === 1 && blocks[0].tagName === 'P') target.append(...blocks[0].childNodes);
  else target.append(...cell.childNodes);
}

/**
 * Builds a pill button with a round arrow from an authored link.
 * @param {Element} [source]
 * @returns {HTMLAnchorElement|null}
 */
function buildButton(source) {
  if (!source) return null;
  const a = document.createElement('a');
  a.href = source.href;
  a.className = 'impact-cards-button';
  if (source.closest('strong, b') || source.classList.contains('primary')) a.classList.add('impact-cards-button-filled');
  a.innerHTML = '<span class="impact-cards-button-label"></span><span class="impact-cards-button-arrow"><span class="impact-cards-icon impact-cards-icon-arrow" aria-hidden="true"></span></span>';
  a.querySelector('.impact-cards-button-label').textContent = source.textContent.trim();
  return a;
}

/**
 * Builds a stat card: figure, label, colour and illustration.
 * @param {Element} row
 * @returns {HTMLLIElement}
 */
function buildStat(row) {
  const [valueCell, labelCell, themeCell, imageCell] = row.children;
  const li = document.createElement('li');
  const theme = themeCell?.textContent.trim().toLowerCase() === 'red' ? 'red' : THEMES[0];
  li.className = `impact-cards-card impact-cards-stat impact-cards-${theme}`;
  moveInstrumentation(row, li);

  const value = document.createElement('p');
  value.className = 'impact-cards-value';
  value.textContent = valueCell?.textContent.trim() || '';
  const label = document.createElement('p');
  label.className = 'impact-cards-label';
  if (labelCell) moveInline(labelCell, label);
  li.append(value, label);

  // the first picture is the illustration, an optional second one is the mobile crop
  const [image, mobile] = pictures(imageCell);
  if (image) {
    const illustration = document.createElement('div');
    illustration.className = 'impact-cards-illustration';
    const alt = imgOf(image)?.alt || '';
    image.classList.add('impact-cards-illustration-default');
    illustration.append(image);
    if (mobile) {
      const mobileImg = imgOf(mobile);
      if (mobileImg) mobileImg.alt = alt;
      mobile.classList.add('impact-cards-illustration-mobile');
      illustration.append(mobile);
      illustration.classList.add('impact-cards-illustration-has-mobile');
    }
    li.append(illustration);
  }
  return li;
}

/**
 * Builds the quote card: quote, author (name and role), portrait and quote icon.
 * @param {Element} row
 * @returns {HTMLLIElement}
 */
function buildQuote(row) {
  const [quoteCell, authorCell, imageCell, iconCell] = row.children;
  const li = document.createElement('li');
  li.className = 'impact-cards-card impact-cards-quote';
  moveInstrumentation(row, li);

  const figure = document.createElement('figure');
  figure.className = 'impact-cards-quote-body';

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  const [authoredIcon] = pictures(iconCell);
  if (authoredIcon) {
    icon.className = 'impact-cards-quote-mark impact-cards-quote-mark-custom';
    const iconImg = imgOf(authoredIcon);
    if (iconImg) iconImg.alt = '';
    icon.append(authoredIcon);
  } else {
    icon.className = 'impact-cards-quote-mark impact-cards-icon impact-cards-icon-quote';
  }

  const blockquote = document.createElement('blockquote');
  blockquote.className = 'impact-cards-quote-text';
  if (quoteCell) blockquote.append(...quoteCell.childNodes);

  const caption = document.createElement('figcaption');
  caption.className = 'impact-cards-quote-caption';
  const [name, role] = cellValues(authorCell);
  if (name) {
    const nameEl = document.createElement('span');
    nameEl.className = 'impact-cards-quote-name';
    nameEl.textContent = name;
    caption.append(nameEl);
  }
  if (role) {
    const roleEl = document.createElement('span');
    roleEl.className = 'impact-cards-quote-role';
    roleEl.textContent = role;
    caption.append(roleEl);
  }
  figure.append(icon, blockquote);
  if (caption.children.length) figure.append(caption);
  li.append(figure);

  const [portrait] = pictures(imageCell);
  if (portrait) {
    const wrapper = document.createElement('div');
    wrapper.className = 'impact-cards-portrait';
    wrapper.append(portrait);
    li.append(wrapper);
  }
  return li;
}

/**
 * Tells a quote row from a stat row: both have four cells, the third one of a stat
 * holds its colour and the third one of a quote its portrait.
 * @param {Element} row
 * @param {string} itemId component id of imported content, if any
 * @returns {boolean}
 */
function isQuoteRow(row, itemId) {
  if (itemId) return itemId === 'impact-quote';
  const third = row.children[2];
  if (third?.querySelector('picture, img')) return true;
  return !THEMES.includes(third?.textContent.trim().toLowerCase());
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const [textRow, linkRow] = rows.filter((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);

  // heading and description
  const textCell = textRow?.firstElementChild;
  const heading = textCell?.querySelector('h1, h2, h3, h4, h5, h6');
  const title = document.createElement('div');
  title.className = 'impact-cards-title';
  if (heading) title.append(heading);
  const lead = document.createElement('div');
  lead.className = 'impact-cards-lead';
  if (textCell) lead.append(...textCell.childNodes);

  const cards = itemRows.map((row) => {
    // imported content may start an item row with its component id
    const first = row.firstElementChild;
    const text = first && !first.querySelector('a, picture, img') ? first.textContent.trim() : '';
    const itemId = ITEM_IDS.includes(text) ? text : '';
    if (itemId) first.remove();
    return isQuoteRow(row, itemId) ? buildQuote(row) : buildStat(row);
  });
  // the first two cards are tall; the next two share the last column
  cards.forEach((card, i) => card.classList.add(i % 4 < 2 ? 'impact-cards-tall' : 'impact-cards-short'));
  block.classList.add(cards[0]?.classList.contains('impact-cards-quote') ? 'impact-cards-with-quote' : 'impact-cards-stats-only');

  const grid = document.createElement('ul');
  grid.className = 'impact-cards-grid';
  grid.setAttribute('role', 'list');
  grid.append(...cards);

  const content = [title];
  if (lead.textContent.trim()) content.push(lead);
  const button = buildButton(linkRow?.querySelector('a[href]'));
  if (button) {
    const cta = document.createElement('p');
    cta.className = 'impact-cards-cta';
    cta.append(button);
    content.push(cta);
  }
  content.push(grid);
  block.replaceChildren(...content);
}
