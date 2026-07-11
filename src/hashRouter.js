// Custom hash router utility for handling complex paths like #/weapon/amethyst.carry_item

import { useState, useEffect } from 'react';

// Parse hash path into segments
export function parseHashPath() {
  const hash = window.location.hash || '#';
  // Remove leading # and split by /
  const path = hash.startsWith('#') ? hash.substring(1) : hash;
  const segments = path.split('/').filter(segment => segment.length > 0);
  return {
    path: '/' + segments.join('/'),
    segments: segments,
    type: segments[0] || '',
    itemId: segments[1] || null
  };
}

// Hook to get current route state
export function useHashRoute() {
  const [route, setRoute] = useState(parseHashPath());

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHashPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return route;
}

// Navigate to a new hash path
export function navigateTo(path) {
  if (!path.startsWith('#')) {
    path = '#' + path;
  }
  window.location.hash = path;
}

// Get route parameters based on current hash
// Note: data should be passed from context, not as a parameter
export function useRouteParams(data) {
  const route = useHashRoute();
  const { type, itemId } = route;
  
  // Check if type exists in data
  const typeExists = data && data.hasOwnProperty(type);
  
  // Check if item exists within the type
  const itemExists = typeExists && itemId && data[type].hasOwnProperty(itemId);
  
  return {
    ...route,
    typeExists,
    itemExists,
    item: itemExists ? data[type][itemId] : null
  };
}