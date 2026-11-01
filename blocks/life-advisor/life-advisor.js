/*
 * Life Advisor Block
 * Image with a right-aligned heading, a short line and a button.
 */

/**
 * Builds a pill button with a round arrow from an authored link.
 * @param {Element} [source]
 * @returns {HTMLAnchorElement|null}
 */
function buildButton(source) {
  if (!source) return null;
  const a = document.createElement('a');
  a.href = source.href;
  a.className = 'life-advisor-button';
  // Filled is the default style; Outline renders the link without bold
  const filled = source.closest('strong, b') || source.classList.contains('primary');
  if (!filled) a.classList.add('life-advisor-button-outline');
  a.innerHTML = '<span class="life-advisor-button-label"></span><span class="life-advisor-button-arrow"><span class="life-advisor-icon" aria-hidden="true"></span></span>';
  a.querySelector('.life-advisor-button-label').textContent = source.textContent.trim();
  return a;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children].map((row) => row.firstElementChild || row);
  const imageCell = cells.find((cell) => cell.querySelector('picture, img'));
  const linkCell = cells.find((cell) => cell !== imageCell
    && cell.querySelector('a[href]')
    && !cell.querySelector('h1, h2, h3, h4, h5, h6'));
  const textCell = cells.find((cell) => cell !== imageCell && cell !== linkCell);

  const media = document.createElement('div');
  media.className = 'life-advisor-media';
  const picture = imageCell?.querySelector('picture') || imageCell?.querySelector('img');
  if (picture) media.append(picture);

  const content = document.createElement('div');
  content.className = 'life-advisor-content';
  const text = document.createElement('div');
  text.className = 'life-advisor-text';
  if (textCell) text.append(...textCell.childNodes);
  text.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('life-advisor-title');
  content.append(text);

  const button = buildButton(linkCell?.querySelector('a[href]'));
  if (button) {
    const cta = document.createElement('p');
    cta.className = 'life-advisor-cta';
    cta.append(button);
    content.append(cta);
  }

  block.replaceChildren(...(picture ? [media] : []), content);
}
