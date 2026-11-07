# Blog Listing

Displays searchable, filterable Blog, Video, and Podcast cards from the Blog Index,
using authorable artwork selected by card type.

## Universal Editor — Authoring View

The diagram below shows the authored fields. Card content is generated from the index
or temporary fallback data; card artwork uses the matching authored image field.

![Blog Listing authoring structure](docs/ue-authoring.svg)

## Authoring

| Field | Type | Description |
|---|---|---|
| Heading & Text | Rich Text | Heading and short description shown above the listing. |
| Blog Index | Text | Query Index path used to load card data. |
| Blog Image | Reference | Image displayed on Blog cards. |
| Video Thumbnail | Reference | Thumbnail displayed on Video cards. |
| Podcast Image | Reference | Image displayed on Podcast cards. |

If an image field is empty or its image fails to load, the block uses its local
type-specific artwork. Images are not taken from the indexed detail pages.

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Mobile (< 600px) | One 328px card column, three cards per page, compact pagination. |
| Tablet (600–899px) | Two card columns, six cards per page. |
| Desktop (≥ 900px) | Four 260px card columns, eight cards per page; filter chips appear above the grid. |

Search and filters reset pagination. If the index request fails, eight temporary sample cards use the same renderer and remain searchable and filterable. The live index replaces them automatically when a retry succeeds.

## File Structure

```text
blocks/blog-listing/
├── blog-listing.js
├── blog-listing.css
├── _blog-listing.json
├── README.md
├── MAPPING-README.md
├── blog-listing-blog.png
├── blog-listing-video.png
├── blog-listing-podcast.png
├── blog-listing-savings-mobile.svg
└── docs/
    └── ue-authoring.svg
```