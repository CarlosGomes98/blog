# Technical Blog with Obsidian Integration

A streamlined blog setup that syncs your Obsidian notes to an Astro-powered static site. Write in Obsidian using markdown, tag posts for publishing, and sync them to your blog with a single command.

## Features

- Write blog posts in Obsidian using your existing workflow
- Tag-based publishing (`#blog/published`)
- Automatic conversion of Obsidian syntax to standard markdown
- Image syncing from a single folder
- Fast static site generation with Astro
- Built-in RSS feed and sitemap
- Math notation support (LaTeX)
- Excellent syntax highlighting for code
- Dark mode support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- An Obsidian vault

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Obsidian vault path:**

   Edit `sync-config.json` and set your vault path:
   ```json
   {
     "obsidianVaultPath": "/Users/yourname/Documents/ObsidianVault",
     "publishTag": "blog/published",
     "draftTag": "blog/draft",
     "imageSourceFolder": "Learning/blog-images",
     "blogContentDest": "./src/content/blog",
     "imagesDest": "./public/images/blog"
   }
   ```

3. **Create the image folder in your Obsidian vault:**
   ```bash
   mkdir /path/to/your/vault/blog-images
   ```

## Writing Blog Posts in Obsidian

### Frontmatter Template

Create a note anywhere in your Obsidian vault with the following frontmatter:

```yaml
---
title: "Understanding Transformer Architecture"
date: 2026-01-24
description: "A deep dive into how transformers work in modern ML"
tags:
  - blog/published
  - machine-learning
  - transformers
  - deep-learning
author: "Your Name"
draft: false
---

Your content here...
```

### Required Fields

- `title`: The post title
- `date`: Publication date (YYYY-MM-DD format)
- `tags`: Must include `blog/published` to sync

### Optional Fields

- `description`: SEO description (recommended)
- `author`: Your name
- `draft`: Set to `true` to prevent publishing even with the publish tag
- Additional tags for organization

### Publishing States

- **Unpublished**: No tag or missing `blog/published` tag
- **Draft**: Has `blog/draft` tag (work in progress)
- **Published**: Has `blog/published` tag and `draft: false`

### Adding Images

1. Save all blog images to `vault/blog-images/` (flat structure)
2. Reference them in Obsidian using wiki syntax:
   ```markdown
   ![[my-diagram.png]]
   ![[chart.png|Custom alt text]]
   ```

The sync script will:
- Convert to standard markdown: `![my-diagram](/images/blog/my-diagram.png)`
- Copy images to your blog's public folder
- Warn if referenced images are missing

**Important**: Use unique filenames since all images are in one folder (e.g., `transformer-attention.png` instead of `diagram.png`)

### Internal Links

If you link to other Obsidian notes using `[[wiki links]]`:
- Links to unpublished notes will be converted to plain text
- You'll see warnings during sync: `⚠️  Unpublished link found: [[Internal Note]]`
- This prevents broken links on your published blog

## Syncing Workflow

### Basic Sync

Run the sync command to process your Obsidian notes:

```bash
npm run sync
```

This will:
1. Scan your vault for notes tagged `blog/published`
2. Convert Obsidian syntax to standard markdown
3. Copy processed posts to `src/content/blog/`
4. Sync all images from `blog-images/` to `public/images/blog/`
5. Show a summary with any warnings

### Sync + Preview

Sync and immediately start the dev server:

```bash
npm run sync:dev
```

### Preview Without Syncing

If you just want to preview existing posts:

```bash
npm run dev
```

Open http://localhost:4321 in your browser.

## Local Development

### Available Commands

| Command | Action |
|---------|--------|
| `npm run sync` | Sync Obsidian notes to blog |
| `npm run sync:dev` | Sync and start dev server |
| `npm run dev` | Start dev server (localhost:4321) |
| `npm run build` | Build production site |
| `npm run preview` | Preview production build locally |

### Development Workflow

1. Write/edit posts in Obsidian
2. Tag with `blog/published` when ready
3. Run `npm run sync:dev`
4. Preview at http://localhost:4321
5. Make adjustments in Obsidian
6. Re-sync and refresh browser

Hot reload works for template changes, but you need to re-sync for Obsidian content changes.

## Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

3. **For automatic deploys:**
   - Push this repo to GitHub
   - Connect to Vercel
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Every git push will auto-deploy

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **For automatic deploys:**
   - Push repo to GitHub
   - Connect to Netlify
   - Build command: `npm run build`
   - Publish directory: `dist`

### Option 3: GitHub Pages

1. **Add to `package.json`:**
   ```json
   "scripts": {
     "deploy": "npm run build && npx gh-pages -d dist"
   }
   ```

2. **Deploy:**
   ```bash
   npm run deploy
   ```

