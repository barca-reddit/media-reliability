import type { SetPostFlairOptions, TriggerContext } from '@devvit/public-api';
import { capitalizeString } from './helpers.js';
import type { AppSettings, PostData, Source } from './types.js';

/**
 * Don't flair self-posts and posts without a source that has a tier (like aggregators).
 */
function shouldFlairPost(postData: PostData, sources: Source[]) {
    if (postData.url?.hostname && ['reddit.com', 'www.reddit.com'].includes(postData.url.hostname)) {
        return false;
    }

    /**
     * Sources are sorted by tier, so if the first source has no tier,
     * then no source has a tiers.
     */
    if (!sources[0]?.tier) {
        return false;
    }

    return true;
}

type FlairPostProps = {
    postId: string;
    sources: Source[];
    subredditName: Exclude<SetPostFlairOptions['subredditName'], undefined>;
    flairCssClass: Exclude<SetPostFlairOptions['cssClass'], undefined>;
    flairTemplateId: Exclude<SetPostFlairOptions['flairTemplateId'], undefined>;
    context: TriggerContext;
};

export async function flairPost({ postId, sources, subredditName, flairCssClass, flairTemplateId, context }: FlairPostProps) {
    const flairText = sources[0].tier
        ? `Tier ${sources[0].tier}`
        : sources[0].type === 'aggregator'
            ? 'Aggregator'
            : null;

    if (!flairText) {
        return;
    }

    await context.reddit.setPostFlair({
        postId,
        text: flairText,
        cssClass: flairCssClass,
        flairTemplateId: flairTemplateId,
        subredditName: subredditName
    });
}

function reliabilityLevel(tier: Source['tier']) {
    switch (tier) {
        case 1: return 'very reliable';
        case 2: return 'reliable';
        case 3: return '❗ unreliable';
        case 4: return '❗ very unreliable';
        case 5: return '❗ extremely unrialable';
        default: throw new Error(`Invalid tier: ${tier}`);
    }
}

function getSourceLine(source: Source) {
    const { name, twitter, tier, type } = source;
    const domain = source.domains && source.domains.length > 0 ? source.domains[0] : null;

    const sourceName = twitter
        ? `${name} ([@${twitter}](https://twitter.com/${twitter}))`
        : domain
            ? `${name} ([${domain}](https://${domain}))`
            : name;

    if (tier) {
        return `**Tier ${tier}**: ${sourceName} - ${reliabilityLevel(tier)}`;
    }
    else {
        return `**${capitalizeString(type)}**: ${sourceName}`;
    }
}

type SubmitCommentProps = {
    postData: PostData;
    sources: Source[];
    settings: AppSettings;
    context: TriggerContext;
};

export async function submitComment({ postData, sources, settings, context }: SubmitCommentProps) {
    if (shouldFlairPost(postData, sources)) {
        await flairPost({
            postId: postData.id,
            sources: sources,
            subredditName: postData.subredditName,
            flairCssClass: settings.flairCssClass,
            flairTemplateId: settings.flairTemplateId,
            context: context
        });
    }

    const header = `**Media reliability report:**`;
    const warningForUnreliable = sources.some(source => source.tier && source.tier >= 3)
        ? '❗ Readers beware: This post contains information from unreliable and/or untrustworthy source(s). As such, we highly encourage our userbase to question the authenticity of any claims or quotes presented by it before jumping into conclusions or taking things as a fact.'
        : null;
    const footer = settings.commentFooter;

    const markdown = [
        header,
        ...sources.map(source => `- ${getSourceLine(source)}`),
        warningForUnreliable,
        footer
    ]
        .filter(Boolean)
        .join('\n\n');

    const comment = await context.reddit.submitComment({
        id: postData.id,
        text: markdown
    });

    await Promise.all([
        comment.distinguish(true),
        comment.lock()
    ]);
}