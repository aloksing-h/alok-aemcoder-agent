let tocCount = 0;

function toId(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Ensures the heading can be linked to and returns its id.
 * @param {Element} heading
 * @returns {string}
 */
function ensureId(heading) {
  if (!heading.id) {
    const base = toId(heading.textContent) || 'section';
    let id = base;
    let i = 1;
    while (document.getElementById(id)) {
      id = `${base}-${i}`;
      i += 1;
    }
    heading.id = id;
  }
  return heading.id;
}

/**
 * Reads the entries from the authored links, or from the h2 headings of the section.
 * @param {Element} block
 * @param {Element} [itemsCell]
 * @returns {{ text: string, id: string }[]}
 */
function getEntries(block, itemsCell) {
  const links = [...(itemsCell?.querySelectorAll('a[href*="#"]') || [])];
  if (links.length) {
    return links.map((a) => ({
      text: a.textContent.trim(),
      id: decodeURIComponent(new URL(a.href, window.location.href).hash.slice(1)),
    })).filter(({ id }) => id);
  }
  const section = block.closest('.section') || document;
  return [...section.querySelectorAll('.default-content-wrapper > h2')]
    .map((heading) => ({ text: heading.textContent.trim(), id: ensureId(heading) }));
}

/**
 * Highlights the entry of the heading currently read.
 * @param {HTMLAnchorElement[]} links
 */
function observeHeadings(links) {
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const headings = [...byId.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!headings.length) return;

  const setCurrent = (id) => {
    links.forEach((a) => {
      if (a.hash.slice(1) === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => setCurrent(entry.target.id));
  }, { rootMargin: '0px 0px -70% 0px' });
  headings.forEach((heading) => observer.observe(heading));
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [titleRow, itemsRow] = block.children;
  const title = titleRow?.textContent.trim() || '';
  const entries = getEntries(block, itemsRow);

  tocCount += 1;
  const id = `toc-${tocCount}`;

  const nav = document.createElement('nav');
  nav.className = 'toc-nav';
  nav.setAttribute('aria-labelledby', `${id}-title`);

  const heading = document.createElement('h2');
  heading.className = 'blog-panel-heading toc-heading';
  heading.id = `${id}-title`;
  heading.innerHTML = `<span class="blog-icon toc-icon" aria-hidden="true"></span>
    <span class="toc-heading-text"></span>
    <button type="button" class="toc-toggle" aria-expanded="false" aria-controls="${id}-list">
      <span class="toc-heading-text"></span>
      <span class="blog-icon toc-chevron" aria-hidden="true"></span>
    </button>`;
  heading.querySelectorAll('.toc-heading-text').forEach((span) => { span.textContent = title; });

  const list = document.createElement('ol');
  list.className = 'toc-list';
  list.id = `${id}-list`;
  entries.forEach((entry, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${entry.id}`;
    a.innerHTML = `<span class="toc-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <span class="toc-text"></span>`;
    a.querySelector('.toc-text').textContent = entry.text;
    li.append(a);
    list.append(li);
  });

  const toggle = heading.querySelector('.toc-toggle');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    block.classList.toggle('toc-open', !expanded);
  });

  nav.append(heading, list);
  block.replaceChildren(nav);

  observeHeadings([...list.querySelectorAll('a')]);
}
