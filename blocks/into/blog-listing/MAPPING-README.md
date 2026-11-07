# Blog Listing Mapping

## Source Markup

The authored block on `/blogs-page` is `.blog-listing`. Its source table contains a rich-text heading/description row, a Blog Index link row, and three image references. The runtime decorates these into the listing toolbar, filters, cards, and pagination.

## EDS Authoring Rows

| Row | Columns | Model field | Runtime use |
|---|---:|---|---|
| 0 | 1 | Heading & Text (rich text) | Listing heading and supporting text |
| 1 | 1 | Blog Index (text/link) | Query Index source |
| 2 | 1 | Blog Image (reference) | Artwork for every Blog card |
| 3 | 1 | Video Thumbnail (reference) | Artwork for every Video card |
| 4 | 1 | Podcast Image (reference) | Artwork for every Podcast card |

Cards are not authored rows. Blog, Video, and Podcast cards are created from Query Index rows, or from temporary fallback rows when the index is unavailable. Their image source is selected from the matching authored reference, not from the indexed detail page; local type artwork remains the fallback.

## Pages Using This Block

| Page | Usage |
|---|---|
| `/blogs-page` | Discover insurance listing with search, category/type filters, cards, and pagination |

## Reuse and Variants

Reuse this block for index-backed Blog, Video, and Podcast listings. Desktop, applied-filter, tablet, and mobile layouts are responsive states of the same block; do not create separate card blocks.

## CSS-Only Decoration

Card badges, category labels, type icons, pagination states, and responsive layout are runtime/CSS decoration. Blog, Video, and Podcast artwork sources are authored fields; local artwork is the fallback.