import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// URL Utilities
export function isAbsoluteUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  return /^https?:\/\//i.test(u) || u.startsWith('data:') || u.startsWith('blob:');
}

export function getOriginFromBase(apiBase) {
  try {
    const parsed = new URL(apiBase, window.location.origin);
    return parsed.origin;
  } catch (_e) {
    return '';
  }
}

// Normalize any API path or URL against API_BASE without double-prefixing /api
export function normalizeApiUrl(pathOrUrl, apiBase = (import.meta?.env?.VITE_API_BASE_URL || '/api')) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const raw = pathOrUrl.trim();
  if (!raw) return '';
  if (isAbsoluteUrl(raw)) return raw;

  const base = (apiBase || '/api').trim();
  const baseUrl = new URL(base, window.location.origin);
  const baseOrigin = baseUrl.origin; // e.g., http://localhost:5001
  const basePath = baseUrl.pathname.replace(/\/$/, ''); // e.g., /api

  // Root-relative input
  if (raw.startsWith('/')) {
    // If it already starts with the API base path (e.g., /api/..), keep it
    if (basePath && raw.startsWith(`${basePath}/`)) {
      return `${baseOrigin}${raw}`;
    }
    // Otherwise, prefix with the API base path
    const full = `${baseOrigin}${basePath}${raw}`;
    return full.replace(/([^:]\/)\/+?/g, '$1');
  }

  // Relative input: append to API base path
  const full = `${baseOrigin}${basePath}/${raw}`;
  return full.replace(/([^:]\/)\/+?/g, '$1');
}

export function normalizeImageUrls(urls, apiBase = (import.meta?.env?.VITE_API_BASE_URL || '/api')) {
  if (!Array.isArray(urls)) return [];
  const normalized = urls
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
    .map(u => normalizeApiUrl(u, apiBase));
  // Deduplicate while preserving order
  const seen = new Set();
  const out = [];
  for (const u of normalized) {
    if (!seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}
