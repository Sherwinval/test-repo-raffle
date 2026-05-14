import { useEffect, useState, useCallback } from 'react';

function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query));
  return { path: '/' + segments.join('/'), segments, params };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to) => {
    if (!to) return;
    const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`;
    if (window.location.hash !== target) window.location.hash = target;
  }, []);

  return { ...route, navigate };
}

export function buildPath(segments, params = {}) {
  const path = '/' + segments.filter(Boolean).join('/');
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}
