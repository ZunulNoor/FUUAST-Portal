# Design Tokens

Grounded in the university's actual site header and the existing student
portal (screenshots reviewed directly), not a generic dashboard theme.
Already wired into `tailwind.config.js` — use the Tailwind class names below
rather than raw hex values in components.

| Token                          | Hex       | Tailwind class                             | Source                                |
| ------------------------------ | --------- | ------------------------------------------ | ------------------------------------- |
| Brand (deep olive)             | `#4A5A2C` | `bg-brand` / `text-brand` / `border-brand` | University header                     |
| Brand light (sage)             | `#7A8F52` | `bg-brand-light`                           | Header's lit edge                     |
| Brand dark                     | `#37451F` | `bg-brand-dark`                            | Derived, for hover/pressed states     |
| Ink                            | `#1C1C1C` | `bg-ink` / `text-ink`                      | Header's utility strip                |
| Action (primary buttons/links) | `#1C86C4` | `bg-action`                                | Old portal's sign-in button, deepened |
| Action hover                   | `#166D9F` | `bg-action-hover`                          | Derived                               |
| Surface (page background)      | `#F6F6F4` | `bg-surface`                               | New, warm off-white                   |
| Line (borders/dividers)        | `#D8D8D3` | `border-line`                              | New, tuned against the olive          |

## Attendance status colors

Deliberately separate from the brand palette so a status badge is never
mistaken for a nav/brand element.

| Status  | Hex       | Tailwind class                              |
| ------- | --------- | ------------------------------------------- |
| Present | `#2F9E44` | `bg-status-present` / `text-status-present` |
| Absent  | `#D64545` | `bg-status-absent`                          |
| Late    | `#E08E2B` | `bg-status-late`                            |
| Leave   | `#6B5CA5` | `bg-status-leave`                           |
| Excused | `#2B8A9E` | `bg-status-excused`                         |

Usage pattern seen on the landing page's hero mockup: `bg-status-present/10
text-status-present` — a tinted background at 10% opacity with full-strength
text, not a solid fill, keeps a roster of badges calm instead of loud.

## Type

System font stack (see `tailwind.config.js` comment for why — avoids a
Google Fonts network fetch at build time). One family throughout; hierarchy
comes from size/weight, not a second display face.

## Layout principles used on the landing page (carry these into new screens)

- No tracked-out ALL-CAPS eyebrow labels above headings.
- No arrow (`→`) appended to buttons/links.
- No middle-dot-joined meta strings ("A · B · C") — write it as a sentence
  or a real list instead.
- Role/feature lists use left-border-accent rows or icon badges, not a
  uniform grid of identical rounded-shadow cards.
