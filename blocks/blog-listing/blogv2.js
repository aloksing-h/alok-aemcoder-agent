import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  a, button, div, domEl, h3, img, input, label, li, nav, p, span, ul,
} from '../../scripts/dom-helpers.js';

/**
 * Blog listing (Figma "Section - Discover insurance"): heading, search, a
 * category / type filter (dropdown on desktop, full screen on mobile), the
 * applied filters as chips, cards rendered from the blog pages index, and
 * pagination.
 *
 * Data follows the EDS page search guide: the index (helix-query.yaml "blogs")
 * is loaded once per session in pages of 500 rows and filtered in memory.
 * Index columns: path, title, description, type, category, image,
 * lastModified, robots. Values are rendered as text, exactly as indexed.
 */

const DEFAULT_SOURCE = '/in/en/blogs-page/query-index.json';
const INDEX_PAGE_SIZE = 500;
const CACHE_PREFIX = 'blog-listing:';
const INDEX_RETRY_MS = 30000;
const SAMPLE_ROWS = [
  {
    path: '#sample-features-life-insurance',
    title: 'Features of Life Insurance',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'blog',
    category: 'About Life Insurance',
    lastModified: 8,
  },
  {
    path: '#sample-annuity-withdrawal-plan',
    title: 'Annuity vs Systematic Withdrawal Plan (SWP): Which Should Fund Your Retirement?',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'video',
    category: 'Protection24',
    lastModified: 7,
  },
  {
    path: '#sample-planned-risks',
    title: 'Traditional Savings vs Planned Risks: Where Should Your Money Sit?',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'blog',
    category: 'Savings & Tax',
    mobileImage: 'blog-listing-savings-mobile.svg',
    lastModified: 6,
  },
  {
    path: '#sample-investment-mistakes',
    title: '10 Investment Mistakes to Avoid in Your 30s (India Edition)',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'blog',
    category: 'Wealth Creation',
    lastModified: 5,
  },
  {
    path: '#sample-emergency-fund',
    title: 'How to Build an Emergency Fund With a Recurring Deposit',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'video',
    category: 'Retirement',
    lastModified: 4,
  },
  {
    path: '#sample-recurring-deposit-child-education',
    title: "How to Use a Recurring Deposit for Your Child's Education",
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'blog',
    category: 'Health Insurance',
    lastModified: 3,
  },
  {
    path: '#sample-ulip-traditional-plan',
    title: 'Difference Between ULIP and Traditional Plan',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'podcast',
    category: 'Current Affairs',
    lastModified: 2,
  },
  {
    path: '#sample-crore-term-insurance',
    title: '₹1 Crore Term Insurance',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,...',
    type: 'blog',
    category: 'Health Insurance',
    lastModified: 1,
  },
];
// the categories of the page property "Blog Category", in the filter's order
const CATEGORIES = [
  'About Life Insurance', 'Current Affairs', 'Government Schemes', 'Health Insurance',
  'Protection24', 'Retirement', 'Savings & Tax', 'Term Insurance', 'ULIP', 'Wealth Creation',
];
const TYPES = [
  { value: 'blog', label: 'Blogs', badge: 'Blog' },
  { value: 'video', label: 'Videos', badge: 'Video' },
  { value: 'podcast', label: 'Podcast', badge: 'Podcast' },
];
// cards per page: Figma desktop 2 rows of 4, mobile 3
const PAGE_SIZE = [
  { query: '(width >= 900px)', size: 8 },
  { query: '(width >= 600px)', size: 6 },
  { query: 'all', size: 3 },
];
const MOBILE_QUERY = window.matchMedia('(width < 900px)');
const SEARCH_DELAY_MS = 200;
// search ranking (guide): a title match counts 3, a description match 1
const TITLE_SCORE = 3;
const DESCRIPTION_SCORE = 1;

