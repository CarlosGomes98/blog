import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional(),
			// Support both 'date' and 'pubDate' for Obsidian compatibility
			date: z.coerce.date().optional(),
			pubDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			// Support tags from Obsidian
			tags: z.array(z.string()).optional(),
			author: z.string().optional(),
			draft: z.boolean().optional().default(false),
		}),
});

export const collections = { blog };
