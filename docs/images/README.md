# Visual Assets for gcpb

This directory contains visual assets for the gcpb project documentation.

## Required Assets

The following visual assets need to be created by a human (see `/workspace/marketing-tasks/` for details):

### Priority 1: Critical Assets

1. **gcpb-demo.gif**
   - Demo GIF for Hero Section
   - Shows 3-step Quick Start
   - Duration: 15-20 seconds
   - See: `marketing-tasks/1-create-demo-gif.md`

2. **quick-start.gif**
   - Tutorial GIF for Quick Start section
   - Shows complete workflow
   - Duration: 30-40 seconds
   - See: `marketing-tasks/2-create-quick-start-gif.md`

3. **dev-container-comparison.png**
   - Comparison infographic
   - Shows git worktree (broken) vs gcpb (working)
   - Dimensions: 1200x800+
   - See: `marketing-tasks/3-create-comparison-image.md`

## Usage in README.md

Once created, uncomment the following lines in README.md:

```markdown
<!-- ![gcpb Demo](docs/images/gcpb-demo.gif) -->
<!-- ![Quick Start Demo](docs/images/quick-start.gif) -->
<!-- ![Dev Container Comparison](docs/images/dev-container-comparison.png) -->
```

## File Naming Convention

- Use lowercase
- Use hyphens for spaces
- Use descriptive names
- Keep file sizes reasonable (< 10MB for GIFs, < 500KB for images)

## Optimization

### For GIFs
```bash
gifsicle -O3 --colors 256 input.gif -o output.gif
```

### For PNGs
```bash
optipng -o7 input.png
```

## License

All visual assets in this directory are part of the gcpb project and are licensed under the MIT License.