const ICONS = {
  search: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" focusable="false"><circle cx="9.17" cy="9.17" r="6.25" stroke="currentColor" stroke-width="1.25"/><path d="m13.75 13.75 3.33 3.33" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  filter: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true" focusable="false"><path d="M3.75 2.25v4.5m0 4.5v4.5M9 2.25v1.5m0 4.5v7.5m5.25-13.5v7.5m0 4.5v1.5" stroke="currentColor" stroke-width="1.13" stroke-linecap="round"/><rect x="2.25" y="6.75" width="3" height="4.5" rx="1" stroke="currentColor" stroke-width="1.13"/><rect x="7.5" y="3.75" width="3" height="4.5" rx="1" stroke="currentColor" stroke-width="1.13"/><rect x="12.75" y="9.75" width="3" height="4.5" rx="1" stroke="currentColor" stroke-width="1.13"/></svg>',
  chevron: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true" focusable="false"><path d="m4.5 6.75 4.5 4.5 4.5-4.5" stroke="currentColor" stroke-width="1.13" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" focusable="false"><path d="m10.34 10.34 11.32 11.32m0-11.32L10.34 21.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  remove: '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true" focusable="false"><path d="m3 3 6 6m0-6L3 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" focusable="false"><path d="M4.5 12h15m-5.5-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" focusable="false"><path d="M7.5 5.6c0-1.13 1.23-1.83 2.2-1.26l9.1 5.4c.95.56.95 1.94 0 2.5l-9.1 5.4c-.97.58-2.2-.12-2.2-1.25Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  prev: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" focusable="false"><path d="m12.5 4.5-5.5 5.5 5.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" focusable="false"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

let uid = 0;

/**
 * A span holding one of the inline icons above (static markup, never index data).
 * @param {string} name
 * @param {object} [attrs]
 */
function icon(name, attrs = {}) {
  const node = span({ 'aria-hidden': 'true', ...attrs });
  node.innerHTML = ICONS[name];
  return node;
}

function art(type) {
  return `${window.hlx.codeBasePath}/blocks/blog-listing/blog-listing-${type}.png`;
}

/**
 * All rows of the index, fetched in pages of 500 and cached for the session.
 * @param {string} source
 * @returns {Promise<object[]>}
 */
async function fetchIndex(source) {
  const cacheKey = `${CACHE_PREFIX}${source}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // storage unavailable, fetch instead
  }
  const rows = [];
  let offset = 0;
  let total = 1;
  while (offset < total) {
    const url = new URL(source, window.location.href);
    url.searchParams.set('limit', INDEX_PAGE_SIZE);
    url.searchParams.set('offset', offset);
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    // eslint-disable-next-line no-await-in-loop
    const json = await response.json();
    const data = json.data || [];
    rows.push(...data);
    total = Number(json.total) || rows.length;
    offset += INDEX_PAGE_SIZE;
    if (!data.length) break;
  }
  if (rows.length) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(rows));
    } catch {
      // ignore quota or access errors
    }
  }
  return rows;
}

/**
 * The blog pages of the index (rows with a Blog Type, without noindex), newest
 * first, with the lower-case search fields prepared once.
 * @param {object[]} rows
 */
function prepare(rows) {
  return rows
    .filter((row) => row.path
      && TYPES.some(({ value }) => value === row.type)
      && !/noindex/i.test(row.robots || ''))
    .map((row) => ({
      row,
      title: (row.title || '').toLowerCase(),
      description: (row.description || '').toLowerCase(),
      modified: Number(row.lastModified) || 0,
    }))
    .sort((x, y) => (y.modified && x.modified
      ? y.modified - x.modified : 0));
}

/**
 * Search score: every term must be in the title or the description.
 * @returns {number} 0 when a term is missing
 */
function score(entry, terms) {
  let total = 0;
  const matched = terms.every((term) => {
    const inTitle = entry.title.includes(term);
    const inDescription = entry.description.includes(term);
    total += (inTitle ? TITLE_SCORE : 0) + (inDescription ? DESCRIPTION_SCORE : 0);
    return inTitle || inDescription;
  });
  return matched ? total : 0;
}

/**
 * @param {object} row index row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const type = TYPES.find(({ value }) => value === row?.type);
  const text = div(
    { class: 'blog-listing-card-text' },
    h3({ class: 'blog-listing-card-title' }, row?.title || row?.path || ''),
  );
  if (row?.description) text.append(p({ class: 'blog-listing-card-description' }, row?.description));
  const content = div({ class: 'blog-listing-card-content' });
  if (row?.category) content.append(span({ class: 'blog-listing-card-category' }, row?.category));
  content.append(text);

  const fallback = art(row?.type);
  const image = img({
    class: 'blog-listing-card-art', src: row?.image || fallback, alt: '', loading: 'lazy', width: 240, height: 240,
  });
  const artwork = [image];
  if (row?.mobileImage && !row?.image) {
    artwork.push(img({
      class: 'blog-listing-card-art-mobile',
      src: `${window.hlx.codeBasePath}/blocks/blog-listing/${row?.mobileImage}`,
      alt: '',
      loading: 'lazy',
      'aria-hidden': 'true',
    }));
  }
  // a broken page image falls back to the type's illustration
  if (row?.image) image.addEventListener('error', () => { image.src = fallback; }, { once: true });

  return li(
    { class: `blog-listing-card blog-listing-card-${row?.type}` },
    a(
      { class: 'blog-listing-card-link', href: row?.path },
      span({ class: 'blog-listing-card-type' }, type?.badge),
      content,
      // blogs open with an arrow, videos and podcasts with play
      icon(row?.type === 'blog' ? 'arrow' : 'play', { class: 'blog-listing-card-action' }),
      ...artwork,
    ),
  );
}

/**
 * The page numbers to show: the first and the last, the current one and its
 * neighbours, gaps as "..." (Figma: 1 2 3 ... 12).
 * @returns {(number|null)[]}
 */
function pageList(current, count) {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i + 1);
  const compact = window.matchMedia('(width < 600px)').matches;
  const pages = new Set([1, count, current]);
  if (compact) {
    if (current <= 3) [2, 3].forEach((page) => pages.add(page));
    if (current >= count - 2) [count - 2, count - 1].forEach((page) => pages.add(page));
  } else {
    [current - 1, current + 1].forEach((page) => pages.add(page));
    if (current <= 3) [2, 3].forEach((page) => pages.add(page));
    if (current >= count - 2) [count - 1, count - 2].forEach((page) => pages.add(page));
  }
  const sorted = [...pages].filter((page) => page >= 1 && page <= count).sort((x, y) => x - y);
  return sorted.flatMap((page, i) => (i && page - sorted[i - 1] > 1 ? [null, page] : [page]));
}

function checkbox(group, value, text) {
  return label(
    { class: 'blog-listing-option' },
    input({ type: 'checkbox', name: group, value }),
    span({ class: 'blog-listing-checkbox', 'aria-hidden': 'true' }),
    span({ class: 'blog-listing-option-label' }, text),
  );
}

function filterGroup(id, name, title) {
  const options = div({ class: 'blog-listing-options' });
  const group = div(
    {
      class: `blog-listing-group blog-listing-${name}`, role: 'group', 'aria-labelledby': `${id}-${name}`,
    },
    p({ class: 'blog-listing-group-title', id: `${id}-${name}` }, title),
    options,
  );
  return [group, options];
}

/**
 * loads and decorates the blog-listing block
 * rows: [heading & text] [blog index]
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  uid += 1;
  const id = `blog-listing-${uid}`;
  const [textRow, sourceRow] = [...block.children];
  const source = sourceRow?.querySelector('a')?.getAttribute('href')
    || sourceRow?.textContent.trim() || DEFAULT_SOURCE;

  // --- heading ---
  const header = div({ class: 'blog-listing-header' });
  const textCell = textRow?.firstElementChild;
  if (textCell) {
    moveInstrumentation(textCell, header);
    header.append(...textCell.childNodes);
    header.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('blog-listing-title');
    header.querySelectorAll('p').forEach((para) => para.classList.add('blog-listing-subtitle'));
  }

  // --- search + filter ---
  const searchInput = input({
    class: 'blog-listing-search-input',
    type: 'search',
    placeholder: 'Search...',
    'aria-label': 'Search articles',
    autocomplete: 'off',
  });
  const count = span({ class: 'blog-listing-filter-count', hidden: '' });
  const toggle = button(
    {
      class: 'blog-listing-filter-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': `${id}-panel`,
    },
    icon('filter'),
    span('Filter by'),
    icon('chevron', { class: 'blog-listing-filter-chevron' }),
    count,
  );
  const close = button({ class: 'blog-listing-panel-close', type: 'button', 'aria-label': 'Close filters' }, icon('close'));
  const [categories, categoryOptions] = filterGroup(id, 'categories', 'Choose category');
  const [types, typeOptions] = filterGroup(id, 'types', 'Choose type');
  TYPES.forEach(({ value, label: text }) => typeOptions.append(checkbox('type', value, text)));
  const apply = button(
    { class: 'blog-listing-apply', type: 'button' },
    span({ class: 'blog-listing-apply-short' }, 'Apply'),
    span({ class: 'blog-listing-apply-long' }, 'Apply Filter'),
  );
  const panel = div(
    {
      class: 'blog-listing-panel', id: `${id}-panel`, hidden: '', role: 'dialog', 'aria-label': 'Filter articles',
    },
    close,
    categories,
    types,
    apply,
  );
  const filter = div({ class: 'blog-listing-filter' }, toggle, panel);
  const toolbar = div(
    { class: 'blog-listing-toolbar' },
    label({ class: 'blog-listing-search' }, icon('search'), searchInput),
    filter,
  );

  // --- applied filters, cards, pagination ---
  const chips = ul({ class: 'blog-listing-chips' });
  const clear = button({ class: 'blog-listing-clear', type: 'button' }, 'Clear All');
  const applied = div(
    { class: 'blog-listing-applied', hidden: '' },
    span({ class: 'blog-listing-applied-label' }, 'Filtered by'),
    chips,
    clear,
  );
  const status = p({ class: 'blog-listing-status', role: 'status' });
  const cards = ul({ class: 'blog-listing-cards' });
  const empty = p({ class: 'blog-listing-empty', hidden: '' });
  const pagination = nav({ class: 'blog-listing-pagination', 'aria-label': 'Pagination' });

  block.replaceChildren(header, toolbar, applied, status, cards, empty, pagination);

  // --- state ---
  const state = {
    entries: [],
    query: '',
    categories: new Set(),
    types: new Set(),
    page: 1,
    loadError: false,
    usingFallback: false,
  };
  const pageSize = () => PAGE_SIZE.find(({ query }) => window.matchMedia(query).matches).size;
  // filtered rows; with a search query ranked by score, otherwise newest first
  const results = () => {
    const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = state.entries.filter(({ row }) => (
      (!state.categories.size || state.categories.has(row.category))
      && (!state.types.size || state.types.has(row.type))));
    if (!terms.length) return filtered.map(({ row }) => row);
    return filtered
      .map((entry) => ({ entry, score: score(entry, terms) }))
      .filter((result) => result.score > 0)
      .sort((x, y) => y.score - x.score || y.entry.modified - x.entry.modified)
      .map(({ entry }) => entry.row);
  };

  const renderChips = () => {
    const selected = [
      ...[...state.categories].map((value) => ({ group: 'categories', value, text: value })),
      ...[...state.types].map((value) => ({
        group: 'types', value, text: TYPES.find((type) => type.value === value).label,
      })),
    ];
    chips.replaceChildren(...selected.map(({ group, value, text }) => li(
      { class: 'blog-listing-chip' },
      button(
        {
          class: 'blog-listing-chip-remove',
          type: 'button',
          'aria-label': `Remove filter: ${text}`,
          'data-group': group,
          'data-value': value,
        },
        span(text),
        icon('remove'),
      ),
    )));
    applied.hidden = !selected.length;
    count.hidden = !selected.length;
    count.textContent = selected.length;
    toggle.setAttribute('aria-label', selected.length ? `Filter by, ${selected.length} applied` : 'Filter by');
  };

  const pageButton = (text, page, className, ...children) => button({
    class: className, type: 'button', 'data-page': page, 'aria-label': text,
  }, ...children);

  const renderPagination = (pages) => {
    pagination.replaceChildren();
    pagination.hidden = pages <= 1;
    if (pages <= 1) return;
    const prev = pageButton('Previous page', state.page - 1, 'blog-listing-page-step blog-listing-page-prev', icon('prev'));
    prev.disabled = state.page === 1;
    const next = pageButton('Next page', state.page + 1, 'blog-listing-page-step blog-listing-page-next', icon('next'));
    next.disabled = state.page === pages;
    const list = domEl('ol', { class: 'blog-listing-pages' }, ...pageList(state.page, pages).map((page) => {
      if (page === null) return li({ class: 'blog-listing-page-gap', 'aria-hidden': 'true' }, '...');
      const number = pageButton(`Page ${page} of ${pages}`, page, 'blog-listing-page', String(page));
      if (page === state.page) number.setAttribute('aria-current', 'page');
      return li(number);
    }));
    pagination.append(prev, list, next);
  };

  const render = () => {
    const found = results();
    const size = pageSize();
    const pages = Math.max(1, Math.ceil(found.length / size));
    state.page = Math.min(Math.max(1, state.page), pages);
    const shown = found.slice((state.page - 1) * size, state.page * size);
    cards.replaceChildren(...shown.map(buildCard));
    empty.hidden = found.length > 0;
    empty.textContent = state.loadError
      ? 'Articles could not be loaded. Please try again later.'
      : 'No articles to show yet.';
    if (state.entries.length) empty.textContent = 'No articles match your search.';
    status.textContent = state.loadError
      ? empty.textContent : `${found.length} ${found.length === 1 ? 'article' : 'articles'}`;
    renderChips();
    renderPagination(pages);
  };

  // --- filter panel ---
  const checkboxes = () => [...panel.querySelectorAll('input[type="checkbox"]')];
  const syncPanel = () => {
    checkboxes().forEach((box) => {
      box.checked = box.name === 'type' ? state.types.has(box.value) : state.categories.has(box.value);
    });
  };
  const outside = (event) => {
    if (!filter.contains(event.target)) setOpen(false); // eslint-disable-line no-use-before-define
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      setOpen(false); // eslint-disable-line no-use-before-define
      toggle.focus();
    } else if (event.key === 'Tab' && MOBILE_QUERY.matches) {
      const controls = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      const outsidePanel = !panel.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outsidePanel)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outsidePanel)) {
        event.preventDefault();
        first?.focus();
      }
    }
  };
  function setOpen(open) {
    if (open === !panel.hidden) return;
    if (open) syncPanel();
    panel.hidden = !open;
    if (open && MOBILE_QUERY.matches) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    toggle.setAttribute('aria-expanded', String(open));
    block.classList.toggle('is-filter-open', open);
    // mobile: the filter covers the screen, the page behind it stays put
    document.body.classList.toggle('blog-listing-locked', open && MOBILE_QUERY.matches);
    if (open) {
      document.addEventListener('pointerdown', outside);
      document.addEventListener('keydown', onKey);
      (MOBILE_QUERY.matches ? close : checkboxes()[0])?.focus();
    } else {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', onKey);
    }
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });
  apply.addEventListener('click', () => {
    const checked = (name) => checkboxes()
      .filter((box) => box.checked && box.name === name)
      .map((box) => box.value);
    state.categories = new Set(checked('category'));
    state.types = new Set(checked('type'));
    state.page = 1;
    setOpen(false);
    render();
    toggle.focus();
  });
  MOBILE_QUERY.addEventListener('change', () => {
    if (panel.hidden) return;
    document.body.classList.toggle('blog-listing-locked', MOBILE_QUERY.matches);
    if (MOBILE_QUERY.matches) {
      panel.setAttribute('aria-modal', 'true');
      if (!panel.contains(document.activeElement)) close.focus();
    } else {
      panel.removeAttribute('aria-modal');
      if (document.activeElement === close) checkboxes()[0]?.focus();
    }
  });

  chips.addEventListener('click', (event) => {
    const remove = event.target.closest('.blog-listing-chip-remove');
    if (!remove) return;
    state[remove.dataset.group].delete(remove.dataset.value);
    state.page = 1;
    render();
    (chips.querySelector('button') || toggle).focus();
  });
  clear.addEventListener('click', () => {
    state.categories.clear();
    state.types.clear();
    state.page = 1;
    render();
    toggle.focus();
  });

  // --- search (a ?q= term opens prefilled, as from the header search) ---
  const initial = new URLSearchParams(window.location.search).get('q')?.trim();
  if (initial) {
    searchInput.value = initial;
    state.query = initial;
  }
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = searchInput.value.trim();
      state.page = 1;
      render();
    }, SEARCH_DELAY_MS);
  });

  // --- pagination ---
  pagination.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-page]');
    if (!target || target.disabled) return;
    state.page = Number(target.dataset.page);
    render();
    // keep the first card of the new page in view
    if (block.getBoundingClientRect().top < 0) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pagination.querySelector('[aria-current="page"]')?.focus();
  });
  PAGE_SIZE.forEach(({ query }) => window.matchMedia(query).addEventListener('change', render));

  const renderCategories = () => {
    const known = new Set(CATEGORIES);
    const extra = [...new Set(state.entries.map(({ row }) => row?.category))]
      .filter((category) => category && !known.has(category)).sort();
    categoryOptions.replaceChildren(...[...CATEGORIES, ...extra]
      .map((category) => checkbox('category', category, category)));
  };

  // --- data ---
  block.classList.add('is-loading');
  try {
    const dataVal = await fetchIndex(source);
    state.entries = dataVal;
    // prepare(dataVal);
  } catch (error) {
    state.entries = prepare(SAMPLE_ROWS);
    state.usingFallback = true;
    // eslint-disable-next-line no-console
    console.error('blog-listing: unable to load the blog index', error);
  }
  block.classList.remove('is-loading');
  renderCategories();
  render();

  if (state.usingFallback) {
    let retryTimer;
    let requestPending = false;
    let refreshIndex;
    let onVisibilityChange;
    const cleanupRetries = () => {
      clearTimeout(retryTimer);
      window.removeEventListener('focus', refreshIndex);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    refreshIndex = async () => {
      if (!state.usingFallback || requestPending) return;
      if (!block.isConnected) {
        cleanupRetries();
        return;
      }
      requestPending = true;
      try {
        state.entries = prepare(await fetchIndex(source));
        state.usingFallback = false;
        state.loadError = false;
        renderCategories();
        render();
        cleanupRetries();
      } catch {
        // Keep the sample cards visible until the live index is available.
      } finally {
        requestPending = false;
      }
    };
    onVisibilityChange = () => {
      if (!document.hidden) refreshIndex();
    };
    const scheduleRetry = () => {
      if (!state.usingFallback || !block.isConnected) return;
      retryTimer = setTimeout(async () => {
        await refreshIndex();
        scheduleRetry();
      }, INDEX_RETRY_MS);
    };
    window.addEventListener('focus', refreshIndex);
    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleRetry();
  }
}
