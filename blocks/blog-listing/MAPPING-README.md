# Blog Listing Mapping

## Source Markup

The authored block on `/blogs-page` is `.blog-listing`. Its source table contains a rich-text heading/description row and a Blog Index link row. The runtime decorates these into the listing toolbar, filters, cards, and pagination.

## EDS Authoring Rows

| Row | Columns | Model field | Runtime use |
|---|---:|---|---|
| 0 | 1 | Heading & Text (rich text) | Listing heading and supporting text |
| 1 | 1 | Blog Index (text/link) | Query Index source |

Cards are not authored rows. Blog, Video, and Podcast cards are created from Query Index rows, or from temporary fallback rows when the index is unavailable.

## Pages Using This Block

| Page | Usage |
|---|---|
| `/blogs-page` | Discover insurance listing with search, category/type filters, cards, and pagination |

## Reuse and Variants

Reuse this block for index-backed Blog, Video, and Podcast listings. Desktop, applied-filter, tablet, and mobile layouts are responsive states of the same block; do not create separate card blocks.

## CSS-Only Decoration

Card badges, category labels, type icons, card artwork, pagination states, and responsive layout are runtime/CSS decoration, not authored fields.