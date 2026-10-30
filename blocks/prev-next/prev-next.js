/**
 * Builds one direction link from a cell holding a label and a link.
 * @param {Element} cell
 * @param {string} direction prev or next
 * @returns {HTMLAnchorElement|null}
 */
function buildLink(cell, direction) {
  const source = cell?.querySelector('a[href]');
  if (!source) return null;
  const labelEl = [...cell.querySelectorAll('p')].find((p) => !p.contains(source));
  const label = labelEl?.textContent.trim() || '';

  const a = document.createElement('a');
  a.href = source.href;
  a.rel = direction;
  a.className = `prev-next-link prev-next-${direction}`;
  a.innerHTML = `<span class="prev-next-label"><span class="blog-icon prev-next-arrow" aria-hidden="true"></span><span></span></span>
    <span class="prev-next-title"></span>`;
  a.querySelector('.prev-next-label > span:last-child').textContent = label;
  a.querySelector('.prev-next-title').textContent = source.textContent.trim();
  return a;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [prevRow, nextRow] = block.children;
  const prev = buildLink(prevRow?.firstElementChild, 'prev');
  const next = buildLink(nextRow?.firstElementChild, 'next');

  const nav = document.createElement('nav');
  nav.className = 'prev-next-nav';
  const label = [prev, next]
    .filter(Boolean)
    .map((a) => a.querySelector('.prev-next-label').textContent.trim())
    .join(' / ');
  if (label) nav.setAttribute('aria-label', label);
  if (prev) nav.append(prev);
  if (next) nav.append(next);
  block.replaceChildren(nav);
}
