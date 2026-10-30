let categoryLinksCount = 0;

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [titleRow, linksRow] = block.children;
  const title = titleRow?.textContent.trim() || '';
  categoryLinksCount += 1;

  const nav = document.createElement('nav');
  nav.className = 'category-links-nav';

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'blog-panel-heading category-links-heading';
    heading.id = `category-links-${categoryLinksCount}`;
    heading.innerHTML = '<span class="blog-icon category-links-icon" aria-hidden="true"></span><span></span>';
    heading.lastElementChild.textContent = title;
    nav.setAttribute('aria-labelledby', heading.id);
    nav.append(heading);
  }

  const list = document.createElement('ul');
  list.className = 'category-links-list';
  [...(linksRow?.querySelectorAll('a[href]') || [])].forEach((a) => {
    const li = document.createElement('li');
    a.className = 'category-links-link';
    a.removeAttribute('title');
    const text = document.createElement('span');
    text.append(...a.childNodes);
    a.replaceChildren(text);
    a.insertAdjacentHTML('beforeend', '<span class="blog-icon category-links-chevron" aria-hidden="true"></span>');
    li.append(a);
    list.append(li);
  });
  nav.append(list);

  block.replaceChildren(nav);
}
