import { Devvit } from '@devvit/public-api';
import { findSourcesInPost, getAllSettings, isIgnoredUser, processPost, submitComment, trySendPostErrorModmail, validateSetting } from './index.js';

Devvit.configure({ redditAPI: true });

Devvit.addSettings([
    {
        type: 'paragraph',
        name: 'sources',
        label: 'List of media reliability sources in JSON format',
        helpText: 'Visit the documentation for more information.',
        scope: 'installation',
        defaultValue: '[]',
        placeholder: 'Paste JSON array here',
        onValidate: ({ value }) => {
            return validateSetting('sources', value);
        }
    },
    {
        type: 'string',
        name: 'flairTemplateId',
        label: 'Flair template ID',
        helpText: 'The flair template ID to apply when assigning the flair.',
        scope: 'installation',
        defaultValue: '',
        placeholder: 'Enter flair template ID here',
        onValidate: ({ value }) => {
            return validateSetting('flairTemplateId', value);
        }
    },
    {
        type: 'string',
        name: 'flairCssClass',
        label: 'Flair CSS class',
        helpText: 'The CSS class to apply when assigning the flair.',
        scope: 'installation',
        defaultValue: '',
        placeholder: 'Enter flair template ID here',
        onValidate: ({ value }) => {
            return validateSetting('flairCssClass', value);
        }
    },
    {
        type: 'paragraph',
        name: 'commentFooter',
        label: 'Comment footer',
        helpText: 'The footer text to append to each media report comment. Markdown is supported.',
        defaultValue: '',
        scope: 'installation',
        onValidate: ({ value }) => {
            return validateSetting('commentFooter', value);
        }
    },
    {
        type: 'paragraph',
        name: 'ignoredUsers',
        label: 'Comma separated list of users to ignore.',
        helpText: 'Posts by these users will not trigger any bot actions.',
        defaultValue: 'AutoModerator',
        onValidate: ({ value }) => {
            return validateSetting('ignoredUsers', value);
        }
    },
    {
        type: 'boolean',
        name: 'analyzeNamesInBody',
        label: 'Analyze post body for source names',
        helpText: 'If enabled, the bot will analyze the post body for source names.',
        defaultValue: true,
        onValidate: ({ value }) => {
            return validateSetting('analyzeNamesInBody', value);
        }
    },
    {
        type: 'boolean',
        name: 'analyzeTwitterInBody',
        label: 'Analyze post body for twitter handles',
        helpText: 'If enabled, the bot will analyze the post body for twitter handles.',
        defaultValue: true,
        onValidate: ({ value }) => {
            return validateSetting('analyzeTwitterInBody', value);
        }
    },
    {
        type: 'boolean',
        name: 'analyzeLinksInBody',
        label: 'Analyze post body for domain names',
        helpText: 'If enabled, the bot will analyze the post body for links.',
        defaultValue: true,
        onValidate: ({ value }) => {
            return validateSetting('analyzeLinksInBody', value);
        }
    },
    {
        type: 'string',
        name: 'errorReportSubredditName',
        label: 'Subrreddit name to send modmail for app error reports',
        helpText: 'The subreddit name to send modmail to in case of an error. Set it to your own subreddit to receive error reports in modmail or leave it blank. You can also set it to "barcadev".',
        defaultValue: '',
        scope: 'installation',
        onValidate: ({ value }) => {
            return validateSetting('errorReportSubredditName', value);
        }
    },
]);

Devvit.addTrigger({
    event: 'PostSubmit',
    onEvent: async (event, context) => {
        try {
            if (!event.post?.id || !event.subreddit?.name || !event.author?.name) {
                throw new Error('PostSubmit event missing post id, subreddit name or author name.');
            }

            const post = event.post.crosspostParentId
                ? await context.reddit.getPostById(event.post.crosspostParentId)
                : await context.reddit.getPostById(event.post.id);

            const postData = processPost(post);
            const settings = await getAllSettings(context);

            if (isIgnoredUser(event.author.name, settings)) {
                return;
            }

            const sources = findSourcesInPost(postData, settings);

            if (!sources) {
                return;
            }

            await submitComment({ postData, sources, settings, context });

        }
        catch (error) {
            console.error(error);

            if (error instanceof Error && event.post?.id) {
                await trySendPostErrorModmail(context, event.post.id, error);
            }
        }
    }
});

// Devvit.addMenuItem({
//     label: 'Debug Post',
//     location: 'post',
//     async onPress(event, context) {
//         const post = await context.reddit.getPostById(event.targetId);
//         const postData = processPost(post);

//         const settings = await getAllSettings(context);

//         const sources = findSourcesInPost(postData, settings);

//         console.log('found the following sources:');
//         console.log(sources);
//     },
// });

export default Devvit;