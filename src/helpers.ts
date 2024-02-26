import type { Context, TriggerContext } from '@devvit/public-api';
import linkifyit from 'linkify-it';
import { fromZodError } from 'zod-validation-error';
import { settingsSchema } from './schema.js';
import type { AppSettings, RedditPostV1 } from './types.js';

const linkify = linkifyit();

/**
 * Remove diacritics and convert to lowercase
 * 
 * @note There is a slight performance penalty when using modern unicode
 * property escapes so prefer using the old method with character class
 * range for now.
 * 
 * @see https://stackoverflow.com/a/37511463/3258251
 */
export function normalizeText(text: string) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function capitalizeString(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Devvit onValidate is a bit weird, if you return string it assumes an error,
 * if you return undefined it assumes success, so here we return accordingly.
 */
export function validateSetting(key: keyof AppSettings, value: unknown) {
    const parsed = settingsSchema.shape[key].safeParse(value);

    return parsed.success
        ? undefined
        : `Invalid value for "${key}" setting. Error:\n ${fromZodError(parsed.error)}`;
}

export async function getAllSettings(context: Context | TriggerContext) {
    return settingsSchema.parse(await context.settings.getAll<AppSettings>());
}

export function isIgnoredUser(username: string, settings: AppSettings) {
    return settings.ignoredUsers
        .some(ignoredUser => ignoredUser.toLowerCase() === username.toLowerCase());
}

function nonNullable<T>(value: T): value is NonNullable<T> {
    return value !== null;
}

function getPostLinks(body: string) {
    const links = (linkify.match(body) ?? [])
        .map(link => {
            try {
                const url = new URL(link.url, 'https://www.reddit.com');
                return ['v.redd.it', 'i.redd.it', 'reddit.com', 'www.reddit.com'].includes(url.hostname) ? null : url;
            }
            catch (error) {
                return null;
            }
        })
        .filter(nonNullable);

    return links.length > 0 ? links : null;
}

export function processPost(post: RedditPostV1) {
    const url = new URL(post.url, 'https://www.reddit.com');
    const links = post.body ? getPostLinks(post.body) : null;

    return ({
        id: post.id,
        subredditName: post.subredditName,
        titleNormalized: normalizeText(post.title),
        bodyNormalized: post.body && post.body.length > 0 ? normalizeText(post.body) : null,
        url: !['v.redd.it', 'i.redd.it', 'reddit.com', 'www.reddit.com'].includes(url.hostname) ? url : null,
        links: links,
    });
}

export async function trySendPostErrorModmail(context: TriggerContext, postId: string, error: Error) {
    const { errorReportSubredditName } = await getAllSettings(context);

    if (errorReportSubredditName) {
        await context.reddit.sendPrivateMessage({
            subject: 'An error occurred with the media reliability app',
            text: `An error occurred with this post: https://redd.it/${postId.replace(/^t3_/, '')}\n\n${String(error)}`,
            to: errorReportSubredditName
        });
    }
}
