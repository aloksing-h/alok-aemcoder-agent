/*
 * Contact Form Block
 * Authorable form: heading, fields (Contact Form Field items), button and messages.
 * Validation and the interface live here; sending the details is left to the submission
 * layer (form-submission.js), which stays pending until the client API is connected.
 * Contact cards linking to #form-type open the form in their place.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { submitForm } from './form-submission.js';

// interface wording used when the author gives no message
const UI = {
  required: (label) => `Please enter ${label.toLowerCase()}`,
  requiredChoice: (label) => `Please select ${label.toLowerCase()}`,
  requiredOptions: 'Please select at least one option',
  requiredConsent: 'Please accept to continue',
  invalid: {
    email: 'Please enter a valid email address',
    tel: 'Please enter a valid 10-digit mobile number',
    pincode: 'Please enter a valid 6-digit pincode',
  },
  requiredNote: '(required)',
  close: 'Close form',
  sending: 'Sending your details',
  pending: 'Your details are complete, but online submission is not connected yet, so they have not been sent. Please try again later or call us.',
  success: 'Thank you. We have received your details.',
  failure: 'Sorry, we could not send your details. Please try again.',
};

const TYPES = ['text', 'email', 'tel', 'pincode', 'textarea', 'select', 'radio', 'checkbox', 'consent'];
const SETTINGS = ['required', 'half', 'third'];
const PROFILES = ['life-advisor', 'callback', 'enquiry'];
const CHOICE_TYPES = ['radio', 'checkbox', 'consent'];

const RULES = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
  // Indian mobile numbers: 10 digits starting 6-9, optionally after +91 or 0
  tel: (value) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, '')),
  pincode: (value) => /^[1-9]\d{5}$/.test(value.replace(/\s/g, '')),
};

const AUTOCOMPLETE = {
  email: 'email',
  tel: 'tel-national',
  pincode: 'postal-code',
};

let formCount = 0;

// forms by type, and triggers that arrived before their form was decorated
const controllers = new Map();
const waiting = new Map();

function icon(name) {
  const span = document.createElement('span');
  span.className = `contact-form-icon contact-form-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/**
 * Returns the values of a cell that groups several fields, in model order: paragraphs
 * (AEM delivery) or text nodes (plain HTML), without comments and empty text.
 * @param {Element} [cell]
 * @returns {string[]}
 */
