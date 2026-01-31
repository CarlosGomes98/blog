#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '..', 'sync-config.json');
let config;

try {
  const configFile = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('❌ Error loading sync-config.json:', error.message);
  console.error('Please create sync-config.json with your Obsidian vault path.');
  process.exit(1);
}

// Validate config
if (!config.obsidianVaultPath || config.obsidianVaultPath === '/path/to/your/obsidian/vault') {
  console.error('❌ Please set your Obsidian vault path in sync-config.json');
  process.exit(1);
}

// Check if vault exists
if (!fs.existsSync(config.obsidianVaultPath)) {
  console.error(`❌ Obsidian vault not found at: ${config.obsidianVaultPath}`);
  process.exit(1);
}

// Stats tracking
const stats = {
  processed: 0,
  skipped: 0,
  warnings: [],
  errors: [],
};

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, content };
  }

  const frontmatterText = match[1];
  const bodyContent = content.slice(match[0].length).trim();

  // Parse YAML-like frontmatter
  const frontmatter = {};
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentArray = null;

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed) return;

    // Handle array items
    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        currentArray.push(trimmed.slice(2).trim());
      }
      return;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      currentKey = key;

      if (value === '') {
        // Start of array
        currentArray = [];
        frontmatter[key] = currentArray;
      } else {
        // Simple value
        currentArray = null;
        // Remove quotes if present
        let cleanValue = value.replace(/^["']|["']$/g, '');

        // Convert string booleans to actual booleans
        if (cleanValue === 'true') {
          frontmatter[key] = true;
        } else if (cleanValue === 'false') {
          frontmatter[key] = false;
        } else {
          frontmatter[key] = cleanValue;
        }
      }
    }
  });

  return { frontmatter, content: bodyContent };
}

/**
 * Check if a note should be published
 */
function shouldPublish(frontmatter) {
  if (!frontmatter || !frontmatter.tags) return false;

  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];

  // Check for draft tag
  if (tags.includes(config.draftTag)) {
    return false;
  }

  // Check for publish tag
  return tags.includes(config.publishTag);
}

/**
 * Convert Obsidian wiki links to markdown links for published posts
 */
function convertWikiLinks(content, filename, publishedPostsMap) {
  // Use negative lookbehind to avoid matching image embeds (![[...]])
  const wikiLinkRegex = /(?<!!)\[\[([^\]]+)\]\]/g;
  let warnings = [];

  const converted = content.replace(wikiLinkRegex, (match, linkContent) => {
    // Extract link target (ignore alias if present)
    const [linkTarget] = linkContent.split('|').map(s => s.trim());

    // Check if this links to a published post (case-sensitive)
    const targetSlug = publishedPostsMap.get(linkTarget);

    if (targetSlug) {
      // Convert to markdown link using actual post title
      return `[${linkTarget}](/blog/${targetSlug}/)`;
    } else {
      // Link to unpublished note - warn and remove
      warnings.push(`⚠️  Unpublished link found: [[${linkTarget}]] in ${filename}`);
      return '';
    }
  });

  return { content: converted, warnings };
}

/**
 * Convert Obsidian callouts to standard markdown blockquotes
 */
function convertCallouts(content) {
  // Match callout syntax: >[!type] Title
  // followed by lines starting with >
  const calloutRegex = /^>\[!(\w+)\]\s*(.*?)$/gm;

  return content.replace(calloutRegex, (match, type, title) => {
    // Convert to a blockquote with bold title
    return `> **${title || type.charAt(0).toUpperCase() + type.slice(1)}**\n>`;
  });
}

/**
 * Remove standalone Obsidian tags (e.g., #CUDA on its own line)
 */
