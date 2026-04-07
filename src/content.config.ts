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
    country: z.array(z.string()).default(['Global']),
    company: z.string().optional(),
    category: z.enum(['platform', 'technology', 'market', 'sustainability', 'japan']).optional(),
    importance: z.number().min(1).max(5).default(3),
    compareTable: z.boolean().default(false),
    image: z.string().optional(),
    photographer: z.string().optional(),
    photographerUrl: z.string().optional(),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    relatedPosts: z.array(z.string()).default([]),
    opinion: z.string().optional(),
  }),
});

export const collections = { news };
