import type { AppSettings, PostData, Source } from './types.js';

export function findSourcesInPost(post: PostData, settings: AppSettings) {
    const list = new Map<string, Source>();

    findMatchesInTitle(post.titleNormalized, settings.sources, list);

    if (post.url) {
        findMatchesInUrl(post.url, settings.sources, list);
    }

    if (post.links) {
        findMatchesInLinks(post.links, settings.sources, list);
    }

    if (post.bodyNormalized && settings.analyzePostBody) {
        findMatchesInBody(post.bodyNormalized, settings.sources, list);
    }

    const result = Array
        .from(list.values())
        .sort((a, b) => (a.tier ?? 6) - (b.tier ?? 6));

    return result.length > 0 ? result : null;
}

function findMatchesInTitle(titleNormalized: string, sources: Source[], list: Map<string, Source>) {
    for (const source of sources) {
        if (isNameInTitle({ titleNormalized, source })) {
            list.set(source.id, source);
        }
        else if (isTwitterInTitle({ titleNormalized, source })) {
            list.set(source.id, source);
        }
    }
}

function findMatchesInUrl(url: URL, sources: Source[], list: Map<string, Source>) {
    for (const source of sources) {
        if (isTwitterInUrl({ url, source })) {
            list.set(source.id, source);
        }
        else if (isDomainInUrl({ url, source })) {
            list.set(source.id, source);
        }
    }
}

function findMatchesInLinks(urls: URL[], sources: Source[], list: Map<string, Source>) {
    for (const source of sources) {
        if (isTwitterInLinks({ urls, source })) {
            list.set(source.id, source);
        }
        else if (isDomainInLinks({ urls, source })) {
            list.set(source.id, source);
        }
    }
}

function findMatchesInBody(bodyNormalized: string, sources: Source[], list: Map<string, Source>) {
    for (const source of sources) {
        if (isNameInBody({ bodyNormalized, source })) {
            list.set(source.id, source);
        }
        else if (isTwitterInBody({ bodyNormalized, source })) {
            list.set(source.id, source);
        }
    }
}

/**
 * Check if source.nameNormalized matches against a title. Match whole word (name) only.  
 * If source.nameIsCommon, only match these patterns:  
 * 
 * name: rest of the title  
 * title which includes (name)  
 * title which includes [name]  
 * 
 * NB: Double escape template literal RegExp
 */
function isNameInTitle({ titleNormalized, source }: { titleNormalized: string, source: Source }) {
    if (source.nameIsCommon) {
        return new RegExp(`^${source.nameNormalized}:|(\\(|\\[)${source.nameNormalized}(\\)|\\])`, 'i').test(titleNormalized);
    }

    return new RegExp(`\\b${source.nameNormalized}\\b`, 'i').test(titleNormalized);
}

/**
 * Check if source.twitterNormalized matches against a title.  
 * Only match the following patterns:  
 * 
 * twitter_handle: rest of the title  
 * @twitter_handle: rest of the title  
 * title which includes (twitter_handle)  
 * title which includes [twitter_handle]  
 * title which includes @twitter_handle  
 * 
 * NB: Double escape template literal RegExp
 */
function isTwitterInTitle({ titleNormalized, source }: { titleNormalized: string, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return new RegExp(`^@?${source.twitterNormalized}:|@${source.twitterNormalized}\\b|(\\(|\\[)${source.twitterNormalized}(\\)|\\])`, 'i').test(titleNormalized);
}

/**
 * Check if source.twitterNormalized matches against URL pathname.  
 * Only match the following patterns:  
 * 
 * /twitter_handle  
 * /twitter_handle/  
 * /twitter_handle/status/12345  
 * 
 * NB: URL pathname always starts with forward slash  
 * NB: Double escape template literal RegExp
 */
function isTwitterInUrl({ url, source }: { url: URL, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return ['x.com', 'twitter.com'].includes(url.hostname.toLowerCase())
        ? new RegExp(`^\\/${source.twitterNormalized}(\\/|\\s|$)`, 'i').test(url.pathname)
        : false;
}

/**
 * Check if source.domains includes URL hostname (domain).
 * Only match the following patterns:
 * 
 * example.com
 * www.example.com
 * sub1.example.com
 * sub1.sub2.example.com
 * 
 * NB: The URL constructor does NOT strip out www. prefix if present
 * NB: Escape periods in domain names
 * NB: Double escape template literal RegExp
 */
function isDomainInUrl({ url, source }: { url: URL, source: Source }) {
    return source.domains?.some(domain => new RegExp(`^(.*\\.)?${domain.replace(/\./g, '\\.')}$`).test(url.hostname));
}

/**
 * Check if source.twitterNormalized matches against URL list pathnames.
 * Only match the following patterns:
 * 
 * /twitter_handle
 * /twitter_handle/
 * /twitter_handle/status/12345
 * 
 * NB: Double escape template literal RegExp
 */
function isTwitterInLinks({ urls, source }: { urls: URL[], source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    const regex = new RegExp(`^\/${source.twitterNormalized}(\\/|\\s|$)`, 'i');

    return urls.some(url => regex.test(url.pathname));
}

/**
 * Check if source.domain includes URL hostnames (domains) list.
 * Only match the following patterns:
 * 
 * example.com
 * www.example.com
 * sub1.example.com
 * sub1.sub2.example.com
 * 
 * NB: The URL constructor does NOT strip out www. prefix if present
 * NB: Escape periods in domain names
 * NB: Double escape template literal RegExp
 */
function isDomainInLinks({ urls, source }: { urls: URL[], source: Source }) {
    if (!source.domains || source.domains.length < 1) {
        return false;
    }

    return urls.some(url => source.domains?.some(domain => new RegExp(`^(.*\\.)?${domain.replace(/\./g, '\\.')}$`).test(url.hostname)));
}

/**
 * Check if source.nameNormalized matches against a body. Match whole word (name) only.  
 * If source.nameIsCommon, only match these patterns:  
 * 
 * name: rest of the body  
 * body which includes (name)  
 * body which includes [name]  
 * 
 * NB: Double escape template literal RegExp  
 * NB: Use "g" (global) flag to match all occurrences in the body
 */
function isNameInBody({ bodyNormalized, source }: { bodyNormalized: string, source: Source }) {
    if (source.nameIsCommon) {
        return new RegExp(`${source.nameNormalized}:|(\\[|\\()${source.nameNormalized}(\\]|\\))`, 'gi').test(bodyNormalized);
    }

    return new RegExp(`\\b${source.nameNormalized}\\b`, 'gi').test(bodyNormalized);
}

/**
 * Check if source.twitterNormalized matches against a body.  
 * Only match the following patterns:  
 * 
 * twitter_handle: rest of the body  
 * @twitter_handle: rest of the body  
 * body which includes (twitter_handle)  
 * body which includes [twitter_handle]  
 * body which includes @twitter_handle  
 * 
 * NB: Double escape template literal RegExp  
 * NB: Use "g" (global) flag to match all occurrences in the body
 */
function isTwitterInBody({ bodyNormalized, source }: { bodyNormalized: string, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return new RegExp(`^@?${source.twitterNormalized}:|@${source.twitterNormalized}\\b|(\\(|\\[)${source.twitterNormalized}(\\)|\\])`, 'gi').test(bodyNormalized);
}

export const __test__ = {
    isNameInTitle,
    isTwitterInTitle,
    isTwitterInUrl,
    isTwitterInLinks,
    isDomainInUrl,
    isDomainInLinks,
    isNameInBody,
    isTwitterInBody
};