function removeObsidianTags(content) {
  // Remove lines that are just tags
  return content.replace(/^#[\w/-]+\s*$/gm, '');
}

/**
 * Convert Obsidian image embeds to markdown image syntax
 */
function convertImageEmbeds(content, filename) {
  const imageEmbedRegex = /!\[\[([^\]]+)\]\]/g;
  let warnings = [];

  const converted = content.replace(imageEmbedRegex, (match, imageName) => {
    // Extract filename and optional alias
    const [imageFile, alias] = imageName.split('|').map(s => s.trim());
    const altText = alias || path.parse(imageFile).name;

    // For Excalidraw files, look for the PNG export
    let actualImageFile = imageFile;
    if (imageFile.endsWith('.excalidraw')) {
      actualImageFile = imageFile + '.png';
    }

    // Sanitize filename (Obsidian removes special chars when exporting)
    // Simply remove ? and other invalid filesystem chars
    const sanitizedImageFile = actualImageFile.replace(/[?:<>*|"]/g, '');

    // Check if image exists in source folder
    const imageSourcePath = path.join(config.obsidianVaultPath, config.imageSourceFolder, sanitizedImageFile);

    if (!fs.existsSync(imageSourcePath)) {
      if (imageFile.endsWith('.excalidraw')) {
        warnings.push(`⚠️  Excalidraw PNG not found: ${sanitizedImageFile} (export ${imageFile} as PNG first) in ${filename}`);
      } else {
        warnings.push(`⚠️  Image not found: ${sanitizedImageFile} referenced in ${filename}`);
      }
    }

    // URL-encode the filename for web compatibility (spaces become %20, etc.)
    const encodedImageFile = encodeURIComponent(sanitizedImageFile).replace(/%2F/g, '/');

    // Convert to markdown image syntax using the encoded PNG filename
    return `![${altText}](/images/blog/${encodedImageFile})`;
  });

  return { content: converted, warnings };
}

/**
 * Process a single markdown file
 */
function processMarkdownFile(filePath, publishedPostsMap = new Map()) {
  const filename = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse frontmatter
  const { frontmatter, content: bodyContent } = parseFrontmatter(content);

  // Check if should be published
  if (!shouldPublish(frontmatter)) {
    return { processed: false };
  }

  // Validate required fields
  if (!frontmatter.title) {
    stats.errors.push(`❌ Missing title in ${filename}`);
    return { processed: false };
  }

  if (!frontmatter.date && !frontmatter.pubDate) {
    stats.errors.push(`❌ Missing date or pubDate in ${filename}`);
    return { processed: false };
  }

  // Remove standalone Obsidian tags
  let processedContent = removeObsidianTags(bodyContent);

  // Convert wiki links (convert to blog links if published, remove if not)
  const { content: contentWithLinks, warnings: linkWarnings } = convertWikiLinks(processedContent, filename, publishedPostsMap);
  stats.warnings.push(...linkWarnings);

  // Convert image embeds
  const { content: contentWithImages, warnings: imageWarnings } = convertImageEmbeds(contentWithLinks, filename);
  stats.warnings.push(...imageWarnings);

  // Convert Obsidian callouts to markdown blockquotes
  const finalContent = convertCallouts(contentWithImages);

  // Normalize frontmatter for Astro
  const normalizedFrontmatter = { ...frontmatter };

  // Use 'date' if 'pubDate' doesn't exist
  if (!normalizedFrontmatter.pubDate && normalizedFrontmatter.date) {
    normalizedFrontmatter.pubDate = normalizedFrontmatter.date;
  }

  // Build final markdown
  const frontmatterYaml = Object.entries(normalizedFrontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
      }
      // Don't quote booleans
      if (typeof value === 'boolean') {
        return `${key}: ${value}`;
      }
      return `${key}: "${value}"`;
    })
    .join('\n');

  const finalMarkdown = `---\n${frontmatterYaml}\n---\n\n${finalContent}`;

  // Generate slug from filename, sanitizing special characters and spaces
  const slug = path.parse(filename).name
    .replace(/[?:<>*|"]/g, '_')
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .toLowerCase();         // Lowercase for consistency

  return {
    processed: true,
    slug,
    content: finalMarkdown,
  };
}

/**
 * Sync images from Obsidian to public folder
 */
function syncImages() {
  const imageSourceDir = path.join(config.obsidianVaultPath, config.imageSourceFolder);
  const imageDestDir = path.resolve(__dirname, '..', config.imagesDest);

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(imageDestDir)) {
    fs.mkdirSync(imageDestDir, { recursive: true });
  }

  // Check if source directory exists
  if (!fs.existsSync(imageSourceDir)) {
    console.log(`📁 Image source folder not found: ${imageSourceDir}`);
    console.log('   Create this folder in your Obsidian vault to store blog images.');
    return 0;
  }

  // Copy all images
  const files = fs.readdirSync(imageSourceDir);
  let copiedCount = 0;

  files.forEach(file => {
    const sourcePath = path.join(imageSourceDir, file);
    const destPath = path.join(imageDestDir, file);

    // Skip directories
    if (fs.statSync(sourcePath).isDirectory()) {
      return;
    }

    // Skip .md files (these are Excalidraw source files, not images)
    if (file.endsWith('.md')) {
      return;
    }

    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    copiedCount++;
  });

  return copiedCount;
}

/**
 * Main sync function
 */
function main() {
  console.log('🚀 Starting Obsidian → Blog sync...\n');

  // Find all markdown files in vault
  console.log(`📂 Scanning vault: ${config.obsidianVaultPath}`);
  const markdownFiles = findMarkdownFiles(config.obsidianVaultPath);
  console.log(`   Found ${markdownFiles.length} markdown files\n`);

  // FIRST PASS: Build map of published posts (title → slug)
  console.log('📝 Building published posts index...');
  const publishedPostsMap = new Map();

  markdownFiles.forEach(filePath => {
    const filename = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);

    // Check if should be published and has required fields
    if (shouldPublish(frontmatter) && frontmatter.title) {
      const slug = path.parse(filename).name
        .replace(/[?:<>*|"]/g, '_')
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .toLowerCase();         // Lowercase for consistency

      // Index by frontmatter title
      publishedPostsMap.set(frontmatter.title, slug);

      // Also index by Obsidian note filename (without extension)
      // This allows [[Note Title]] to work even if frontmatter title is different
      const noteTitle = path.parse(filename).name;
      publishedPostsMap.set(noteTitle, slug);
    }
  });

  // Count unique slugs to get actual post count
  const uniqueSlugs = new Set(publishedPostsMap.values());
  console.log(`   Found ${uniqueSlugs.size} published posts\n`);

  // Process each file
  const blogContentDir = path.resolve(__dirname, '..', config.blogContentDest);

  // Create blog content directory if it doesn't exist
  if (!fs.existsSync(blogContentDir)) {
    fs.mkdirSync(blogContentDir, { recursive: true });
  }

  // Clear existing blog posts (we'll regenerate them)
  const existingPosts = fs.readdirSync(blogContentDir);
  existingPosts.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      fs.unlinkSync(path.join(blogContentDir, file));
    }
  });

  // SECOND PASS: Process files with published posts map
  markdownFiles.forEach(filePath => {
    const result = processMarkdownFile(filePath, publishedPostsMap);

    if (result.processed) {
      const destPath = path.join(blogContentDir, `${result.slug}.md`);
      fs.writeFileSync(destPath, result.content);
      stats.processed++;
      console.log(`✓ Synced: ${result.slug}`);
    } else {
      stats.skipped++;
    }
  });

  // Sync images
  console.log('\n📸 Syncing images...');
  const imageCount = syncImages();
  console.log(`   Copied ${imageCount} images\n`);

  // Print summary
  console.log('═══════════════════════════════════════');
  console.log('📊 Sync Summary');
  console.log('═══════════════════════════════════════');
  console.log(`✓ Processed: ${stats.processed} posts`);
  console.log(`⊘ Skipped: ${stats.skipped} files`);
  console.log(`📸 Images: ${imageCount} copied`);

  if (stats.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${stats.warnings.length}):`);
    stats.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`);
    stats.errors.forEach(error => console.log(`   ${error}`));
  }

  console.log('\n✨ Sync complete!\n');
}

// Run the sync
main();
