# Packages

| File | What it is | How to use it |
|---|---|---|
| `aemcoder-components-page-1.0.0.zip` | **AEM content package**: the page `/content/alok-aemcoder-agent/aemcoder-components` with every blog content component, plus 3 media assets in `/content/dam/alok-aemcoder-agent/aemcoder-components` | AEM author → CRX Package Manager → Upload Package → Install |
| `blog-content-components-1.0.0.zip` | **Code** (blocks, styles, fonts, icons). Not an AEM package: Package Manager rejects it with "Missing 'jcr_root'" | Edge Delivery code is deployed from GitHub. Use the `blog-content-component` and `manrope-site-font` branches, or copy the files into another project |

## After installing the content package

1. Assets → `/content/dam/alok-aemcoder-agent/aemcoder-components` → select the 3 assets → Reprocess, then Publish.
2. The page uses 8 images that already exist in `/content/dam/alok-aemcoder-agent/` (the boilerplate images on the home page).
3. Open the page in Universal Editor and preview it.
4. The blocks render only where the component code is deployed: on `main` once the
   `blog-content-component` and `manrope-site-font` branches are merged, or now at
   `https://blog-content-component--alok-aemcoder-agent--aloksing-h.aem.page/aemcoder-components`.
