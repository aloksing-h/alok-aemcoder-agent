let categoryLinksCount = 0;

// shown on the mobile toggle of a table of contents without an authored title
const FALLBACK_TOC_TITLE = 'Table of contents';

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
 * Takes the authored icon image out of a cell.
 * @param {Element} [cell]
 * @returns {Element|null} the picture (or img), or null when none is authored
 */
function takeIcon(cell) {
  const image = cell?.querySelector('picture') || cell?.querySelector('img');
  if (!image) return null;
  const wrapper = image.parentElement;
  image.remove();
  if (wrapper !== cell && !wrapper.textContent.trim() && !wrapper.children.length) wrapper.remove();
  return image;
}

/**
 * Creates a decorative icon: the authored image, or the default icon of the stylesheet.
 * @param {string} className
 * @param {Element|null} image authored picture or img
 * @param {boolean} [copy] use a copy of the image, for icons repeated on every link
 * @returns {HTMLSpanElement}
 */
function createIcon(className, image, copy = false) {
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  if (!image) {
    icon.className = `blog-icon ${className}`;
    return icon;
  }
  icon.className = `category-links-custom-icon ${className}`;
  const node = copy ? image.cloneNode(true) : image;
  if (copy) {
    // only the original stays editable in Universal Editor
    [node, ...node.querySelectorAll('*')].forEach((el) => {
      [...el.attributes]
        .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
        .forEach(({ name }) => el.removeAttribute(name));
    });
  }
  const img = node.tagName === 'IMG' ? node : node.querySelector('img');
  if (img) img.alt = '';
  icon.append(node);
  return icon;
}

/**
 * Reads the entries from the authored links, or from the h2 headings of the section.
 * @param {Element} block
 * @param {Element} [linksRow]
 * @returns {{ text: string, id: string }[]}
 */
function getEntries(block, linksRow) {
  const links = [...(linksRow?.querySelectorAll('a[href*="#"]') || [])];
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
  const headings = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean);
  if (!headings.length) return;

  const setCurrent = (id) => {
    links.forEach((a) => {
      if (decodeURIComponent(a.hash.slice(1)) === id) a.setAttribute('aria-current', 'location');
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
 * Category links: the authored links, each followed by an arrow.
 * @param {HTMLUListElement} list
 * @param {Element} [linksRow]
 * @param {Element|null} linkIcon
 */
function buildCategoryList(list, linksRow, linkIcon) {
  [...(linksRow?.querySelectorAll('a[href]') || [])].forEach((a, i) => {
    const li = document.createElement('li');
    a.className = 'category-links-link';
    a.removeAttribute('title');
    const text = document.createElement('span');
    text.className = 'category-links-text';
    text.append(...a.childNodes);
    a.replaceChildren(text, createIcon('category-links-chevron', linkIcon, i > 0));
    li.append(a);
    list.append(li);
  });
}

/**
 * Table of contents: numbered links to the headings of the page.
 * @param {HTMLOListElement} list
 * @param {{ text: string, id: string }[]} entries
 */
function buildContentsList(list, entries) {
  entries.forEach((entry, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'category-links-link';
    a.href = `#${encodeURIComponent(entry.id)}`;
    a.innerHTML = `<span class="category-links-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <span class="category-links-text"></span>`;
    a.querySelector('.category-links-text').textContent = entry.text;
    li.append(a);
    list.append(li);
  });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [titleRow, linksRow] = block.children;
  const headingIcon = takeIcon(titleRow);
  const linkIcon = takeIcon(linksRow);
  const isContents = block.classList.contains('table-content');
  const title = titleRow?.textContent.trim() || (isContents ? FALLBACK_TOC_TITLE : '');
  const entries = isContents ? getEntries(block, linksRow) : [];

  categoryLinksCount += 1;
  const id = `category-links-${categoryLinksCount}`;

  const nav = document.createElement('nav');
  nav.className = 'category-links-nav';

  const list = document.createElement(isContents ? 'ol' : 'ul');
  list.className = 'category-links-list';

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'blog-panel-heading category-links-heading';
    heading.id = id;
    const text = document.createElement('span');
    text.className = 'category-links-heading-text';
    text.textContent = title;
    heading.append(createIcon('category-links-icon', headingIcon), text);
    nav.setAttribute('aria-labelledby', heading.id);
    nav.append(heading);

    if (isContents) {
      // mobile: the heading opens and closes the list
      list.id = `${id}-list`;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'category-links-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', list.id);
      toggle.append(text.cloneNode(true), createIcon('category-links-toggle-icon', linkIcon));
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        block.classList.toggle('category-links-open', !expanded);
      });
      heading.append(toggle);
    }
  }

  if (isContents) buildContentsList(list, entries);
  else buildCategoryList(list, linksRow, linkIcon);

  nav.append(list);
  block.replaceChildren(nav);

  if (isContents) observeHeadings([...list.querySelectorAll('a')]);
}
