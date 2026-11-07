/*
 * Contact Hero Block
 * Red inner page banner: page heading, description and an illustration in front of the
 * brand symbol.
 */

function imgOf(image) {
  return image?.tagName === 'IMG' ? image : image?.querySelector('img');
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children].map((row) => row.firstElementChild || row);
  const textCell = cells.find((cell) => !cell.querySelector('picture, img'));
  const imageCell = cells.find((cell) => cell.querySelector('picture, img'));

  const content = document.createElement('div');
  content.className = 'contact-hero-content';
  content.append(...(textCell?.childNodes || []));
  content.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('contact-hero-title');

  const body = document.createElement('div');
  body.className = 'contact-hero-body';
  body.append(content);

  // the brand symbol behind the illustration is decoration
  const visual = document.createElement('div');
  visual.className = 'contact-hero-visual';
  visual.setAttribute('aria-hidden', 'true');
  const symbol = document.createElement('span');
  symbol.className = 'contact-hero-symbol';
  visual.append(symbol);

  // illustration: the first image, and an optional second one for mobile
  const images = [...(imageCell?.querySelectorAll('picture') || [])];
  if (!images.length) images.push(...(imageCell?.querySelectorAll('img') || []));
  if (images.length) {
    const illustration = document.createElement('div');
    illustration.className = 'contact-hero-illustration';
    if (images.length > 1) illustration.classList.add('contact-hero-illustration-has-mobile');
    // the mobile illustration shows the same picture, so it takes the authored alt text
    const alt = imgOf(images[0])?.alt || '';
    images.slice(0, 2).forEach((image, i) => {
      const img = imgOf(image);
      if (img) img.alt = alt;
      image.classList.add(i === 0 ? 'contact-hero-illustration-default' : 'contact-hero-illustration-mobile');
      illustration.append(image);
    });
    // a described illustration stays available to assistive technology
    if (alt) visual.removeAttribute('aria-hidden');
    visual.append(illustration);
  }
  body.append(visual);

  block.replaceChildren(body);
}
