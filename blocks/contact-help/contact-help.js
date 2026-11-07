/*
 * Contact Help Block
 * Section heading, contact cards (Contact Card items) and a customer care banner.
 * A card linking to #form-type opens that Contact Form in place of the cards.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { connectFormTrigger } from '../contact-form/contact-form.js';

const ICONS = ['phone', 'whatsapp', 'advisor', 'headset', 'mail', 'location'];

function icon(name) {
  const span = document.createElement('span');
  span.className = `contact-help-icon contact-help-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/**
 * Returns the paragraphs of a richtext cell; plain text becomes one paragraph.
 * @param {Element} [cell]
 * @returns {Element[]}
 */
function blocksOf(cell) {
  if (!cell) return [];
  const elements = [...cell.children];
  if (elements.length) return elements;
  if (!cell.textContent.trim()) return [];
  const p = document.createElement('p');
  p.textContent = cell.textContent.trim();
  return [p];
}

/**
 * Builds one contact card from an authored item row.
 * @param {Element} row
 * @param {(trigger: HTMLAnchorElement, type: string) => void} onFormLink
 * @returns {HTMLLIElement}
 */
function buildCard(row, onFormLink) {
  const [iconCell, textCell, linkCell] = row.children;
  const li = document.createElement('li');
  li.className = 'contact-help-card';
  moveInstrumentation(row, li);

  const source = linkCell?.querySelector('a[href]');
  const link = document.createElement(source ? 'a' : 'div');
  link.className = 'contact-help-link';
  if (source) {
    link.href = source.getAttribute('href');
    if (source.title) link.title = source.title;
  }

  const name = iconCell?.textContent.trim().toLowerCase();
  link.append(icon(ICONS.includes(name) ? name : ICONS[0]));

  // a label, the main text and a note
  const text = document.createElement('span');
  text.className = 'contact-help-text';
  blocksOf(textCell).forEach((block, i) => {
    const line = document.createElement('span');
    line.className = ['contact-help-label', 'contact-help-value'][i] || 'contact-help-note';
    line.append(...block.childNodes);
    text.append(line);
  });
  link.append(text);

  if (source) {
    const chevron = document.createElement('span');
    chevron.className = 'contact-help-chevron';
    chevron.append(icon('chevron'));
    link.append(chevron);
    // #life-advisor and the like open a form on this page
    const hash = source.getAttribute('href').match(/^#([\w-]+)$/)?.[1];
    if (hash) onFormLink(link, hash);
  }
  li.append(link);
  return li;
}

/**
 * Builds the customer care banner.
 * @param {Element} [bannerCell]
 * @param {Element} [linkCell]
 * @returns {HTMLDivElement|null}
 */
function buildBanner(bannerCell, linkCell) {
  const blocks = blocksOf(bannerCell);
  const source = linkCell?.querySelector('a[href]');
  if (!blocks.length && !source) return null;

  const banner = document.createElement('div');
  banner.className = 'contact-help-banner';
  banner.append(icon('headset'));

  const content = document.createElement('div');
  content.className = 'contact-help-banner-text';
  blocks.forEach((block, i) => {
    const line = document.createElement('p');
    line.className = i === 0 ? 'contact-help-banner-title' : 'contact-help-banner-description';
    line.append(...block.childNodes);
    content.append(line);
  });
  banner.append(content);

  if (source) {
    const button = document.createElement('a');
    button.className = 'contact-help-button';
    button.href = source.getAttribute('href');
    if (source.title) button.title = source.title;
    const label = document.createElement('span');
    label.className = 'contact-help-button-label';
    label.textContent = source.textContent.trim();
    const arrow = document.createElement('span');
    arrow.className = 'contact-help-button-arrow';
    arrow.append(icon('arrow'));
    button.append(label, arrow);
    banner.append(button);
  }
  return banner;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const [textRow, bannerRow, linkRow] = rows.filter((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);

  // heading and description
  const header = document.createElement('div');
  header.className = 'contact-help-header';
  const textCell = textRow?.firstElementChild;
  const heading = textCell?.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('contact-help-title');
    header.append(heading);
  }
  const lead = document.createElement('div');
  lead.className = 'contact-help-lead';
  lead.append(...(textCell?.childNodes || []));
  if (lead.textContent.trim()) header.append(lead);

  const body = document.createElement('div');
  body.className = 'contact-help-body';

  const formLinks = [];
  const list = document.createElement('ul');
  list.className = 'contact-help-cards';
  const onFormLink = (link, type) => formLinks.push({ link, type });
  list.append(...itemRows.map((row) => buildCard(row, onFormLink)));
  if (list.children.length) body.append(list);

  const banner = buildBanner(bannerRow?.firstElementChild, linkRow?.firstElementChild);
  if (banner) body.append(banner);

  block.replaceChildren(header, body);

  // the form takes the place of the cards and banner while it is open
  formLinks.forEach(({ link, type }) => connectFormTrigger(type, link, {
    onOpen: () => {
      body.hidden = true;
      block.classList.add('contact-help-form-open');
    },
    onClose: () => {
      body.hidden = false;
      block.classList.remove('contact-help-form-open');
    },
  }));
}
