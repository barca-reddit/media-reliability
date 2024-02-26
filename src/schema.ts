import type { RefinementCtx } from 'zod';
import { z } from 'zod';
import { normalizeText } from './index.js';

function preprocessCommaSeparated(value: unknown, ctx: RefinementCtx) {
    if (typeof value !== 'string') {
        ctx.addIssue({
            code: 'invalid_type',
            expected: 'string',
            received: typeof value,
        });

        return z.NEVER;
    }

    try {
        const usernames = value.split(',').map(item => item.trim());

        // reddit usernames can only contain alphanumeric characters, underscores and hyphens
        if (usernames.some(username => /[^a-zA-Z0-9_-]/.test(username))) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid input. Reddit usernames can only contain alphanumeric characters, underscores and hyphens.',
                fatal: true,
            });

            return z.NEVER;
        }

        return usernames;
    }

    catch (error) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid input. Expected comma-separated string with values.',
            fatal: true,
        });

        return z.NEVER;
    }
}

/**
 * @see https://zod.dev/ERROR_HANDLING
 */
function preprocessJSON(value: unknown, ctx: RefinementCtx) {
    if (typeof value !== 'string') {
        ctx.addIssue({
            code: 'invalid_type',
            expected: 'string',
            received: typeof value,
        });

        return z.NEVER;
    }

    try {
        return JSON.parse(value);
    }

    catch (error) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid JSON input',
            fatal: true,
        });

        return z.NEVER;
    }
}

export const sourceSchema = z.object({
    id: z.string(),
    name: z.string(),
    nameIsCommon: z.boolean(),
    type: z.union([
        z.literal('journalist'),
        z.literal('media'),
        z.literal('aggregator')
    ]),
    tier: z.number().nullable(),
    organization: z.string().nullable(),
    twitter: z.string().nullable(),
    domains: z.array(z.string()).nullable()
}).transform(data => ({
    ...data,
    nameNormalized: normalizeText(data.name),
    twitterNormalized: data.twitter ? normalizeText(data.twitter) : null,
}));

export const settingsSchema = z.object({
    sources: z.preprocess((data, ctx) => preprocessJSON(data, ctx), z.array(sourceSchema)),
    flairTemplateId: z.string(),
    flairCssClass: z.string(),
    commentFooter: z.string(),
    analyzePostBody: z.boolean(),
    ignoredUsers: z.preprocess((data, ctx) => preprocessCommaSeparated(data, ctx), z.array(z.string())),
    errorReportSubredditName: z.string(),
});




