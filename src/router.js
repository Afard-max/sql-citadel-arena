import { writable } from 'svelte/store';

const VALID_ROUTES = new Set([
  'lobby',
  'map',
  'prematch',
  'match',
  'results',
  'grimoire',
  'profile',
  'settings'
]);

function parseHash() {
  if (typeof window === 'undefined') {
    return { route: 'lobby', params: {} };
  }
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const route = VALID_ROUTES.has(pathPart) ? pathPart : 'lobby';
  const params = {};

  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    for (const [k, v] of searchParams.entries()) {
      params[k] = v;
    }
  }
  return { route, params };
}

function createRouter() {
  const { subscribe, set } = writable(parseHash());

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      set(parseHash());
    });
  }

  return {
    subscribe,
    navigate(route, params = {}) {
      const target = VALID_ROUTES.has(route) ? route : 'lobby';
      const qs = new URLSearchParams(params).toString();
      const nextHash = `#/${target}${qs ? `?${qs}` : ''}`;
      if (typeof window !== 'undefined') {
        window.location.hash = nextHash;
      } else {
        set({ route: target, params });
      }
    }
  };
}

export const router = createRouter();
