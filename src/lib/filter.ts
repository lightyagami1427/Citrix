import { SearchResult } from '@/types';

/**
 * List of trusted domains for Citrix troubleshooting.
 * Only results from these domains will be used.
 */
const TRUSTED_DOMAINS = [
  // Citrix official
  'citrix.com',
  'support.citrix.com',
  'docs.citrix.com',
  'discussions.citrix.com',
  'community.citrix.com',

  // Technical Q&A
  'stackoverflow.com',
  'serverfault.com',
  'superuser.com',

  // Reddit Citrix community
  'reddit.com',

  // Trusted Citrix blogs
  'carlstalhood.com',
  'jasonsamuel.com',
  'george.spiers.me.uk',

  // Tech community forums
  'community.spiceworks.com',
  'techcommunity.microsoft.com',

  // Knowledge base
  'kb.vmware.com',
];

/**
 * Broader fallback domains if not enough trusted results found.
 */
const FALLBACK_DOMAINS = [
  'medium.com',
  'dev.to',
  'learn.microsoft.com',
  'docs.microsoft.com',
  'techtarget.com',
];

/**
 * Check if a URL belongs to a trusted domain.
 */
function isTrustedDomain(url: string, domains: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return domains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Check if the result is Citrix-relevant based on the URL path and content.
 */
function isCitrixRelevant(result: SearchResult): boolean {
  const text = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const citrixKeywords = [
    'citrix',
    'xenapp',
    'xendesktop',
    'netscaler',
    'storefront',
    'workspace',
    'receiver',
    'pvs',
    'provisioning',
    'vda',
    'ddc',
    'delivery controller',
    'ica',
    'hdx',
    'cvad',
    'daas',
    'sharefile',
    'gateway',
    'adc',
  ];
  return citrixKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Filter search results to only include trusted, Citrix-relevant sources.
 */
export function filterTrustedSources(results: SearchResult[]): SearchResult[] {
  // First pass: trusted domains + Citrix relevant
  let filtered = results.filter(
    (r) => isTrustedDomain(r.url, TRUSTED_DOMAINS) && isCitrixRelevant(r)
  );

  // If we have enough, return
  if (filtered.length >= 3) {
    return filtered.slice(0, 5);
  }

  // Second pass: trusted domains (even if not explicitly Citrix-keyword-heavy)
  filtered = results.filter((r) => isTrustedDomain(r.url, TRUSTED_DOMAINS));

  if (filtered.length >= 3) {
    return filtered.slice(0, 5);
  }

  // Third pass: include fallback domains that are Citrix-relevant
  const fallback = results.filter(
    (r) => isTrustedDomain(r.url, FALLBACK_DOMAINS) && isCitrixRelevant(r)
  );
  filtered = [...filtered, ...fallback];

  return filtered.slice(0, 5);
}