function cellValues(cell) {
  return [...(cell?.childNodes || [])]
    .filter((node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean);
}

function splitList(text) {
  return text.replace(/^\[|\]$/g, '').split(',').map((item) => item.trim()).filter(Boolean);
}

function isSettings(value) {
  const items = splitList(value.toLowerCase());
  return items.length > 0 && items.every((item) => SETTINGS.includes(item));
}

function toName(text, used) {
  const base = text.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'field';
  let name = base;
  let i = 1;
  while (used.has(name)) {
    i += 1;
    name = `${base}-${i}`;
  }
  used.add(name);
  return name;
}

/**
 * Reads one authored field row.
 * cells: type (type, field name, settings), label (label, placeholder), options,
 * error (message when empty, message when the format is wrong)
 * @param {Element} row
 * @param {Set<string>} used field names already taken
 * @returns {object}
 */
function readField(row, used) {
  const [typeCell, labelCell, optionsCell, errorCell] = row.children;
  // in model order: the type, the field name (which may equal the type), the settings
  const rest = cellValues(typeCell);
  const typeValue = TYPES.includes(rest[0]?.toLowerCase()) ? rest.shift() : '';
  const settingsValue = rest.length && isSettings(rest.at(-1)) ? rest.pop() : '';
  const [nameValue] = rest;
  const settings = splitList(settingsValue.toLowerCase());
  const [label = '', placeholder = ''] = cellValues(labelCell);
  const [error = '', invalid = ''] = cellValues(errorCell);
  const options = splitList(optionsCell?.textContent || '').map((option) => {
    const [text, value] = option.split('=').map((part) => part.trim());
    return { text, value: value || text };
  });
  return {
    type: typeValue?.toLowerCase() || 'text',
    name: toName(nameValue || label, used),
    label,
    placeholder,
    options,
    required: settings.includes('required'),
    width: ['third', 'half'].find((size) => settings.includes(size)) || '',
    messages: { required: error, invalid },
  };
}

function buildError(id) {
  const error = document.createElement('p');
  error.className = 'contact-form-error';
  error.id = id;
  error.hidden = true;
  error.append(icon('alert'), document.createElement('span'));
  return error;
}

/**
 * Builds the control of one field.
 * @param {object} field
 * @param {string} id
 * @returns {{ element: HTMLElement, controls: HTMLElement[], error: HTMLElement }}
 */
function buildControl(field, id) {
  const wrapper = document.createElement('div');
  wrapper.className = `contact-form-field contact-form-field-${field.type}`;
  if (field.width) wrapper.classList.add(`contact-form-field-${field.width}`);
  const error = buildError(`${id}-error`);

  // radio buttons and checkboxes: a fieldset with one control per option
  if (field.type === 'radio' || field.type === 'checkbox') {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'contact-form-group';
    const legend = document.createElement('legend');
    legend.className = 'contact-form-legend';
    legend.textContent = field.label;
    const choices = document.createElement('div');
    choices.className = 'contact-form-choices';
    const controls = field.options.map((option, i) => {
      const choice = document.createElement('label');
      choice.className = 'contact-form-choice';
      const input = document.createElement('input');
      input.type = field.type;
      input.name = field.name;
      input.value = option.value;
      input.id = `${id}-${i}`;
      if (field.required && field.type === 'radio') input.required = true;
      const text = document.createElement('span');
      text.textContent = option.text;
      choice.append(input, text);
      choices.append(choice);
      return input;
    });
    // a group has no required state of its own, so the legend says it
    if (field.required && field.type === 'checkbox') {
      const note = document.createElement('span');
      note.className = 'contact-form-visually-hidden';
      note.textContent = ` ${UI.requiredNote}`;
      legend.append(note);
    }
    fieldset.append(legend, choices);
    fieldset.setAttribute('aria-describedby', error.id);
    wrapper.append(fieldset, error);
    return {
      element: wrapper, controls, error, group: fieldset,
    };
  }

  // consent: one checkbox with the consent text as its label
  if (field.type === 'consent') {
    const choice = document.createElement('label');
    choice.className = 'contact-form-choice contact-form-consent';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = field.name;
    input.value = 'yes';
    input.id = id;
    input.required = field.required;
    input.setAttribute('aria-describedby', error.id);
    const text = document.createElement('span');
    text.textContent = field.label;
    choice.append(input, text);
    wrapper.append(choice, error);
    return { element: wrapper, controls: [input], error };
  }

  // text, email, mobile number, pincode, message and dropdown: a floating label
  let control;
  if (field.type === 'select') {
    control = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '';
    control.append(empty, ...field.options.map((option) => {
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = option.text;
      return el;
    }));
  } else if (field.type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 4;
  } else {
    control = document.createElement('input');
    control.type = { email: 'email', tel: 'tel' }[field.type] || 'text';
    if (field.type === 'tel' || field.type === 'pincode') control.inputMode = 'numeric';
    if (field.type === 'pincode') control.maxLength = 6;
    if (field.type === 'tel') control.maxLength = 16;
    const autocomplete = AUTOCOMPLETE[field.type] || (/name/i.test(field.name) ? 'name' : '');
    if (autocomplete) control.autocomplete = autocomplete;
  }
  control.id = id;
  control.name = field.name;
  control.className = 'contact-form-input';
  control.required = field.required;
  control.setAttribute('aria-describedby', error.id);
  if (field.placeholder && field.type !== 'select') {
    control.placeholder = field.placeholder;
    wrapper.classList.add('contact-form-field-has-placeholder');
  }
  const label = document.createElement('label');
  label.className = 'contact-form-label';
  label.htmlFor = id;
  label.textContent = field.label;
  const box = document.createElement('div');
  box.className = 'contact-form-box';
  box.append(control, label);
  if (field.type === 'select') box.append(icon('chevron'));
  wrapper.append(box, error);
  return { element: wrapper, controls: [control], error };
}

function valueOf(field) {
  const { controls, type } = field;
  if (type === 'checkbox') return controls.filter((input) => input.checked).map((input) => input.value);
  if (type === 'radio') return controls.find((input) => input.checked)?.value || '';
  if (type === 'consent') return controls[0].checked;
  return controls[0].value.trim();
}

/**
 * Returns the error message of a field, or an empty string when it is valid.
 * @param {object} field
 * @returns {string}
 */
function errorOf(field) {
  const value = valueOf(field);
  const empty = Array.isArray(value) ? !value.length : !value;
  if (empty) {
    if (!field.required) return '';
    if (field.messages.required) return field.messages.required;
    if (field.type === 'checkbox') return UI.requiredOptions;
    if (field.type === 'consent') return UI.requiredConsent;
    if (field.type === 'select' || field.type === 'radio') return UI.requiredChoice(field.label);
    return UI.required(field.label);
  }
  const rule = RULES[field.type];
  if (rule && !rule(value)) return field.messages.invalid || UI.invalid[field.type];
  return '';
}

function showError(field, message) {
  field.error.hidden = !message;
  field.error.querySelector('span').textContent = message;
  field.element.classList.toggle('contact-form-field-invalid', Boolean(message));
  const targets = field.group ? [field.group] : field.controls;
  targets.forEach((target) => {
    if (message) target.setAttribute('aria-invalid', 'true');
    else target.removeAttribute('aria-invalid');
  });
}

function updateFilled(field) {
  if (CHOICE_TYPES.includes(field.type)) return;
  field.element.classList.toggle('contact-form-field-filled', Boolean(field.controls[0].value));
}

/**
 * Connects a contact card (or any link to #form-type) to the form it opens.
 * The trigger becomes a button that shows the form in place of the cards.
 * @param {string} type form type, the id of the form
 * @param {HTMLAnchorElement} trigger
 * @param {{ onOpen?: Function, onClose?: Function, content?: Element }} [handlers] content is
 *   what shows again when the form closes
 */
export function connectFormTrigger(type, trigger, handlers = {}) {
  const entry = { trigger, ...handlers };
  const controller = controllers.get(type);
  if (controller) {
    controller.connect(entry);
  } else {
    if (!waiting.has(type)) waiting.set(type, []);
    waiting.get(type).push(entry);
  }
}

// the prototype's dissolve: about 550ms with Figma's ease out (see contact-form.css)
const DISSOLVE = { duration: 550, easing: 'cubic-bezier(0, 0, 0.58, 1)' };

/**
 * Swaps the cards and the form with a cross-fade of the page, like the prototype.
 * Without view transitions the newly shown content fades in; with reduced motion the
 * swap is instant.
 * @param {Function} update the DOM change
 * @param {Element} [shown] the content that appears, for the fallback fade
 * @returns {Promise<void>} resolves when the change is visible
 */
function dissolve(update, shown) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return Promise.resolve();
  }
  if (document.startViewTransition) {
    const root = document.documentElement;
    root.classList.add('contact-form-dissolve');
    const transition = document.startViewTransition(update);
    return transition.finished
      .catch(() => {})
      .finally(() => root.classList.remove('contact-form-dissolve'));
  }
  update();
  shown?.animate([{ opacity: 0 }, { opacity: 1 }], DISSOLVE);
  return Promise.resolve();
}

