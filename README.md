# Packages

| File | What it is | How to use it |
|---|---|---|
| `aemcoder-components-page-1.0.0.zip` | **AEM content package**: the page `/content/alok-aemcoder-agent/aemcoder-components` with every blog content component, plus 3 media assets in `/content/dam/alok-aemcoder-agent/aemcoder-components` | AEM author → CRX Package Manager → Upload Package → Install |
| `promo-and-testimonials-page-1.1.0.zip` | **AEM content package (latest)**: the page `/content/alok-aemcoder-agent/promo-and-testimonials` with the Promo Stack and Video Testimonials components, plus 1 video in `/content/dam/alok-aemcoder-agent/promo-and-testimonials`. Same page content as 1.0.0; use it with the `promo-and-testimonials-v2` code | AEM author → CRX Package Manager → Upload Package → Install |
| `promo-and-testimonials-page-1.0.0.zip` | Previous version of the package above | Kept for reference |
| `blog-content-components-1.0.0.zip` | **Code** (blocks, styles, fonts, icons). Not an AEM package: Package Manager rejects it with "Missing 'jcr_root'" | Edge Delivery code is deployed from GitHub. Use the `blog-content-component` and `manrope-site-font` branches, or copy the files into another project |

## After installing a content package

1. Assets → open the package's DAM folder (`aemcoder-components` or `promo-and-testimonials` under
   `/content/dam/alok-aemcoder-agent/`) → select its assets → Reprocess, then Publish.
2. The pages also use images that already exist in `/content/dam/alok-aemcoder-agent/`
   (the boilerplate images on the home page).
3. Open the page in Universal Editor and preview it.
4. The blocks render only where their code is deployed: on `main` once the feature branches are merged,
   or now at the branch preview after the page is previewed:
   - `https://main--alok-aemcoder-agent--aloksing-h.aem.page/aemcoder-components`
   - `https://promo-and-testimonials-v2--alok-aemcoder-agent--aloksing-h.aem.page/promo-and-testimonials`
