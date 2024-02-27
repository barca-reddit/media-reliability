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
 * Check if source.name is in the title.
 * If source.nameIsCommon, only match these patterns, otherwise anywhere:
 * 
 * [name] anywhere in the title
 * (name) anywhere in the title
 * name: at the start of the title
 * 
 * NB: Double escape template literal RegExp
 */
function isNameInTitle({ titleNormalized, source }: { titleNormalized: string, source: Source }) {
    if (source.nameIsCommon) {
        return new RegExp(`(${source.nameNormalized}:)|((\\[|\\()${source.nameNormalized}(\\]|\\)))`, 'i').test(titleNormalized);
    }

    return new RegExp(`\\b${source.nameNormalized}\\b`, 'i').test(titleNormalized);
}

function isTwitterInTitle({ titleNormalized, source }: { titleNormalized: string, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return new RegExp(`\\b${source.twitterNormalized}\\b`, 'i').test(titleNormalized);
}

/**
 * Check if pathname matches the source's twitter handle
 * `pathname` starts with forward slash, so we add it to the regex.
 * 
 * It should only match:
 * /twitter_handle/status/1234567890
 * /twitter_handle/
 * /twitter_handle
 * 
 * NB: Double escape template literal RegExp
 */
function isTwitterInUrl({ url, source }: { url: URL, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return ['x.com', 'twitter.com'].includes(url.hostname.toLowerCase())
        ? new RegExp(`^\/${source.twitterNormalized}(\\/|\\s|$)`, 'i').test(url.pathname)
        : false;
}

/**
 * The URL constructor returns the hostname with www. prefix if present,
 * so we need to remove it before we compare to source domains.
 */
function isDomainInUrl({ url, source }: { url: URL, source: Source }) {
    const domainNormalized = url.hostname.replace(/^www\./, '');

    return source.domains?.includes(domainNormalized);
}

function isTwitterInLinks({ urls, source }: { urls: URL[], source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    const regex = new RegExp(`^\/${source.twitterNormalized}(\\/|\\s|$)`, 'i');

    return urls.some(url => regex.test(url.pathname));
}

function isDomainInLinks({ urls, source }: { urls: URL[], source: Source }) {
    if (!source.domains || source.domains.length < 1) {
        return false;
    }

    return urls.some((url) => source.domains?.includes(url.hostname));
}

function isNameInBody({ bodyNormalized, source }: { bodyNormalized: string, source: Source }) {
    if (source.nameIsCommon) {
        return new RegExp(`(${source.nameNormalized}:)|((\\[|\\()${source.nameNormalized}(\\]|\\)))`, 'gi').test(bodyNormalized);
    }

    return new RegExp(`\\b${source.nameNormalized}\\b`, 'gi').test(bodyNormalized);
}

function isTwitterInBody({ bodyNormalized, source }: { bodyNormalized: string, source: Source }) {
    if (!source.twitterNormalized) {
        return false;
    }

    return new RegExp(`\\b${source.twitterNormalized}\\b`, 'gi').test(bodyNormalized);
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