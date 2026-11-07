/*
 * Branch Locator data adapter
 * Loads the branch list from the URL the author sets (an AEM spreadsheet / JSON file now,
 * the client API later) and turns each row into a branch. Field names are mapped, so the
 * client API can be connected without changing the block:
 *
 *   import { configureBranchData } from '../blocks/branch-locator/branch-data.js';
 *   configureBranchData({
 *     fields: { name: ['branch_name'], pincode: ['pin'] },
 *     rows: (json) => json.result.branches,
 *   });
 */

const settings = {
  // the accepted column / property names of each branch field, compared case-insensitively
  fields: {
    id: ['id', 'branchId', 'code', 'branchCode'],
    name: ['name', 'branch', 'branchName', 'branch name'],
    address: ['address', 'branchAddress', 'branch address'],
    city: ['city', 'district'],
    state: ['state', 'region'],
    pincode: ['pincode', 'pin', 'postalCode', 'zip'],
    phone: ['phone', 'phoneNumber', 'phone number', 'contact'],
    phone2: ['phone2', 'alternatePhone', 'tollFree', 'toll free'],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'lng', 'lon', 'long'],
  },
  // finds the rows in the response: an array, or { data: [] } as AEM spreadsheets return it
  rows: (json) => {
    if (Array.isArray(json)) return json;
    return json?.data || json?.branches || json?.items || [];
  },
  // request options, for example headers the client API needs
  request: {},
  // opens directions to a branch; {destination} is replaced with its coordinates or address
  directions: 'https://www.google.com/maps/dir/?api=1&destination={destination}',
};

/**
 * Changes how branches are loaded and read.
 * @param {object} config any of fields, rows, request, directions
 */
export function configureBranchData(config = {}) {
  Object.assign(settings, config, {
    fields: { ...settings.fields, ...(config.fields || {}) },
  });
}

function pick(row, names) {
  const keys = Object.keys(row);
  const key = keys.find((k) => names.some((name) => name.toLowerCase() === k.toLowerCase()));
  const value = key === undefined ? '' : row[key];
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Turns one row of the data into a branch.
 * @param {object} row
 * @param {number} index
 * @returns {object|null}
 */
function toBranch(row, index) {
  const value = (field) => pick(row, settings.fields[field]);
  const name = value('name');
  if (!name) return null;
  const latitude = parseFloat(value('latitude'));
  const longitude = parseFloat(value('longitude'));
  return {
    id: value('id') || `branch-${index + 1}`,
    name,
    address: value('address'),
    city: value('city'),
    state: value('state'),
    pincode: value('pincode').replace(/\s/g, ''),
    phones: [value('phone'), value('phone2')].filter(Boolean),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

/**
 * Loads the branches.
 * @param {string} source URL of the branch data
 * @returns {Promise<object[]>}
 */
export async function loadBranches(source) {
  if (!source) throw new Error('branch-locator: no branch data URL');
  const response = await fetch(source, settings.request);
  if (!response.ok) throw new Error(`branch-locator: loading branches failed (${response.status})`);
  const rows = settings.rows(await response.json()) || [];
  return rows.map(toBranch).filter(Boolean);
}

const byText = (a, b) => a.localeCompare(b, 'en-IN');

/**
 * Returns the states that have branches, in alphabetical order.
 * @param {object[]} branches
 * @returns {string[]}
 */
export function statesOf(branches) {
  return [...new Set(branches.map((branch) => branch.state).filter(Boolean))].sort(byText);
}

/**
 * Returns the cities of a state that have branches, in alphabetical order.
 * @param {object[]} branches
 * @param {string} state
 * @returns {string[]}
 */
export function citiesOf(branches, state) {
  const cities = branches.filter((branch) => branch.state === state).map((branch) => branch.city);
  return [...new Set(cities.filter(Boolean))].sort(byText);
}

/**
 * Finds the branches of a pincode; when there are none, the branches of the same postal
 * district (the first three digits).
 * @param {object[]} branches
 * @param {string} pincode
 * @returns {{ branches: object[], exact: boolean }}
 */
export function searchByPincode(branches, pincode) {
  const exact = branches.filter((branch) => branch.pincode === pincode);
  if (exact.length) return { branches: exact, exact: true };
  const district = pincode.slice(0, 3);
  return {
    branches: branches.filter((branch) => branch.pincode.startsWith(district)),
    exact: false,
  };
}

/**
 * Finds the branches of a state, and of a city when one is given.
 * @param {object[]} branches
 * @param {string} state
 * @param {string} [city]
 * @returns {object[]}
 */
export function searchByArea(branches, state, city) {
  return branches.filter((branch) => branch.state === state && (!city || branch.city === city));
}

function distance(from, branch) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(branch.latitude - from.latitude);
  const dLon = rad(branch.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(from.latitude)) * Math.cos(rad(branch.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns the branches nearest to a location, closest first.
 * @param {object[]} branches
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ limit?: number, radius?: number }} [options] radius in kilometres
 * @returns {object[]}
 */
export function nearestBranches(branches, from, { limit = 18, radius = 50 } = {}) {
  return branches
    .filter((branch) => branch.latitude !== null && branch.longitude !== null)
    .map((branch) => ({ ...branch, distance: distance(from, branch) }))
    .filter((branch) => branch.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Returns the link that opens directions to a branch.
 * @param {object} branch
 * @returns {string}
 */
export function directionsUrl(branch) {
  const destination = branch.latitude !== null && branch.longitude !== null
    ? `${branch.latitude},${branch.longitude}`
    : [branch.name, branch.address].filter(Boolean).join(', ');
  return settings.directions.replace('{destination}', encodeURIComponent(destination));
}
