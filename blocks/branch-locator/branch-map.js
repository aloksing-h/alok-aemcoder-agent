/*
 * Branch Locator map adapter
 * The block talks to the map only through this module, so a map provider can be plugged
 * in later without changing the block. Until one is registered, the authored map image is
 * shown and no branch pins are drawn.
 *
 * A provider is a function that builds a map in a container and returns its controls:
 *
 *   import { registerMapProvider } from '../blocks/branch-locator/branch-map.js';
 *   registerMapProvider(async (container, { onSelect }) => {
 *     // load the provider library, create the map ...
 *     return {
 *       showBranches(branches) {}, // pins for the current results; zoom to fit them
 *       focusBranch(branch) {},    // highlight a branch and show its details
 *       reset() {},                // back to the initial view
 *     };
 *   });
 */

let provider = null;

/**
 * Registers the map provider used by branch locators decorated after this call.
 * @param {(container: HTMLElement, options: object) => Promise<object>|object} factory
 */
export function registerMapProvider(factory) {
  provider = factory;
}

/**
 * Builds the map of a branch locator.
 * @param {HTMLElement} container
 * @param {{ image?: Element, onSelect?: (branch: object) => void }} options
 * @returns {Promise<{ interactive: boolean, showBranches: Function, focusBranch: Function,
 *   reset: Function }>}
 */
export async function createMap(container, options = {}) {
  const noop = () => {};
  if (provider) {
    try {
      const map = await provider(container, options);
      return {
        showBranches: noop, focusBranch: noop, reset: noop, ...map, interactive: true,
      };
    } catch (error) {
      // the map image is shown when the provider cannot load
      container.replaceChildren();
    }
  }
  if (options.image) container.append(options.image);
  return {
    interactive: false, showBranches: noop, focusBranch: noop, reset: noop,
  };
}