function toButton(link) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = link.className;
  button.append(...link.childNodes);
  link.replaceWith(button);
  return button;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const configRows = rows.filter((row) => row.children.length === 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [textRow, submitRow, successRow, failureRow] = configRows;
  formCount += 1;
  const formId = `contact-form-${formCount}`;

  // the submit cell groups the button label and the form type
  const submitValues = cellValues(submitRow?.firstElementChild);
  const profile = submitValues.find((value) => PROFILES.includes(value)) || PROFILES[0];
  const submitLabel = submitValues.find((value) => value !== profile) || '';
  const messageCell = (row) => {
    const cell = row?.firstElementChild;
    return cell?.textContent.trim() ? cell : null;
  };
  const successCell = messageCell(successRow);
  const failureCell = messageCell(failureRow);

  const form = document.createElement('form');
  form.className = 'contact-form-form';
  form.noValidate = true;

  // heading and note
  const header = document.createElement('div');
  header.className = 'contact-form-header';
  const textCell = textRow?.firstElementChild;
  const [title, ...notes] = [...(textCell?.children || [])];
  if (title) {
    title.classList.add('contact-form-title');
    title.id = `${formId}-title`;
    title.tabIndex = -1;
    form.setAttribute('aria-labelledby', title.id);
    header.append(title);
  }
  notes.forEach((note) => {
    note.classList.add('contact-form-note');
    header.append(note);
  });
  if (header.children.length) form.append(header);

  // fields
  const list = document.createElement('div');
  list.className = 'contact-form-fields';
  const used = new Set();
  const fields = fieldRows.map((row, i) => {
    const field = readField(row, used);
    Object.assign(field, buildControl(field, `${formId}-field-${i}`));
    moveInstrumentation(row, field.element);
    list.append(field.element);
    return field;
  });
  form.append(list);

  // button and the message shown after submitting
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'contact-form-submit';
  const label = document.createElement('span');
  label.className = 'contact-form-submit-label';
  label.textContent = submitLabel;
  const arrow = document.createElement('span');
  arrow.className = 'contact-form-submit-arrow';
  arrow.append(icon('arrow'));
  button.append(label, arrow);
  const actions = document.createElement('div');
  actions.className = 'contact-form-actions';
  actions.append(button);
  form.append(actions);

  const message = document.createElement('div');
  message.className = 'contact-form-message';
  message.tabIndex = -1;
  message.hidden = true;
  form.append(message);

  const touched = new Set();
  const updateReady = () => {
    form.classList.toggle('contact-form-ready', fields.every((field) => !errorOf(field)));
  };
  const showMessage = (status, cell, text) => {
    message.className = `contact-form-message contact-form-message-${status}`;
    message.replaceChildren();
    if (cell) message.append(...[...cell.childNodes].map((node) => node.cloneNode(true)));
    else message.textContent = text;
    message.hidden = false;
    message.focus();
  };

  fields.forEach((field) => {
    const check = () => showError(field, errorOf(field));
    field.element.addEventListener('input', () => {
      updateFilled(field);
      if (touched.has(field)) check();
      updateReady();
    });
    field.element.addEventListener('change', () => {
      updateFilled(field);
      if (touched.has(field) || CHOICE_TYPES.includes(field.type)) {
        touched.add(field);
        check();
      }
      updateReady();
    });
    // a field is checked when the visitor leaves it
    field.element.addEventListener('focusout', (event) => {
      if (field.element.contains(event.relatedTarget)) return;
      if (!valueOf(field) || (Array.isArray(valueOf(field)) && !valueOf(field).length)) return;
      touched.add(field);
      check();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    message.hidden = true;
    const invalid = fields.filter((field) => {
      touched.add(field);
      const error = errorOf(field);
      showError(field, error);
      return Boolean(error);
    });
    if (invalid.length) {
      invalid[0].controls[0]?.focus();
      return;
    }

    const values = Object.fromEntries(fields.map((field) => [field.name, valueOf(field)]));
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.setAttribute('aria-label', `${submitLabel}. ${UI.sending}`);
    const result = await submitForm(profile, values);
    form.removeAttribute('aria-busy');
    button.disabled = false;
    button.removeAttribute('aria-label');
    // integrations and analytics can follow the outcome; the values are not logged
    block.dispatchEvent(new CustomEvent('contact-form:submit', {
      bubbles: true,
      detail: { type: profile, status: result.status, request: result.request },
    }));

    if (result.status === 'pending') {
      showMessage('pending', null, UI.pending);
    } else if (result.status === 'success') {
      form.reset();
      touched.clear();
      fields.forEach((field) => {
        updateFilled(field);
        showError(field, '');
      });
      updateReady();
      showMessage('success', successCell, UI.success);
    } else {
      showMessage('error', failureCell, UI.failure);
    }
  });

  // close button, shown when a contact card opens the form
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'contact-form-close';
  close.setAttribute('aria-label', UI.close);
  close.append(icon('close'));
  close.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'contact-form-panel';
  panel.id = profile;
  panel.append(form);
  block.replaceChildren(close, panel);
  block.dataset.formType = profile;

  // opening and closing from contact cards
  const triggers = [];
  let active = null;
  const setExpanded = (expanded) => triggers.forEach((entry) => {
    entry.trigger.setAttribute('aria-expanded', String(expanded));
  });
  const closeForm = () => {
    if (block.hidden || !triggers.length) return;
    const trigger = active?.trigger || triggers[0].trigger;
    dissolve(() => {
      block.hidden = true;
      setExpanded(false);
      triggers.forEach((entry) => entry.onClose?.());
    }, active?.content).then(() => trigger.focus());
    active = null;
  };
  const openForm = (entry) => {
    active = entry;
    dissolve(() => {
      triggers.forEach((item) => item.onOpen?.());
      block.hidden = false;
      setExpanded(true);
    }, block).then(() => (title || form.querySelector('input, select, textarea'))?.focus());
  };
  close.addEventListener('click', closeForm);
  block.addEventListener('keydown', (event) => {
    // Escape in an open dropdown only closes the dropdown
    if (event.key === 'Escape' && triggers.length && event.target.tagName !== 'SELECT') closeForm();
  });

  const connect = (entry) => {
    if (!triggers.length) {
      block.hidden = true;
      close.hidden = false;
    }
    if (entry.trigger.tagName === 'A') entry.trigger = toButton(entry.trigger);
    entry.trigger.setAttribute('aria-controls', panel.id);
    entry.trigger.setAttribute('aria-expanded', 'false');
    entry.trigger.addEventListener('click', () => openForm(entry));
    triggers.push(entry);
  };
  controllers.set(profile, { connect });
  (waiting.get(profile) || []).forEach(connect);
  waiting.delete(profile);
  updateReady();
}
