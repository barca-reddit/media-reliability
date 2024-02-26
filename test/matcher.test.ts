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

describe('isNameInTitle', () => {
    test('source.nameNormalized', () => {
        const source = createSource({ name: 'fÓÓ' });
        const entries = [
            ['title with foo in it', true],
            ['title with fÓo in it', true],
            ['title with foo in it', true],
            ['title with (foo) in it', true],
            ['title with [foo] in it', true],
            ['title with foos in it', false],
            ['title with fÓos in it', false],
            ['title with foos in it', false],
            ['title with (foos) in it', false],
            ['title with [foos] in it', false],
        ] as const;

        const result = entries.map(([title]) => isNameInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });

    test('source.nameNormalized | source.nameIsCommon', () => {
        const source = createSource({ name: 'fÓÓ', nameIsCommon: true });
        const entries = [
            ['Foo: title with bar in it', true],
            ['title with [Foo] in it', true],
            ['title with (Foo) in it', true],
            ['fÓÓ: title with bar in it', true],
            ['title with [fÓÓ] in it', true],
            ['title with (fÓÓ) in it', true],
            ['title with foo in it', false],
            ['title with fÓÓ in it', false],
            ['foo title with bar in it', false],
        ] as const;

        const result = entries.map(([title]) => isNameInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInTitle', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fooTwitter' });
        const entries = [
            ['title with fooTwitter in it', true],
            ['title with @fooTwitter in it', true],
            ['title with @fÓÓTwitter in it', true],
            ['title with !!!fÓÓTwitter!!! in it', true],
            ['title with foosTwitter in it', false],
            ['title with _fooTwitter in it', false],
            ['title with twitter in it', false],
        ] as const;

        const result = entries.map(([title]) => isTwitterInTitle({ titleNormalized: normalizeText(title), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isDomainInUrl', () => {
    test('source.domains', () => {
        const source = createSource({ domains: ['foo.com', 'en.foo.com', 'en.m.foo.com'] });
        const entries = [
            ['https://foo.com', true],
            ['https://en.foo.com', true],
            ['https://en.m.foo.com', true],
            ['https://foo.com/', true],
            ['https://foo.com/path', true],
            ['https://foo.com/path/~stuff?param=1', true],
            ['https://foos.com', false],
            ['https://us.foo.com', false],
            ['https://en.x.foo.com', false],
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
            ['https://twitter.com/fooTwitters', false],
            ['https://twitter.com/_fooTwitter/status', false],
        ] as const;

        const result = entries.map(([url]) => isTwitterInUrl({ url: new URL(url), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isDomainInLinks', () => {
    test('source.domains', () => {
        const source = createSource({ domains: ['foo.com', 'en.foo.com', 'en.m.foo.com'] });
        const entries = [
            [[new URL('https://foo.com'), new URL('https://bar.com')], true],
            [[new URL('https://en.foo.com'), new URL('https://bar.com')], true],
            [[new URL('https://en.m.foo.com'), new URL('https://bar.com')], true],
            [[new URL('https://foos.com'), new URL('https://bar.com')], false],
            [[new URL('https://eng.foo.com'), new URL('https://bar.com')], false],
            [[new URL('https://en.x.foo.com'), new URL('https://bar.com')], false],
        ] satisfies [URL[], boolean][];

        const result = entries.map(([urls]) => isDomainInLinks({ urls: urls, source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInLinks', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fooTwitter' });
        const entries = [
            [[new URL('https://twitter.com/fooTwitter'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitter/status'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitter/status/123'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter/status'), new URL('https://bar.com')], true],
            [[new URL('https://x.com/fooTwitter/status/123'), new URL('https://bar.com')], true],
            [[new URL('https://twitter.com/fooTwitters'), new URL('https://bar.com')], false],
            [[new URL('https://twitter.com/_fooTwitter/status'), new URL('https://bar.com')], false],
            [[new URL('https://x.com/fooTwitters'), new URL('https://bar.com')], false],
            [[new URL('https://x.com/_fooTwitter/status'), new URL('https://bar.com')], false],
        ] satisfies [URL[], boolean][];

        const result = entries.map(([urls]) => isTwitterInLinks({ urls: urls, source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isNameInBody', () => {
    test('source.nameNormalized', () => {
        const source = createSource({ name: 'fÓo' });
        const entries = [
            ['post body with\nfoo in it', true],
            ['post body with\nfÓo in it', true],
            ['post body with\nfoo in it', true],
            ['post body with\n(foo) in it', true],
            ['post body with\n[foo] in it', true],
            ['post body with\nfoos in it', false],
            ['post body with\nfÓos in it', false],
            ['post body with\nfoos in it', false],
            ['post body with\n(foos) in it', false],
            ['post body with\n[foos] in it', false],
        ] as const;

        const result = entries.map(([body]) => isNameInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });

    test('source.nameNormalized | source.nameIsCommon', () => {
        const source = createSource({ name: 'foo', nameIsCommon: true });
        const entries = [
            ['Foo: post with bar in it', true],
            ['post body with \n[Foo] in it', true],
            ['post body with \n(Foo) in it', true],
            ['fÓÓ:\n post body with bar in it', true],
            ['post body with \n[fÓÓ] in it', true],
            ['post body with \n(fÓÓ) in it', true],
            ['post body with foo\n in it', false],
            ['post body with fÓÓ in it', false],
            ['foo\n post body with bar in it', false],
        ] as const;

        const result = entries.map(([body]) => isNameInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});
describe('isTwitterInBody', () => {
    test('source.twitterNormalized', () => {
        const source = createSource({ twitter: 'fooTwitter' });
        const entries = [
            ['post body with\n fooTwitter in it', true],
            ['post body with\n @fooTwitter in it', true],
            ['post body with\n @fÓÓTwitter in it', true],
            ['post body with\n !!!fÓÓTwitter!!! in it', true],
            ['post body with\n foosTwitter in it', false],
            ['post body with\n _fooTwitter in it', false],
            ['post body with\n twitter in it', false],
        ] as const;

        const result = entries.map(([body]) => isTwitterInBody({ bodyNormalized: normalizeText(body), source }));
        expect(result).toEqual(entries.map(([_, expected]) => expected));
    });
});