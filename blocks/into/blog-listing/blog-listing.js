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

const DEFAULT_SOURCE = '/query-insurance-index.json';
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
const CATEGORY_LABELS = {
  'about-life-insurance': 'About Life Insurance',
  'current-affairs': 'Current Affairs',
  'government-schemes': 'Government Schemes',
  'health-insurance': 'Health Insurance',
  protection: 'Protection24',
  protection24: 'Protection24',
  retirement: 'Retirement',
  savingstax: 'Savings & Tax',
  'savings-tax': 'Savings & Tax',
  'savings-&-tax': 'Savings & Tax',
  'term-insurance': 'Term Insurance',
  ulip: 'ULIP',
  'wealth-creation': 'Wealth Creation',
};
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
const CATEGORY_SCORE = 2;
const TYPE_SCORE = 1;

const ICONS = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M14.9999 13.1384L16.281 14.4195C16.7951 14.9336 16.7951 15.7671 16.281 16.2812C15.767 16.7952 14.9335 16.7952 14.4194 16.2812L13.1383 15M3.33325 9.00004C3.33325 5.87043 5.8703 3.33337 8.99991 3.33337C12.1295 3.33337 14.6666 5.87043 14.6666 9.00004C14.6666 12.1297 12.1295 14.6667 8.99991 14.6667C5.8703 14.6667 3.33325 12.1297 3.33325 9.00004Z" stroke-width="1.25" stroke-linecap="round" stroke="#A4A7AE"/></svg>',
  filter: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M3.75 15.75L3.75 10.5M3.75 10.5C4.57843 10.5 5.25 9.82843 5.25 9C5.25 8.17157 4.57843 7.5 3.75 7.5M3.75 10.5C2.92157 10.5 2.25 9.82843 2.25 9C2.25 8.17157 2.92157 7.5 3.75 7.5M9 15.75V9M9 3.75V2.25M9 3.75C9.82843 3.75 10.5 4.42157 10.5 5.25C10.5 6.07843 9.82843 6.75 9 6.75C8.17157 6.75 7.5 6.07843 7.5 5.25C7.5 4.42157 8.17157 3.75 9 3.75ZM3.75 7.5L3.75 2.25M14.25 9V2.25M14.25 15.75V14.25M14.25 14.25C15.0784 14.25 15.75 13.5784 15.75 12.75C15.75 11.9216 15.0784 11.25 14.25 11.25C13.4216 11.25 12.75 11.9216 12.75 12.75C12.75 13.5784 13.4216 14.25 14.25 14.25Z" stroke-width="1.5" stroke-linecap="round" stroke="#FA1432"/></svg>',
  chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M13.5 11.25C13.5 11.25 10.1858 6.75001 8.99996 6.75C7.81414 6.74999 4.5 11.25 4.5 11.25" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke="#E1122D"/></svg>',
  close: '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" focusable="false"><path d="m10.34 10.34 11.32 11.32m0-11.32L10.34 21.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  remove: '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true" focusable="false"><path d="m3 3 6 6m0-6L3 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none" aria-hidden="true" focusable="false"><path d="M17.3964 11.2842H4.70166" stroke-width="1.41053" stroke-linecap="round" stroke-linejoin="round" stroke="#FA1432"/><path d="M12.2246 16.9263C12.2246 16.9263 17.8667 12.771 17.8667 11.2842C17.8667 9.79731 12.2246 5.64209 12.2246 5.64209" stroke-width="1.41053" stroke-linecap="round" stroke-linejoin="round" stroke="#FA1432"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" focusable="false"><path d="M7.5 5.6c0-1.13 1.23-1.83 2.2-1.26l9.1 5.4c.95.56.95 1.94 0 2.5l-9.1 5.4c-.97.58-2.2-.12-2.2-1.25Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  prev: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M12.5 5C12.5 5 7.5 8.68242 7.5 10C7.5 11.3177 12.5 15 12.5 15" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M7.50004 5C7.50004 5 12.5 8.68242 12.5 10C12.5 11.3177 7.5 15 7.5 15" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" stroke="#E1122D"/></svg>',
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
async function fetchIndex(source, forceRefresh = false) {
  const cacheKey = `${CACHE_PREFIX}${source}`;
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // storage unavailable, fetch instead
    }
  }
  const rows = [];
  let offset = 0;
  let total = Infinity;
  let hasTotal = false;
  let pagesFetched = 0;
  while (offset < total && pagesFetched < 100) {
    const url = new URL(source, window.location.href);
    url.searchParams.set('limit', INDEX_PAGE_SIZE);
    url.searchParams.set('offset', offset);
    let json;
    let skipPage = false;
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      // eslint-disable-next-line no-await-in-loop
      json = await response.json();
    } catch (error) {
      if (offset === 0) throw error;
      if (!hasTotal) break;
      skipPage = true;
    }

    if (skipPage) {
      offset += INDEX_PAGE_SIZE;
      pagesFetched += 1;
    } else {
      const reportedTotal = Number(json?.total);
      if (json?.total !== null && json?.total !== ''
        && Number.isSafeInteger(reportedTotal) && reportedTotal >= 0) {
        total = reportedTotal;
        hasTotal = true;
      }
      if (!Array.isArray(json?.data)) {
        if (offset === 0 && !hasTotal) throw new Error(`Invalid index page: ${url}`);
        offset += INDEX_PAGE_SIZE;
        pagesFetched += 1;
      } else {
        rows.push(...json.data);
        if (!hasTotal) total = offset + json.data.length;
        offset += INDEX_PAGE_SIZE;
        pagesFetched += 1;
      }
    }
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
  if (!Array.isArray(rows)) return [];
  return rows.reduce((entries, row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.path !== 'string' || /noindex/i.test(row.robots || '')) return entries;

    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) return entries;

    let url;
    try {
      url = new URL(row.path, window.location.origin);
    } catch {
      return entries;
    }
    if (url.origin !== window.location.origin || row.path.startsWith('//')) return entries;

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'insurance-guide' && segments.length < 3) return entries;

    const rawType = typeof row.type === 'string' ? row.type.trim().toLowerCase() : '';
    const knownType = TYPES.find(({ value }) => value === rawType);
    const type = knownType?.value || 'blog';
    const rawCategory = typeof row.category === 'string' ? row.category.trim() : '';
    const categoryKey = rawCategory.toLowerCase().replace(/[\s_]+/g, '-');
    const category = CATEGORY_LABELS[categoryKey] || rawCategory;
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const normalizedRow = {
      ...row,
      path: `${url.pathname}${url.search}${url.hash}`,
      title,
      description,
      type,
      category,
    };
    delete normalizedRow.image;
    const typeLabel = knownType?.label || TYPES[0].label;
    const modified = Number(row.lastModified);
    entries.push({
      row: normalizedRow,
      title: title.toLowerCase(),
      description: description.toLowerCase(),
      category: category.toLowerCase(),
      type: typeLabel.toLowerCase(),
      typeWasDefaulted: !knownType,
      modified: Number.isFinite(modified) ? modified : 0,
    });
    return entries;
  }, []).sort((x, y) => y.modified - x.modified);
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
    const inCategory = entry.category.includes(term);
    const inType = entry.type.includes(term);
    total += (inTitle ? TITLE_SCORE : 0)
      + (inDescription ? DESCRIPTION_SCORE : 0)
      + (inCategory ? CATEGORY_SCORE : 0)
      + (inType ? TYPE_SCORE : 0);
    return inTitle || inDescription || inCategory || inType;
  });
  return matched ? total : 0;
}

