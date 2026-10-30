import { moveInstrumentation } from '../../scripts/scripts.js';

let formCount = 0;

function toName(text, used) {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field';
  let name = base;
  let i = 1;
  while (used.has(name)) {
    name = `${base}-${i}`;
    i += 1;
  }
  used.add(name);
  return name;
}

function splitList(text) {
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function createLabel(text, required, tag = 'span') {
  const label = document.createElement(tag);
  label.className = 'lead-form-label';
  label.textContent = text;
  if (required) {
    const mark = document.createElement('span');
    mark.className = 'lead-form-required';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '*';
    label.append(mark);
  }
  return label;
}

/**
 * Builds the control of one authored field row.
 * @returns {HTMLElement}
 */
function buildField(field, id) {
  const {
    type, label, options, required, name,
  } = field;
  const wrapper = document.createElement('div');
  wrapper.className = `lead-form-field lead-form-field-${type}`;
  if (field.half) wrapper.classList.add('lead-form-field-half');

  if (type === 'radio') {
    const fieldset = document.createElement('fieldset');
    fieldset.append(createLabel(label, required, 'legend'));
    const choices = document.createElement('div');
    choices.className = 'lead-form-choices';
    options.forEach((option, i) => {
      const choice = document.createElement('label');
      choice.className = 'lead-form-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = option;
      input.required = required;
      if (i === 0) input.checked = true;
      choice.append(input, document.createTextNode(option));
      choices.append(choice);
    });
    fieldset.append(choices);
    wrapper.append(fieldset);
    return wrapper;
  }

  if (type === 'toggle') {
    const [on = '', off = ''] = options;
    const labelEl = createLabel(label, required);
    labelEl.id = `${id}-label`;
    const control = document.createElement('label');
    control.className = 'lead-form-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.name = name;
    input.dataset.on = on;
    input.dataset.off = off;
    input.setAttribute('aria-labelledby', labelEl.id);
    // the switch exposes its on / off state, the visible texts are decorative
    const [onText, offText] = [on, off].map((text) => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = text;
      return span;
    });
    const track = document.createElement('span');
    track.className = 'lead-form-toggle-track';
    track.setAttribute('aria-hidden', 'true');
    control.append(onText, input, track, offText);
    wrapper.append(labelEl, control);
    return wrapper;
  }

  if (type === 'checkbox') {
    const control = document.createElement('label');
    control.className = 'lead-form-choice lead-form-consent';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = 'yes';
    input.required = required;
    control.append(input, document.createTextNode(label));
    wrapper.append(control);
    return wrapper;
  }

  const labelEl = createLabel(label, required, 'label');
  labelEl.classList.add('lead-form-label-hidden');
  labelEl.htmlFor = id;
  let input;
  if (type === 'select') {
    input = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = label;
    placeholder.disabled = true;
    placeholder.selected = true;
    input.append(placeholder, ...options.map((option) => {
      const el = document.createElement('option');
      el.value = option;
      el.textContent = option;
      return el;
    }));
  } else {
    input = document.createElement('input');
    input.type = type;
    if (type !== 'date') input.placeholder = label;
    if (type === 'email') input.autocomplete = 'email';
    if (type === 'tel') {
      input.autocomplete = 'tel';
      input.inputMode = 'tel';
    }
  }
  input.id = id;
  input.name = name;
  input.required = required;
  wrapper.append(labelEl, input);
  return wrapper;
}

function showMessage(container, cell, role) {
  container.replaceChildren();
  container.hidden = !cell;
  if (!cell) return;
  container.setAttribute('role', role);
  container.append(...[...cell.childNodes].map((node) => node.cloneNode(true)));
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const configRows = rows.filter((row) => row.children.length === 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [titleRow, submitRow, successRow, failureRow] = configRows;
  formCount += 1;
  const formId = `lead-form-${formCount}`;

  const title = titleRow?.textContent.trim();
  // the submit cell groups the button label and the endpoint URL
  const submitTexts = [...(submitRow?.querySelectorAll('p') || [])]
    .map((p) => p.textContent.trim());
  if (!submitTexts.length && submitRow?.textContent.trim()) {
    submitTexts.push(submitRow.textContent.trim());
  }
  const action = submitTexts.find((text) => /^(https?:\/\/|\/)/.test(text)) || '';
  const submitLabel = submitTexts.find((text) => text !== action) || '';
  const messageCell = (row) => {
    const cell = row?.firstElementChild;
    return cell?.textContent.trim() ? cell : null;
  };
  const successCell = messageCell(successRow);
  const failureCell = messageCell(failureRow);

  const form = document.createElement('form');
  form.className = 'lead-form-form';
  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'lead-form-title';
    heading.id = `${formId}-title`;
    heading.textContent = title;
    form.setAttribute('aria-labelledby', heading.id);
    form.append(heading);
  }

  const fields = document.createElement('div');
  fields.className = 'lead-form-fields';
  const used = new Set();
  fieldRows.forEach((row, i) => {
    const [typeCell, labelCell, optionsCell, settingsCell] = row.children;
    const settings = splitList(settingsCell?.textContent || '');
    const label = labelCell?.textContent.trim() || '';
    const field = {
      type: typeCell?.textContent.trim() || 'text',
      label,
      name: toName(label, used),
      options: splitList(optionsCell?.textContent || ''),
      required: settings.includes('required'),
      half: settings.includes('half'),
    };
    const el = buildField(field, `${formId}-field-${i}`);
    moveInstrumentation(row, el);
    fields.append(el);
  });
  form.append(fields);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'lead-form-submit';
  button.innerHTML = '<span class="lead-form-submit-label"></span><span class="lead-form-submit-icon" aria-hidden="true"><span class="blog-icon"></span></span>';
  button.querySelector('.lead-form-submit-label').textContent = submitLabel;
  form.append(button);

  const message = document.createElement('div');
  message.className = 'lead-form-message';
  message.hidden = true;
  message.tabIndex = -1;
  form.append(message);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    form.querySelectorAll('[role="switch"]').forEach((input) => {
      data[input.name] = input.checked ? input.dataset.on : input.dataset.off;
    });
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      if (!action) throw new Error('lead-form: no submit endpoint configured');
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) throw new Error(`lead-form: submit failed (${response.status})`);
      form.reset();
      showMessage(message, successCell, 'status');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      showMessage(message, failureCell, 'alert');
    } finally {
      button.disabled = false;
      form.removeAttribute('aria-busy');
      if (!message.hidden) message.focus();
    }
  });

  block.replaceChildren(form);
}
