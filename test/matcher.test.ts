import { describe, expect, test } from 'vitest';
import { __test__, normalizeText, sourceSchema } from '../src/index.js';
import type { Source } from '../src/types.js';

const {
    isNameInTitle,
    isTwitterInTitle,
    isDomainInUrl,
    isTwitterInUrl,
    isDomainInLinks,
    isTwitterInLinks,
    isNameInBody,
    isTwitterInBody
} = __test__;

/**
 * Disallow passing normalized values directly to the function.
 */
type CreateSourceParams = {
    [key in keyof Omit<Source, 'nameNormalized' | 'twitterNormalized'>]+?: Source[key]
};

function createSource(params: CreateSourceParams) {
    return sourceSchema.parse(({
        id: params.id ?? Math.random().toString(),
        name: params.name ?? 'name',
        nameIsCommon: params.nameIsCommon ?? false,
        type: params.type ?? 'journalist',
        tier: params.tier ?? null,
        organization: params.organization ?? null,
        twitter: params.twitter ?? null,
        domains: params.domains ?? null,
    })) satisfies Source;
}

describe('normalization', () => {
    test('normalizeName', () => {
        const source = createSource({ name: 'fÓÓNamE' });
        expect(source.nameNormalized).toEqual('fooname');
    });

    test('normalizeTwitter', () => {
        const source = createSource({ twitter: 'fÓÓTwitteR' });
        expect(source.twitterNormalized).toEqual('footwitter');
    });
});