/**
 * @param {object} row index row
 * @returns {HTMLLIElement}
 */
function buildCard(row, imageSources) {
  const type = TYPES.find(({ value }) => value === row.type) || TYPES[0];
  const text = div(
    { class: 'blog-listing-card-text' },
    h3({ class: 'blog-listing-card-title' }, row?.title || row?.path || ''),
  );
  if (row?.description) text.append(p({ class: 'blog-listing-card-description' }, row?.description));
  const content = div({ class: 'blog-listing-card-content' });
  if (row?.category) content.append(span({ class: 'blog-listing-card-category' }, row?.category));
  content.append(text);

  const fallback = art(row.type);
  const authoredImage = imageSources[row.type] || '';
  const imageSource = authoredImage || fallback;
  const image = img({
    class: 'blog-listing-card-art', src: imageSource, alt: '', loading: 'lazy', width: 240, height: 240,
  });
  const artwork = [image];
  if (row.mobileImage && !authoredImage) {
    artwork.push(img({
      class: 'blog-listing-card-art-mobile',
      src: `${window.hlx.codeBasePath}/blocks/blog-listing/${row?.mobileImage}`,
      alt: '',
      loading: 'lazy',
      'aria-hidden': 'true',
    }));
  }
  image.addEventListener('error', () => {
    if (image.src !== new URL(fallback, window.location.href).href) image.src = fallback;
  }, { once: true });

  return li(
    { class: `blog-listing-card blog-listing-card-${row.type}` },
    a(
      { class: 'blog-listing-card-link', href: row?.path },
      span({ class: 'blog-listing-card-type' }, type?.badge),
      content,
      // blogs open with an arrow, videos and podcasts with play
      icon(row.type === 'blog' ? 'arrow' : 'play', { class: 'blog-listing-card-action' }),
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
  const [
    textRow,
    sourceRow,
    blogImageRow,
    videoThumbnailRow,
    podcastImageRow,
  ] = [...block.children];
  const source = sourceRow?.querySelector('a')?.getAttribute('href')
    || sourceRow?.textContent.trim() || DEFAULT_SOURCE;
  const imageSource = (row) => row?.querySelector('picture img, img')?.getAttribute('src') || '';
  const imageSources = {
    blog: imageSource(blogImageRow),
    video: imageSource(videoThumbnailRow),
    podcast: imageSource(podcastImageRow),
  };

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
    icon('filter', { class: 'blog-listing-filter-icon' }),
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
    cards.replaceChildren(...shown.map((row) => buildCard(row, imageSources)));
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

  const needsIndexRefresh = () => state.usingFallback
    || state.entries.some((entry) => entry.typeWasDefaulted);

  // --- data ---
  block.classList.add('is-loading');
  try {
    const dataVal = await fetchIndex(source);
    state.entries = prepare(dataVal);
  } catch (error) {
    state.entries = prepare(SAMPLE_ROWS);
    state.usingFallback = true;
    // eslint-disable-next-line no-console
    console.error('blog-listing: unable to load the blog index', error);
  }
  block.classList.remove('is-loading');
  renderCategories();
  render();

  if (needsIndexRefresh()) {
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
      if (!needsIndexRefresh() || requestPending) return;
      if (!block.isConnected) {
        cleanupRetries();
        return;
      }
      requestPending = true;
      try {
        const refreshedEntries = prepare(await fetchIndex(source, true));
        if (refreshedEntries.length) {
          state.entries = refreshedEntries;
          state.usingFallback = false;
          state.loadError = false;
          renderCategories();
          render();
        }
        if (!needsIndexRefresh()) cleanupRetries();
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
      if (!needsIndexRefresh() || !block.isConnected) return;
      retryTimer = setTimeout(async () => {
        await refreshIndex();
        scheduleRetry();
      }, INDEX_RETRY_MS);
    };
    window.addEventListener('focus', refreshIndex);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (needsIndexRefresh()) scheduleRetry();
  }
}
