let authorCardCount = 0;

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [photoRow, authorRow, linkRow, bioRow] = block.children;
  authorCardCount += 1;
  const id = `author-card-${authorCardCount}`;

  const texts = [...(authorRow?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  if (!texts.length && authorRow?.textContent.trim()) texts.push(authorRow.textContent.trim());
  const name = texts.length > 1 ? texts[1] : texts[0] || '';
  const role = texts.length > 1 ? texts[0] : '';

  const header = document.createElement('div');
  header.className = 'author-card-header';

  const picture = photoRow?.querySelector('picture');
  if (picture) {
    const photo = document.createElement('div');
    photo.className = 'author-card-photo';
    photo.append(picture);
    header.append(photo);
  }

  const byline = document.createElement('p');
  byline.className = 'author-card-byline';
  byline.id = `${id}-byline`;
  if (role) {
    const roleEl = document.createElement('span');
    roleEl.className = 'author-card-role';
    roleEl.textContent = role;
    byline.append(roleEl, ' ');
  }
  const nameEl = document.createElement('span');
  nameEl.className = 'author-card-name';
  nameEl.textContent = name;
  byline.append(nameEl);
  header.append(byline);

  const link = linkRow?.querySelector('a');
  if (link) {
    link.className = 'author-card-link';
    link.setAttribute('aria-label', link.title || name);
    if (link.hostname.includes('linkedin')) link.classList.add('author-card-link-linkedin');
    link.replaceChildren();
    header.append(link);
  }

  const bioContent = bioRow?.firstElementChild;
  const children = [header];
  if (bioContent && bioContent.textContent.trim()) {
    const bio = document.createElement('div');
    bio.className = 'author-card-bio';
    bio.id = `${id}-bio`;
    bio.hidden = true;
    bio.append(...bioContent.childNodes);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'author-card-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', bio.id);
    toggle.setAttribute('aria-labelledby', byline.id);
    toggle.innerHTML = '<span class="blog-icon author-card-chevron" aria-hidden="true"></span>';
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      bio.hidden = expanded;
    });
    header.append(toggle);
    children.push(bio);
  }

  block.replaceChildren(...children);
}
