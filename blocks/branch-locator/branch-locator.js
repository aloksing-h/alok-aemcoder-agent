/*
 * Branch Locator Block
 * Section heading, a map and a search panel (Near Me, pincode, or state and city), then the
 * matching branches as cards with pages. Branches come from the data adapter
 * (branch-data.js) and the map from the map adapter (branch-map.js), so the client API and
 * a map provider can be connected later without changing this block.
 */

import {
  loadBranches, statesOf, citiesOf, searchByPincode, searchByArea, nearestBranches, directionsUrl,
} from './branch-data.js';
import { createMap } from './branch-map.js';

// interface wording of the controls and messages
const UI = {
  nearMe: 'Near Me',
  locating: 'Finding your location',
  pincode: 'Search by pincode',
  or: 'or',
  state: 'State',
  city: 'City',
  search: 'Search',
  directions: 'Get Directions',
  newTab: '(opens in a new tab)',
  share: (name) => `Share ${name}`,
  call: (number) => `Call ${number}`,
  copied: (name) => `Address of ${name} copied`,
  copyFailed: 'Could not copy the address',
  found: (count) => `${count} ${count === 1 ? 'branch' : 'branches'} found`,
  results: (place, count) => `Showing results for ${place}. ${UI.found(count)}`,
  nearby: (count) => `Showing branches near you. ${UI.found(count)}`,
  pincodeNearby: (pincode, count) => `No branch at ${pincode}. Showing branches nearby. ${UI.found(count)}`,
  none: 'No branches found. Try another pincode, state or city.',
  noneNear: 'No branches found near you. Search by pincode, or choose your state and city.',
  needInput: 'Enter a 6-digit pincode, or choose a state.',
  invalidPincode: 'Please enter a valid 6-digit pincode.',
  loading: 'Loading branch details',
  unavailable: 'Branch details are not available right now. Please try again later.',
  locationDenied: 'Location sharing is turned off. Search by pincode, or choose your state and city.',
  locationFailed: 'We could not find your location. Search by pincode, or choose your state and city.',
  pages: 'Branch results pages',
  previous: 'Previous page',
  next: 'Next page',
  page: (number) => `Page ${number}`,
};

const PAGE_SIZE = 6;

// the prototype's dissolve to the results: about 550ms with Figma's ease out
const DISSOLVE = { duration: 550, easing: 'cubic-bezier(0, 0, 0.58, 1)' };

let locatorCount = 0;

