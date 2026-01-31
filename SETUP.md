# Quick Setup Guide

Follow these steps to get your Obsidian → Blog workflow running:

## 1. Configure Your Vault Path

Edit `sync-config.json` and update the vault path:

```json
{
  "obsidianVaultPath": "/Users/yourname/Documents/ObsidianVault"
}
```

Replace with your actual Obsidian vault path.

## 2. Create Image Folder in Obsidian

In your Obsidian vault, create a folder named `blog-images`:

```bash
mkdir /path/to/your/vault/blog-images
```

This is where you'll store all images for blog posts.

## 3. Create Your First Post

In Obsidian, create a new note anywhere in your vault with this frontmatter:

```yaml
---
title: "My First Blog Post"
date: 2026-01-24
description: "Getting started with my technical blog"
tags:
  - blog/published
  - test
author: "Your Name"
---

# My First Blog Post

This is my first post! I'm writing this in Obsidian and it will sync to my blog.

## Testing Images

![[test-image.png]]

## Code Example

```javascript
console.log("Hello from my blog!");
```

Pretty cool, right?
```

## 4. Add a Test Image (Optional)

If you want to test images:
1. Save any image as `test-image.png` in `vault/blog-images/`
2. The sync will automatically copy it to your blog

## 5. Sync Your Content

Run the sync command:

```bash
npm run sync
```

You should see output like:
```
🚀 Starting Obsidian → Blog sync...
📂 Scanning vault: /your/vault/path
   Found X markdown files
✓ Synced: my-first-blog-post
📸 Syncing images...
   Copied 1 images
✨ Sync complete!
```

## 6. Preview Your Blog

Start the development server:

```bash
npm run dev
```

Open http://localhost:4321 in your browser to see your blog!

## 7. Customize Site Info

Edit `src/consts.ts` to update:
- Your name
- Site title
- Site description
- Social links

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Write more posts in Obsidian
- Customize the styling to match your preferences
- Deploy to Vercel, Netlify, or GitHub Pages

## Workflow Summary

1. **Write** in Obsidian (anywhere in your vault)
2. **Tag** with `blog/published` when ready
3. **Sync** with `npm run sync`
4. **Preview** with `npm run dev`
5. **Deploy** with `npm run build` + deployment command

That's it! You're ready to blog.
