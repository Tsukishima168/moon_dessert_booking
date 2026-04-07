# 2026-04-07 Menu Runtime Inventory

## Canonical Runtime

- `shop /api/menu`
  - consumer: `shop` frontend
  - source tables: `menu_items`, `menu_variants`
  - optional overlay: `mbti_menu_links` when query includes `mbti`

- `shop /api/menu/categories`
  - consumer: external display sites
  - current consumer: `map/menu`
  - source tables: `menu_categories`, `menu_items`, `menu_variants`

- `shop /api/menu/mbti/[mbtiType]`
  - consumer: `kiwimu /api/mbti-dessert`
  - source tables: `mbti_menu_links`, `menu_items`, `menu_variants`
  - returned CTA remains `https://map.kiwimu.com/menu`

## Runtime Truth

- Active source tables:
  - `menu_categories`
  - `menu_items`
  - `menu_variants`
  - `mbti_menu_links`
  - `menu_item_availability`

- Alignment-only table:
  - `menu_item_aliases`
  - current role: naming bridge / data alignment asset
  - current runtime consumers: none

- Legacy candidates:
  - `mbti_recommendations`
    - current DB rows: `0`
    - runtime consumers: none
  - `menu_items.mbti_type`
    - current DB rows: legacy values remain
    - runtime consumers: none on current menu contracts

## Guardrails

- External user-facing dessert CTA must still land on `map/menu`, not `shop`.
- `shop /api/menu/categories` is the external grouped display contract.
- `shop /api/menu` remains a commerce-oriented flat contract for `shop` itself.
