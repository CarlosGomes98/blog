# Obsidian Blog Post Template

Copy and paste this template when creating new blog posts in your Obsidian vault.

## Standard Template

```yaml
---
title: "Your Post Title Here"
date: 2026-01-24
description: "A brief description of your post (for SEO and previews)"
tags:
  - blog/published
  - category-1
  - category-2
author: "Your Name"
draft: false
---

# Main Heading

Your content starts here...

## Section 1

Write your content using standard markdown.

### Subsection

More content...

## Adding Images

![[image-name.png]]
![[diagram.png|Custom alt text for accessibility]]

## Code Blocks

```python
def example():
    print("Hello, world!")
```

## Math Equations

Inline math: $E = mc^2$

Block math:
$$
\frac{\partial L}{\partial w} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial w}
$$

## Lists

- Bullet point 1
- Bullet point 2
- Bullet point 3

1. Numbered item
2. Another item
3. Last item

## Links

[External link](https://example.com)

Internal Obsidian link: [[Other Note]] (will be converted to plain text)

## Conclusion

Your closing thoughts...
```

## Draft Template

Use this while writing (won't be published):

```yaml
---
title: "Work in Progress: Title"
date: 2026-01-24
description: "Draft post about..."
tags:
  - blog/draft
  - topic
author: "Your Name"
---

# Draft Content

...
```

## ML/Technical Post Template

For machine learning posts:

```yaml
---
title: "Deep Dive: [Topic Name]"
date: 2026-01-24
description: "Exploring [specific concept] in [field]"
tags:
  - blog/published
  - machine-learning
  - deep-learning
  - [specific-topic]
author: "Your Name"
---

# [Topic Name]

## Introduction

What problem does this solve? Why is it important?

## Background

Relevant background and context...

## Mathematical Foundation

Key equations and theory:

$$
\text{Your equation here}
$$

## Implementation

```python
# Example code
import numpy as np

def model():
    pass
```

## Visualizations

![[architecture-diagram.png|Model architecture]]

## Results & Analysis

What do the results show?

## Key Takeaways

- Main point 1
- Main point 2
- Main point 3

## Further Reading

- [[Related Internal Note]]
- [External resource](https://example.com)
```

## Frontmatter Field Reference

### Required
- `title`: Post title (string)
- `date`: Publication date (YYYY-MM-DD)
- `tags`: Must include `blog/published` or `blog/draft`

### Optional
- `description`: SEO description (recommended)
- `author`: Your name
- `draft`: Boolean (true/false), overrides tag
- Additional tags for categorization

## Publishing States

| Tags | Draft Field | Result |
|------|-------------|--------|
| `blog/published` | `false` or omitted | **Published** ✓ |
| `blog/published` | `true` | Not published |
| `blog/draft` | any | Not published |
| No tag | any | Not published |

## Tips

1. **Use descriptive filenames** - they become your URL slugs
   - Good: `transformer-attention-mechanism.md`
   - Bad: `post1.md`

2. **Always add descriptions** - helps with SEO and social sharing

3. **Tag consistently** - makes it easier to organize and filter posts

4. **Use unique image names** - all images are in one folder
   - Good: `transformer-architecture-2024.png`
   - Bad: `diagram.png`

5. **Add alt text to images** for accessibility:
   ```markdown
   ![[image.png|Descriptive alt text]]
   ```

6. **Preview before publishing**:
   - Use `blog/draft` tag while writing
   - Change to `blog/published` when ready
   - Run `npm run sync:dev` to preview

## Examples

### Tutorial Post
```yaml
---
title: "Building a Neural Network from Scratch"
date: 2026-01-24
description: "Learn to implement a neural network using only NumPy"
tags:
  - blog/published
  - tutorial
  - neural-networks
  - python
author: "Your Name"
---
```

### Research Summary
```yaml
---
title: "Paper Summary: Attention Is All You Need"
date: 2026-01-24
description: "Key insights from the transformer paper"
tags:
  - blog/published
  - paper-summary
  - transformers
  - research
author: "Your Name"
---
```

### Quick Tip
```yaml
---
title: "Quick Tip: Debugging PyTorch Models"
date: 2026-01-24
description: "Simple debugging techniques for PyTorch"
tags:
  - blog/published
  - tips
  - pytorch
  - debugging
author: "Your Name"
---
```