describe('isNameInTitle', () => {
    test('source.nameNormalized', () => {
        const source = createSource({ name: 'FÓÓNäMê', nameIsCommon: false });
        const entries = [
            ['fooName: rest of the title', true],
            ['title with fooName in it', true],
            ['title with (fooName) in it', true],
            ['title with [fooName] in it', true],
            ['foo: rest of the title', false],
            ['title with foo in it', false],
            ['title with (foo) in it', false],
            ['title with [foo] in it', false],
            ['fooNameX: rest of the title', false],
            ['title with fooNameX in it', false],
            ['title with (fooNameX) in it', false],
            ['title with [fooNameX] in it', false],
            ['xFooName: rest of the title', false],
            ['title with xFooName in it', false],
            ['title with (xFooName) in it', false],
            ['title with [xFooName] in it', false],
        ] as const;

        const result = entries.map(([title]) => isNameInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });

    test('source.nameNormalized (nameIsCommon)', () => {
        const source = createSource({ name: 'FÓÓNäMê', nameIsCommon: true });
        const entries = [
            ['fooName: rest of the title', true],
            ['title with [fooName] in it', true],
            ['title with (fooName) in it', true],
            ['title with fooName in it', false],
            ['fooNameX: rest of the title', false],
            ['title with [fooNameX] in it', false],
            ['title with (fooNameX) in it', false],
            ['xFooName: rest of the title', false],
            ['title with [xFooName] in it', false],
            ['title with (xFooName) in it', false],
        ] as const;

        const result = entries.map(([title]) => isNameInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInTitle', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'foo_Twitter' });
        const entries = [
            ['@foo_twitter: rest of the title', true],
            ['foo_twitter: rest of the title', true],
            ['title with @foo_twitter in it', true],
            ['title with (foo_twitter) in it', true],
            ['title with [foo_twitter] in it', true],
            ['title with foo_twitter in it', false],
            ['title with _foo_twitter in it', false],
            ['title with foo_twitter_ in it', false],
            ['@foo_twitterX: rest of the title', false],
            ['foo_twitterX: rest of the title', false],
            ['title with @foo_twitterX in it', false],
            ['title with (foo_twitterX) in it', false],
            ['title with [foo_twitterX] in it', false],
            ['@Xfoo_twitter: rest of the title', false],
            ['Xfoo_twitter: rest of the title', false],
            ['title with @Xfoo_twitter in it', false],
            ['title with (Xfoo_twitter) in it', false],
            ['title with [Xfoo_twitter] in it', false],
        ] as const;

        const result = entries.map(([title]) => isTwitterInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isDomainInUrl', () => {
    test('source.domains', () => {
        const source = createSource({ domains: ['foo.com'] });
        const entries = [
            ['https://foo.com', true],
            ['https://en.foo.com', true],
            ['https://en.m.foo.com', true],
            ['https://fooX.com', false],
            ['https://Xfoo.com', false],
        ] as const;

        const result = entries.map(([url]) => isDomainInUrl({ url: new URL(url), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });

    test('source.domains (subdomain)', () => {
        const source = createSource({ domains: ['en.foo.com'] });
        const entries = [
            ['https://en.foo.com', true],
            ['https://m.en.foo.com', true],
            ['https://en.fooX.com', false],
            ['https://m.en.fooX.com', false],
            ['https://en.Xfoo.com', false],
            ['https://m.en.Xfoo.com', false],
        ] as const;

        const result = entries.map(([url]) => isDomainInUrl({ url: new URL(url), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInUrl', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fooTwitter' });
        const entries = [
            ['https://twitter.com/fooTwitter', true],
            ['https://twitter.com/fooTwitter/status', true],
            ['https://twitter.com/fooTwitter/status/123', true],
            ['https://x.com/fooTwitter', true],
            ['https://x.com/fooTwitter/status', true],
            ['https://x.com/fooTwitter/status/123', true],
            ['https://twitter.com/fooTwitterX', false],
            ['https://twitter.com/_fooTwitteX/status', false],
            ['https://twitter.com/XfooTwitter', false],
        ] as const;

        const result = entries.map(([url]) => isTwitterInUrl({ url: new URL(url), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isDomainInLinks', () => {
    test('source.domains', () => {
        const source = createSource({ domains: ['bar.com', 'foo.com'] });
        const entries = [
            [[new URL('https://foo.com')], true],
            [[new URL('https://www.foo.com')], true],
            [[new URL('https://en.foo.com')], true],
            [[new URL('https://en.m.foo.com')], true],
            [[new URL('https://fooX.com')], false],
            [[new URL('https://en.fooX.com')], false],
            [[new URL('https://en.m.fooX.com')], false],
            [[new URL('https://Xfoo.com')], false],
            [[new URL('https://en.Xfoo.com')], false],
            [[new URL('https://en.m.Xfoo.com')], false],
        ] satisfies [URL[], boolean][];

        const result = entries.map(([urls]) => isDomainInLinks({ urls: urls, source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInLinks', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fÓÓTwitteR' });
        const entries = [
            [[new URL('https://twitter.com/fooTwitter'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitter/status'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitter/status/123'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter/status'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter/status/123'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitterX')], false],
            [[new URL('https://twitter.com/fooTwitterX/status')], false],
            [[new URL('https://twitter.com/fooTwitterX/status/123')], false],
            [[new URL('https://twitter.com/xFooTwitter')], false],
            [[new URL('https://twitter.com/xFooTwitter/status')], false],
            [[new URL('https://twitter.com/xFooTwitter/status/123')], false],
        ] satisfies [URL[], boolean][];

        const result = entries.map(([urls]) => isTwitterInLinks({ urls: urls, source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isNameInBody', () => {
    test('source.nameNormalized', () => {
        const source = createSource({ name: 'FÓÓNäMê', nameIsCommon: false });
        const entries = [
            ['post body with\nfooName in it', true],
            ['post body with\nfooNameX in it', false],
            ['post body with\nXfooName in it', false],
        ] as const;

        const result = entries.map(([body]) => isNameInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });

    test('source.nameNormalized (nameIsCommon)', () => {
        const source = createSource({ name: 'FÓÓNäMê', nameIsCommon: true });
        const entries = [
            ['fooName: rest of the post body', true],
            ['post body with\n(fooName) in it', true],
            ['post body with\n[fooName] in it', true],
            ['post body with\nfooName in it', false],
            ['post body with\nfooNameX in it', false],
            ['post body with\n(fooNameX) in it', false],
            ['post body with\n(XfooName) in it', false],
            ['post body with\n[fooNameX] in it', false],
            ['post body with\n[XfooName] in it', false],
        ] as const;

        const result = entries.map(([body]) => isNameInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInBody', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fÓÓ_TwitteR' });
        const entries = [
            ['foo_twitter: rest of the post body', true],
            ['@foo_twitter: rest of the post body', true],
            ['(foo_twitter): rest of the post body', true],
            ['[@foo_twitter]: rest of the post body', true],
            ['post body with\n@foo_twitter in it', true],
            ['post body with\n(foo_twitter) in it', true],
            ['post body with\n[foo_twitter] in it', true],
            ['post body with\n@foo_twitterX in it', false],
            ['post body with\n(foo_twitterX) in it', false],
            ['post body with\n[foo_twitterX] in it', false],
            ['post body with\n@Xfoo_twitter in it', false],
            ['post body with\n(Xfoo_twitter) in it', false],
            ['post body with\n[Xfoo_twitter] in it', false],
        ] as const;

        const result = entries.map(([body]) => isTwitterInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});