function icon(name) {
  const span = document.createElement('span');
  span.className = `branch-locator-icon branch-locator-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

/**
 * Shows new results with a cross-fade of the page, like the prototype. Without view
 * transitions the results fade in; with reduced motion they appear at once.
 * @param {Function} update the DOM change
 * @param {Element} shown the results, for the fallback fade
 */
function dissolve(update, shown) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  if (document.startViewTransition) {
    const root = document.documentElement;
    root.classList.add('branch-locator-dissolve');
    document.startViewTransition(update).finished
      .catch(() => {})
      .finally(() => root.classList.remove('branch-locator-dissolve'));
    return;
  }
  update();
  shown.animate([{ opacity: 0 }, { opacity: 1 }], DISSOLVE);
}

/**
 * Builds a select with a floating label.
 * @param {string} id
 * @param {string} label
 * @returns {{ wrapper: HTMLElement, select: HTMLSelectElement }}
 */
function buildSelect(id, label) {
  const wrapper = element('div', 'branch-locator-select');
  const select = document.createElement('select');
  select.id = id;
  select.className = 'branch-locator-input';
  select.append(new Option('', ''));
  const labelEl = element('label', 'branch-locator-label', label);
  labelEl.htmlFor = id;
  select.addEventListener('change', () => {
    wrapper.classList.toggle('branch-locator-filled', Boolean(select.value));
  });
  wrapper.append(select, labelEl, icon('chevron'));
  return { wrapper, select };
}

function setOptions(select, values) {
  select.replaceChildren(new Option('', ''), ...values.map((value) => new Option(value, value)));
  select.closest('.branch-locator-select')?.classList.remove('branch-locator-filled');
}

/**
 * Returns the page numbers to show, with null where pages are left out.
 * @param {number} current
 * @param {number} total
 * @returns {(number|null)[]}
 */
function pageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, null, total];
  if (current >= total - 2) return [1, null, total - 2, total - 1, total];
  return [1, null, current, null, total];
}

/**
 * Builds one branch card.
 * @param {object} branch
 * @param {(branch: object, button: HTMLButtonElement) => void} onShare
 * @returns {HTMLLIElement}
 */
function buildCard(branch, onShare) {
  const li = element('li', 'branch-locator-card');
  li.dataset.branch = branch.id;
  const content = element('div', 'branch-locator-card-content');
  content.append(element('h3', 'branch-locator-name', branch.name));
  if (branch.address) {
    const address = element('p', 'branch-locator-address');
    address.append(icon('location'), element('span', '', branch.address));
    content.append(address);
  }
  if (branch.phones.length) {
    const phones = element('p', 'branch-locator-phones');
    branch.phones.forEach((number) => {
      const link = element('a', 'branch-locator-phone');
      link.href = `tel:${number.replace(/[^\d+]/g, '')}`;
      link.setAttribute('aria-label', UI.call(number));
      link.append(icon('phone'), element('span', '', number));
      phones.append(link);
    });
    content.append(phones);
  }

  const actions = element('div', 'branch-locator-card-actions');
  const directions = element('a', 'branch-locator-directions');
  directions.href = directionsUrl(branch);
  directions.target = '_blank';
  directions.rel = 'noopener';
  const arrow = element('span', 'branch-locator-directions-arrow');
  arrow.append(icon('arrow'));
  directions.append(
    element('span', 'branch-locator-directions-label', UI.directions),
    element('span', 'branch-locator-visually-hidden', ` ${UI.newTab}`),
    arrow,
  );
  const share = element('button', 'branch-locator-share');
  share.type = 'button';
  share.setAttribute('aria-label', UI.share(branch.name));
  share.append(icon('share'));
  share.addEventListener('click', () => onShare(branch, share));
  actions.append(directions, share);

  li.append(content, actions);
  return li;
}

/**
 * Reads the authored rows: heading, search panel text, data URL and map image.
 * @param {Element} block
 */
function readConfig(block) {
  const cells = [...block.children].map((row) => row.firstElementChild || row);
  const imageCell = cells.find((cell) => cell.querySelector('picture, img'));
  const sourceCell = cells.find((cell) => cell !== imageCell
    && (cell.querySelector('a[href]') || /^(https?:\/\/|\/)\S+$/.test(cell.textContent.trim())));
  const [textCell, finderCell] = cells.filter((cell) => cell !== imageCell && cell !== sourceCell);
  const source = sourceCell?.querySelector('a[href]')?.getAttribute('href')
    || sourceCell?.textContent.trim() || '';
  return {
    textCell,
    finderCell,
    source,
    image: imageCell?.querySelector('picture') || imageCell?.querySelector('img'),
  };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const {
    textCell, finderCell, source, image,
  } = readConfig(block);
  locatorCount += 1;
  const id = `branch-locator-${locatorCount}`;

  // heading and description
  const header = element('div', 'branch-locator-header');
  header.append(...(textCell?.childNodes || []));
  header.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('branch-locator-title');

  // map and search panel
  const finder = element('div', 'branch-locator-finder');
  const mapArea = element('div', 'branch-locator-map');
  const panel = element('div', 'branch-locator-panel');

  const intro = element('div', 'branch-locator-intro');
  intro.append(...(finderCell?.childNodes || []));

  const form = element('form', 'branch-locator-form');
  form.setAttribute('role', 'search');
  form.noValidate = true;
  const titleEl = intro.firstElementChild;
  if (titleEl) {
    titleEl.id = `${id}-search-title`;
    form.setAttribute('aria-labelledby', titleEl.id);
  }

  const nearMe = element('button', 'branch-locator-near-me');
  nearMe.type = 'button';
  nearMe.append(icon('location'), element('span', '', UI.nearMe));

  const fields = element('div', 'branch-locator-fields');
  const pincodeWrap = element('div', 'branch-locator-pincode');
  const pincode = document.createElement('input');
  pincode.type = 'text';
  pincode.id = `${id}-pincode`;
  pincode.className = 'branch-locator-input';
  pincode.inputMode = 'numeric';
  pincode.maxLength = 6;
  pincode.autocomplete = 'postal-code';
  pincode.placeholder = UI.pincode;
  const pincodeLabel = element('label', 'branch-locator-visually-hidden', UI.pincode);
  pincodeLabel.htmlFor = pincode.id;
  pincodeWrap.append(icon('search'), pincodeLabel, pincode);

  const divider = element('p', 'branch-locator-or');
  divider.append(element('span', '', UI.or));
  const area = element('div', 'branch-locator-area');
  const stateField = buildSelect(`${id}-state`, UI.state);
  const cityField = buildSelect(`${id}-city`, UI.city);
  cityField.select.disabled = true;
  area.append(stateField.wrapper, cityField.wrapper);
  fields.append(pincodeWrap, divider, area);

  const error = element('p', 'branch-locator-error');
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');
  pincode.setAttribute('aria-describedby', error.id);

  const search = element('button', 'branch-locator-search');
  search.type = 'submit';
  const searchArrow = element('span', 'branch-locator-search-arrow');
  searchArrow.append(icon('arrow'));
  search.append(element('span', 'branch-locator-search-label', UI.search), searchArrow);

  form.append(nearMe, fields, error, search);
  panel.append(intro, form);
  finder.append(mapArea, panel);

  // results
  const results = element('div', 'branch-locator-results');
  const summary = element('p', 'branch-locator-summary');
  summary.id = `${id}-summary`;
  summary.tabIndex = -1;
  summary.setAttribute('aria-live', 'polite');
  const list = element('ul', 'branch-locator-list');
  list.setAttribute('aria-labelledby', summary.id);
  list.hidden = true;
  const pagination = element('nav', 'branch-locator-pagination');
  pagination.setAttribute('aria-label', UI.pages);
  pagination.hidden = true;
  results.append(summary, list, pagination);

  const status = element('p', 'branch-locator-visually-hidden');
  status.setAttribute('role', 'status');

  block.replaceChildren(header, finder, results, status);

  // the map, through the map adapter
  let map = null;
  createMap(mapArea, {
    image,
    onSelect: (branch) => list.querySelector(`[data-branch="${branch.id}"] a`)?.focus(),
  }).then((created) => {
    map = created;
    mapArea.classList.toggle('branch-locator-map-interactive', created.interactive);
  });

  // branch data, through the data adapter
  let branches = [];
  const loading = loadBranches(source).then((data) => {
    branches = data;
    setOptions(stateField.select, statesOf(branches));
    return data;
  }).catch(() => {
    block.classList.add('branch-locator-unavailable');
    summary.textContent = UI.unavailable;
    [nearMe, pincode, stateField.select, cityField.select, search].forEach((control) => {
      control.disabled = true;
    });
    return null;
  });

  const updateReady = () => {
    const ready = /^[1-9]\d{5}$/.test(pincode.value.trim()) || Boolean(stateField.select.value);
    form.classList.toggle('branch-locator-ready', ready);
  };
  pincode.addEventListener('input', () => {
    pincode.value = pincode.value.replace(/\D/g, '');
    error.textContent = '';
    pincode.removeAttribute('aria-invalid');
    updateReady();
  });
  stateField.select.addEventListener('change', () => {
    setOptions(cityField.select, citiesOf(branches, stateField.select.value));
    cityField.select.disabled = !stateField.select.value;
    error.textContent = '';
    updateReady();
  });

  // share a branch: the system share sheet, or the address copied to the clipboard
  const shareBranch = async (branch, button) => {
    const url = directionsUrl(branch);
    const text = [branch.name, branch.address, branch.phones.join(', ')].filter(Boolean).join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: branch.name, text, url });
      } catch (shareError) {
        // a dismissed share sheet needs no message
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      status.textContent = UI.copied(branch.name);
    } catch (copyError) {
      status.textContent = UI.copyFailed;
    }
    button.focus();
  };

  // results and pages
  let current = [];
  const showPage = (page, focus) => {
    const total = Math.ceil(current.length / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const cards = current.slice(start, start + PAGE_SIZE).map((branch) => {
      const card = buildCard(branch, shareBranch);
      const highlight = () => map?.focusBranch(branch);
      card.addEventListener('mouseenter', highlight);
      card.addEventListener('focusin', highlight);
      return card;
    });
    list.replaceChildren(...cards);
    list.hidden = !cards.length;

    pagination.replaceChildren();
    pagination.hidden = total < 2;
    if (total > 1) {
      const items = element('ul', 'branch-locator-pages');
      const pageButton = (label, target, className, content) => {
        const li = document.createElement('li');
        const button = element('button', className);
        button.type = 'button';
        button.setAttribute('aria-label', label);
        if (target === page && className === 'branch-locator-page') {
          button.setAttribute('aria-current', 'page');
        }
        button.disabled = target < 1 || target > total;
        button.append(content);
        button.addEventListener('click', () => showPage(target, true));
        li.append(button);
        return li;
      };
      items.append(pageButton(UI.previous, page - 1, 'branch-locator-page-step', icon('chevron-left')));
      pageList(page, total).forEach((number) => {
        if (number === null) {
          const gap = element('li', 'branch-locator-page-gap', '…');
          gap.setAttribute('aria-hidden', 'true');
          items.append(gap);
        } else {
          items.append(pageButton(UI.page(number), number, 'branch-locator-page', document.createTextNode(number)));
        }
      });
      items.append(pageButton(UI.next, page + 1, 'branch-locator-page-step', icon('chevron-right')));
      pagination.append(items);
    }
    if (focus) {
      summary.focus({ preventScroll: true });
      results.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };
  const showResults = (found, text) => dissolve(() => {
    current = found;
    summary.textContent = text;
    block.classList.add('branch-locator-has-results');
    map?.showBranches(found);
    showPage(1, false);
  }, results);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pin = pincode.value.trim();
    const state = stateField.select.value;
    const city = cityField.select.value;
    if (pin && !/^[1-9]\d{5}$/.test(pin)) {
      error.textContent = UI.invalidPincode;
      pincode.setAttribute('aria-invalid', 'true');
      pincode.focus();
      return;
    }
    if (!pin && !state) {
      error.textContent = UI.needInput;
      pincode.focus();
      return;
    }
    error.textContent = '';
    if (!(await loading)) return;
    if (pin) {
      const match = searchByPincode(branches, pin);
      if (!match.branches.length) showResults([], UI.none);
      else if (match.exact) showResults(match.branches, UI.results(pin, match.branches.length));
      else showResults(match.branches, UI.pincodeNearby(pin, match.branches.length));
      return;
    }
    const found = searchByArea(branches, state, city);
    const place = city ? `${state}, ${city}` : state;
    showResults(found, found.length ? UI.results(place, found.length) : UI.none);
  });

  // Near Me: the visitor's location, if they allow it
  if (!navigator.geolocation) nearMe.hidden = true;
  nearMe.addEventListener('click', () => {
    nearMe.disabled = true;
    nearMe.setAttribute('aria-busy', 'true');
    status.textContent = UI.locating;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      nearMe.disabled = false;
      nearMe.removeAttribute('aria-busy');
      if (!(await loading)) return;
      const found = nearestBranches(branches, coords);
      showResults(found, found.length ? UI.nearby(found.length) : UI.noneNear);
    }, (geoError) => {
      nearMe.disabled = false;
      nearMe.removeAttribute('aria-busy');
      error.textContent = geoError.code === geoError.PERMISSION_DENIED
        ? UI.locationDenied : UI.locationFailed;
    }, { timeout: 10000, maximumAge: 300000 });
  });

  updateReady();
}
