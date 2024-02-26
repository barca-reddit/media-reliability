import type { PostCreate } from '@devvit/protos';
import type { Post } from '@devvit/public-api';
import type { z } from 'zod';
import type { processPost } from './index.js';
import type { settingsSchema, sourceSchema } from './schema.js';

export type AppSettings = z.infer<typeof settingsSchema>;
export type Source = z.infer<typeof sourceSchema>;

export type RedditPostV1 = Post;
export type RedditPostV2 = Exclude<PostCreate['post'], undefined>;

export type PostData = ReturnType<typeof processPost>;

export type ValidationResult =
    { success: true } |
    { success: false, message: string };
