/*
 * Plan Cards Block
 * Section heading, tabs (Plan Tab items) and plan cards (Plan Card items). Each card turns
 * over to a red face with details and a call to action on hover or keyboard focus.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// interface wording used when the author gives no label
const UI = {
  download: 'Download brochure',
};

const ITEM_IDS = ['plan-card', 'plan-tab'];

// badge types authors pick from: label and icon
const BADGES = {
  'best-selling': { label: 'Best selling', icon: 'shield' },
  new: { label: 'New', icon: 'sparkle' },
  popular: { label: 'Popular', icon: 'star' },
  recommended: { label: 'Recommended', icon: 'thumbs-up' },
};

let planCardsCount = 0;

function imgOf(image) {
  return image?.tagName === 'IMG' ? image : image?.querySelector('img');
}

function icon(name) {
  const span = document.createElement('span');
  span.className = `plan-cards-icon plan-cards-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/**
 * Builds a pill button with a round arrow from an authored link.
 * @param {Element} [source] authored link
 * @param {string} className
 * @returns {HTMLAnchorElement|null}
 */
function buildButton(source, className) {
  if (!source) return null;
  const a = document.createElement('a');
  a.href = source.href;
  a.className = className;
  if (source.title) a.title = source.title;
  const text = document.createElement('span');
  text.className = 'plan-cards-button-label';
  text.textContent = source.textContent.trim();
  const arrow = document.createElement('span');
  arrow.className = 'plan-cards-button-arrow';
  arrow.append(icon('arrow'));
  a.append(text, arrow);
  return a;
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
 * Builds the illustration of one face of the card.
 * @param {Element|null} image
 * @param {string} className
 * @returns {HTMLDivElement|null}
 */
function buildIllustration(image, className) {
  if (!image) return null;
  const wrapper = document.createElement('div');
  wrapper.className = `plan-cards-illustration ${className}`;
  wrapper.append(image);
  return wrapper;
}

/**
 * Builds one plan card from an authored item row.
 * @param {Element} row
 * @param {string} headingTag
 * @returns {HTMLLIElement}
 */
function buildCard(row, headingTag) {
  const [
    badgeCell, titleCell, descriptionCell, glowCell, imageCell, hoverCell,
    detailsCell, buttonCell, downloadCell,
  ] = row.children;
  const li = document.createElement('li');
  const glow = glowCell?.textContent.trim().toLowerCase() === 'blue' ? 'blue' : 'red';
  li.className = `plan-cards-card plan-cards-glow-${glow}`;
  moveInstrumentation(row, li);

  const buttonSource = buttonCell?.querySelector('a[href]');

  // front face: badge, plan name, description and illustration
  const front = document.createElement('div');
  front.className = 'plan-cards-front';

  // the badge is a type from the authoring dropdown; older free text is shown as written
  const badgeValue = badgeCell?.textContent.trim() || '';
  const badgeKey = badgeValue.toLowerCase().replace(/\s+/g, '-');
  const badgeType = BADGES[badgeKey] || (badgeValue && { label: badgeValue, icon: 'shield' });
  if (badgeType) {
    const badgeEl = document.createElement('p');
    badgeEl.className = `plan-cards-badge plan-cards-badge-${BADGES[badgeKey] ? badgeKey : 'custom'}`;
    const text = document.createElement('span');
    text.textContent = badgeType.label;
    badgeEl.append(icon(badgeType.icon), text);
    front.append(badgeEl);
  }

  const name = document.createElement(headingTag);
  name.className = 'plan-cards-name';
  if (buttonSource) {
    // the plan name links to the plan; its link covers the card
    const link = document.createElement('a');
    link.className = 'plan-cards-link';
    link.href = buttonSource.href;
    moveInline(titleCell, link);
    name.append(link);
  } else if (titleCell) {
    moveInline(titleCell, name);
  }
  front.append(name);

  if (descriptionCell?.textContent.trim()) {
    const description = document.createElement('div');
    description.className = 'plan-cards-description';
    description.append(...descriptionCell.childNodes);
    front.append(description);
  }

  const image = imageCell?.querySelector('picture') || imageCell?.querySelector('img');
  const hoverImage = hoverCell?.querySelector('picture') || hoverCell?.querySelector('img');
  const frontIllustration = buildIllustration(image, 'plan-cards-illustration-front');
  if (frontIllustration) front.append(frontIllustration);
  li.append(front);

  // back face: shown on hover or when one of its links has keyboard focus
  const hasDetails = detailsCell?.textContent.trim() || buttonSource;
  if (!hasDetails) return li;

  const back = document.createElement('div');
  back.className = 'plan-cards-back';

  // the back face shows the same picture, so it is hidden from assistive technology
  let backImage = hoverImage;
  if (!backImage && image) {
    backImage = image.cloneNode(true);
    backImage.classList.add('plan-cards-illustration-inverted');
  }
  if (backImage) {
    const backImg = imgOf(backImage);
    if (backImg) backImg.alt = '';
    backImage.setAttribute('aria-hidden', 'true');
    back.append(buildIllustration(backImage, 'plan-cards-illustration-back'));
  }

  if (detailsCell?.textContent.trim()) {
    const details = document.createElement('div');
    details.className = 'plan-cards-details';
    details.append(...detailsCell.childNodes);
    // a last paragraph holding only a link is the "Explore Now" text link
    const last = details.lastElementChild;
    const explore = last?.tagName === 'P' && last.children.length === 1 ? last.querySelector('a') : null;
    if (explore && explore.textContent.trim() === last.textContent.trim()) {
      last.className = 'plan-cards-explore';
      explore.append(icon('arrow'));
    }
    back.append(details);
  }

  const actions = document.createElement('div');
  actions.className = 'plan-cards-actions';
  const button = buildButton(buttonSource, 'plan-cards-button');
  if (button) actions.append(button);
  const downloadSource = downloadCell?.querySelector('a[href]');
  if (downloadSource) {
    const download = document.createElement('a');
    download.className = 'plan-cards-download';
    download.href = downloadSource.href;
    const label = downloadCell.textContent.trim();
    // the authored label names the icon link; the URL is never a usable name
    const downloadName = label && label !== downloadSource.href ? label : downloadSource.title;
    download.setAttribute('aria-label', downloadName || UI.download);
    download.append(icon('download'));
    actions.append(download);
  }
  if (actions.children.length) back.append(actions);
  li.append(back);
  return li;
}

/**
 * Builds accessible tabs for the panels.
 * @param {{ label: string, short: string, panel: HTMLElement }[]} tabs
 * @param {string} id
 * @param {Element|null} heading
 * @returns {HTMLDivElement}
 */
function buildTabs(tabs, id, heading) {
  const tablist = document.createElement('div');
  tablist.className = 'plan-cards-tabs';
  tablist.setAttribute('role', 'tablist');
  if (heading) {
    heading.id = heading.id || `${id}-title`;
    tablist.setAttribute('aria-labelledby', heading.id);
  }
  const indicator = document.createElement('span');
  indicator.className = 'plan-cards-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  tablist.append(indicator);

  const buttons = tabs.map((tab, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plan-cards-tab';
    button.id = `${id}-tab-${i + 1}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', tab.panel.id);
    // the short mobile label is part of the full label, which stays the accessible name
    const full = document.createElement('span');
    full.className = 'plan-cards-tab-label';
    full.textContent = tab.label;
    button.append(full);
    if (tab.short && tab.short !== tab.label) {
      const short = document.createElement('span');
      short.className = 'plan-cards-tab-short';
      short.setAttribute('aria-hidden', 'true');
      short.textContent = tab.short;
      button.append(short);
      button.classList.add('plan-cards-tab-has-short');
    }
    tab.panel.setAttribute('aria-labelledby', button.id);
    tablist.append(button);
    return button;
  });

  const moveIndicator = () => {
    const active = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
    if (!active) return;
    indicator.style.setProperty('--plan-cards-indicator-x', `${active.offsetLeft}px`);
    indicator.style.setProperty('--plan-cards-indicator-width', `${active.offsetWidth}px`);
  };

  const select = (index, focus = false) => {
    buttons.forEach((button, i) => {
      const selected = i === index;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      tabs[i].panel.hidden = !selected;
    });
    if (focus) buttons[index].focus();
    moveIndicator();
  };

  buttons.forEach((button, i) => button.addEventListener('click', () => select(i)));
  tablist.addEventListener('keydown', (event) => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    const keys = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: buttons.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select((keys[event.key] + buttons.length) % buttons.length, true);
  });

  new ResizeObserver(moveIndicator).observe(tablist);
  select(0);
  return tablist;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const [textRow, linkRow] = rows.filter((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);

  planCardsCount += 1;
  const id = `plan-cards-${planCardsCount}`;

  const header = document.createElement('div');
  header.className = 'plan-cards-header';
  header.append(...(textRow?.firstElementChild?.childNodes || []));
  const heading = header.querySelector('h1, h2, h3, h4, h5');
  heading?.classList.add('plan-cards-title');
  const level = heading ? Math.min(Number(heading.tagName[1]) + 1, 6) : 3;

  // a Plan Tab starts a new panel; the plan cards after it belong to that panel
  const groups = [];
  itemRows.forEach((row) => {
    // imported content may start an item row with its component id
    const first = row.firstElementChild;
    const itemId = first && !first.querySelector('a, picture, img') ? first.textContent.trim() : '';
    if (ITEM_IDS.includes(itemId)) first.remove();
    const isTab = itemId ? itemId === 'plan-tab' : row.children.length === 2;
    if (isTab) {
      const [labelCell, shortCell] = row.children;
      groups.push({
        row,
        label: labelCell?.textContent.trim() || '',
        short: shortCell?.textContent.trim() || '',
        cards: [],
      });
      return;
    }
    if (!groups.length) groups.push({ label: '', short: '', cards: [] });
    groups.at(-1).cards.push(buildCard(row, `h${level}`));
  });

  const panels = groups.map((group, i) => {
    const panel = document.createElement('div');
    panel.className = 'plan-cards-panel';
    panel.id = `${id}-panel-${i + 1}`;
    if (group.row) moveInstrumentation(group.row, panel);
    const list = document.createElement('ul');
    list.className = 'plan-cards-list';
    list.setAttribute('role', 'list');
    list.append(...group.cards);
    panel.append(list);
    return { ...group, panel };
  });

  const content = [];
  if (header.childNodes.length) content.push(header);
  const tabbed = panels.filter((panel) => panel.label);
  if (tabbed.length > 1) {
    panels.forEach((panel) => panel.panel.setAttribute('role', 'tabpanel'));
    content.push(buildTabs(panels, id, heading));
  }
  content.push(...panels.map((panel) => panel.panel));

  const linkSource = linkRow?.querySelector('a[href]');
  const more = buildButton(linkSource, 'plan-cards-more');
  if (more) {
    // authors pick the filled style with the Button style field (bold link, or "primary"
    // once the page buttons are decorated)
    if (linkSource.closest('strong, b') || linkSource.classList.contains('primary')) {
      more.classList.add('plan-cards-more-filled');
    }
    const footer = document.createElement('p');
    footer.className = 'plan-cards-footer';
    footer.append(more);
    content.push(footer);
  }

  // the hover face can be dismissed with Escape until the pointer leaves the card
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const focused = block.contains(event.target) ? event.target.closest('.plan-cards-card') : null;
    const card = focused || block.querySelector('.plan-cards-card:hover');
    if (!card) return;
    card.classList.add('plan-cards-dismissed');
    const link = card.querySelector('.plan-cards-link');
    if (card.querySelector('.plan-cards-back')?.contains(document.activeElement)) link?.focus();
  });
  block.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.plan-cards-card');
    if (card && !card.contains(event.relatedTarget)) card.classList.remove('plan-cards-dismissed');
  });

  block.replaceChildren(...content);
}
