/*
 * Contact Form submission layer
 * Keeps the API details out of the form interface. Each form type (the "Form type" the
 * author picks) has a submission profile: endpoint, HTTP method, headers, payload mapping
 * and response handling. No endpoint is configured yet: until the client API is available,
 * submissions resolve as "pending" and nothing is sent.
 *
 * Connect a form type once the API specification is available, for example from
 * scripts/delayed.js or a site configuration script:
 *
 *   import { configureSubmission } from '../blocks/contact-form/form-submission.js';
 *   configureSubmission('life-advisor', {
 *     endpoint: 'https://…',
 *     headers: { 'Content-Type': 'application/json' },
 *     mapPayload: (values) => ({ name: values.fullName, mobile: values.mobile }),
 *   });
 */

const DEFAULTS = {
  // no API is assumed: an empty endpoint keeps the form in the pending state
  endpoint: '',
  method: 'POST',
  // an object, or a function returning one (for tokens that change)
  headers: { 'Content-Type': 'application/json' },
  // milliseconds before the request is abandoned
  timeout: 15000,
  // maps the validated form values to the request body the API expects
  mapPayload: (values) => values,
  // turns the payload into the request body
  serialize: (payload, headers) => {
    const type = Object.entries(headers)
      .find(([name]) => name.toLowerCase() === 'content-type')?.[1] || '';
    if (type.includes('application/x-www-form-urlencoded')) return new URLSearchParams(payload);
    return JSON.stringify(payload);
  },
  // decides whether the API accepted the submission
  isSuccess: (response) => response.ok,
};

const profiles = {
  'life-advisor': {},
  callback: {},
  enquiry: {},
};

/**
 * Sets or updates the submission settings of a form type.
 * @param {string} type form type, for example 'life-advisor'
 * @param {object} config any of endpoint, method, headers, timeout, mapPayload, serialize,
 *   isSuccess
 */
export function configureSubmission(type, config = {}) {
  profiles[type] = { ...profiles[type], ...config };
}

/**
 * Returns the complete submission settings of a form type.
 * @param {string} type
 * @returns {object}
 */
export function getSubmissionProfile(type) {
  return { ...DEFAULTS, ...(profiles[type] || {}) };
}

/**
 * Tells whether a form type is connected to an API.
 * @param {string} type
 * @returns {boolean}
 */
export function isSubmissionConnected(type) {
  return Boolean(getSubmissionProfile(type).endpoint);
}

/**
 * Prepares the request for a submission without sending it.
 * @param {string} type
 * @param {object} values validated form values, keyed by field name
 * @returns {{ endpoint: string, method: string, headers: object, payload: object }}
 */
export function prepareSubmission(type, values) {
  const profile = getSubmissionProfile(type);
  const headers = typeof profile.headers === 'function' ? profile.headers() : { ...profile.headers };
  return {
    endpoint: profile.endpoint,
    method: profile.method,
    headers,
    payload: profile.mapPayload(values, { type }),
  };
}

/**
 * Submits validated form values.
 * @param {string} type
 * @param {object} values
 * @returns {Promise<{ status: 'pending'|'success'|'error', request: object,
 *   response?: Response, error?: Error }>}
 */
export async function submitForm(type, values) {
  const profile = getSubmissionProfile(type);
  const request = prepareSubmission(type, values);
  if (!request.endpoint) return { status: 'pending', request };

  try {
    const response = await fetch(request.endpoint, {
      method: request.method,
      headers: request.headers,
      body: profile.serialize(request.payload, request.headers),
      signal: AbortSignal.timeout(profile.timeout),
    });
    if (!(await profile.isSuccess(response))) {
      return { status: 'error', request, response };
    }
    return { status: 'success', request, response };
  } catch (error) {
    return { status: 'error', request, error };
  }
}
