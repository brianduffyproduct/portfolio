# portfolio

The source for [brianduffyproduct.com](https://brianduffyproduct.com), Brian Duffy's product portfolio.

## What is here

- `site/` is exactly what gets published. Netlify serves this folder as-is.
  - `site/index.html` is the homepage.
  - `site/spherechart/` is Spherechart, an interactive 3D sky that shows how a natal chart maps onto the real sky.
- `src/spherechart/` holds the pieces Spherechart is assembled from.
- `netlify.toml` tells Netlify to publish `site/` with no build step.
- `THIRD-PARTY-NOTICES.md` lists the third-party data and libraries in use.

## Changing Spherechart

Edit the files in `src/spherechart/`, then rebuild the published page from the repository root:

```
node src/spherechart/build.js
```

Commit both the source change and the regenerated `site/spherechart/index.html`.

## How changes ship

Changes arrive as pull requests. Netlify builds a preview for each one, and merging to `main` publishes to the live site.
