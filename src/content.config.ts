import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string().default('PrintonFocus編集部'),
    tags: z.array(z.string()).default([]),
    country: z.string().default('Global'),
    image: z.string().optional(),
    photographer: z.string().optional(),
    photographerUrl: z.string().optional(),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    relatedPosts: z.array(z.string()).default([]),
  }),
});

export const collections = { news };
