# portfolio

The source for [brianduffyproduct.com](https://brianduffyproduct.com), Brian Duffy's product portfolio.

## What is here

- `site/` is exactly what gets published. Netlify serves this folder as-is.
  - `site/index.html` is the homepage, `site/about/` the About page and `site/contact/` the Contact page.
  - `site/assets/site.css` holds the styles those three pages share. `site/assets/home/` holds their artwork.
  - `site/assets/Brian_Duffy_Product_Manager_Resume.pdf` is the resume linked from the About page.
  - `site/spherechart/` is SphereChart, an interactive 3D sky that shows how a natal chart maps onto the real sky.
- `src/spherechart/` holds the pieces SphereChart is assembled from.
- `netlify.toml` tells Netlify to publish `site/` with no build step.
- `THIRD-PARTY-NOTICES.md` lists the third-party data and libraries in use.

## Changing SphereChart

Edit the files in `src/spherechart/`, then rebuild the published page from the repository root:

```
node src/spherechart/build.js
```

Commit both the source change and the regenerated `site/spherechart/index.html`.

## Replacing an image, the stylesheet or the resume

Save the new file over the old one, then run this from the repository root so browsers fetch the new version:

```
python3 src/version-assets.py
```

## How changes ship

Changes arrive as pull requests. Netlify builds a preview for each one, and merging to `main` publishes to the live site.