**Note**: Remember to sync your Obsidian notes before deploying:
```bash
npm run sync && npm run build
```

## Customization

### Site Metadata

Edit `src/consts.ts` to customize:
- Site title
- Description
- Author name
- Social links

### Styling

The blog uses minimal CSS. Customize styles in:
- `src/styles/global.css` - Global styles
- Individual component files

### Adding Math Support

For LaTeX equations in your posts, install the remark-math plugin:

```bash
npm install remark-math rehype-katex
```

Then update `astro.config.mjs`:

```javascript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
```

Use math in your Obsidian notes:
```markdown
Inline: $E = mc^2$

Block:
$$
\frac{\partial L}{\partial w} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial w}
$$
```

### Adding Interactive Components

For interactive visualizations (ML demos, charts, etc.):

1. **Create an MDX file instead of MD:**
   ```mdx
   ---
   title: "Interactive Neural Network Demo"
   date: 2026-01-24
   ---

   import NeuralNetViz from '../../components/NeuralNetViz.jsx';

   Here's an interactive neural network:

   <NeuralNetViz layers={[3, 4, 2]} />

   More markdown content...
   ```

2. **Create the component:**
   ```bash
   # Add React (or Vue/Svelte)
   npx astro add react
   ```

3. **Build your component in `src/components/`**

## Troubleshooting

### Sync Issues

**Problem**: "Obsidian vault not found"
- Check the path in `sync-config.json`
- Use absolute path, not relative
- Ensure the directory exists

**Problem**: "Missing title" or "Missing date"
- Every published post needs `title` and `date` in frontmatter
- Check YAML syntax (proper indentation, hyphens for arrays)

**Problem**: Images not showing
- Ensure images are in `vault/blog-images/`
- Check image filenames match exactly (case-sensitive)
- Look for warnings in sync output

### Build Issues

**Problem**: TypeScript errors about frontmatter
- Sync adds required fields automatically
- Check `src/content.config.ts` schema matches your frontmatter
- Run `npm run build` to see specific errors

**Problem**: "Module not found"
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, reinstall

## Project Structure

```
blog/
├── scripts/
│   └── sync-obsidian.js      # Sync script
├── src/
│   ├── components/            # Reusable UI components
│   ├── content/
│   │   └── blog/              # Synced blog posts (auto-generated)
│   ├── layouts/
│   │   └── BlogPost.astro     # Post layout template
│   ├── pages/
│   │   ├── blog/
│   │   │   ├── index.astro    # Blog listing page
│   │   │   └── [...slug].astro # Individual post pages
│   │   └── index.astro        # Homepage
│   └── content.config.ts      # Content schema
├── public/
│   └── images/
│       └── blog/              # Synced images (auto-generated)
├── astro.config.mjs           # Astro configuration
├── sync-config.json           # Obsidian sync settings
└── package.json
```

## Tips & Best Practices

### Organization in Obsidian

- Keep your vault structure flat (you already do this!)
- Use tags extensively for organization
- Create a `blog-images/` folder for all blog images
- Consider a `Blog Ideas` note with potential topics

### Writing Tips

- Write freely in Obsidian without worrying about publishing
- Add `blog/draft` tag while writing
- Change to `blog/published` when ready to go live
- Use descriptive filenames (becomes the URL slug)

### Image Tips

- Use descriptive filenames: `transformer-architecture.png`
- Keep images reasonably sized (optimize for web)
- Use PNG for diagrams, JPG for photos
- Add alt text: `![[image.png|Descriptive alt text]]`

### SEO Tips

- Always add a `description` in frontmatter
- Use descriptive titles
- Add relevant tags
- Include images with good alt text

### Version Control

Add to `.gitignore`:
```
src/content/blog/*
public/images/blog/*
sync-config.json
```

This keeps your Obsidian content private while allowing the blog structure to be versioned.

## Example Post

Here's a complete example post in Obsidian:

```markdown
---
title: "Introduction to Attention Mechanisms"
date: 2026-01-24
description: "Understanding how attention works in neural networks"
tags:
  - blog/published
  - machine-learning
  - attention
  - nlp
author: "Your Name"
---

# Introduction to Attention Mechanisms

Attention mechanisms have revolutionized machine learning...

![[attention-diagram.png|Attention mechanism visualization]]

The key insight is that not all inputs are equally important...

## Mathematical Formulation

The attention score is computed as:

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

## Key Takeaways

- Attention allows models to focus on relevant inputs
- It's the foundation of transformer architectures
- Applications span NLP, vision, and more

For more on transformers, see [[Transformer Architecture]] (internal note).
```

## Support

- Astro docs: https://docs.astro.build
- Obsidian docs: https://help.obsidian.md

## License

This project is open source and available under the MIT License.
