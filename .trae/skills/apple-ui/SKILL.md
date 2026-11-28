---
name: apple-ui
description: Apple-style UI rules and design tokens for this portal (frontend and cms). Use when styling or reviewing colors, typography, spacing, radius, shadows, or motion in this repo, or when the user asks for 苹果风格 or Apple HIG consistency.
---

# Apple UI Guidelines

Apply these rules when writing or reviewing UI in `frontend/` and `cms/`. Prefer the existing semantic tokens in `frontend/src/index.css` over hard-coded colors.

## Color

Use semantic tokens, never raw hex, for theme-aware surfaces and text.

- `app-bg` page background. Light `#FFFFFF`, dark `#000000`.
- `app-header` navigation bar. Apple systemGray5. Light `#E5E5EA`, dark `#2C2C2E`.
- `app-filter` segmented filter strip. Follows systemBackground. Light `#FFFFFF`, dark `#000000`.
- `app-surface` grouped background and hover wells. Light `#F5F5F7`, dark `#161618`.
- `app-card` raised card and active nav pill. Light `#FFFFFF`, dark `#161618`.
- `app-text` primary label. `#1D1D1F` / `#F5F5F7`.
- `app-muted` secondary label. `#6E6E73` / `#98989D`. Use for supporting copy and hover targets.
- `app-subtle` tertiary label. `#8E8E93` / `#AEAEB2`. Use for captions, legal text, timestamps, disabled hints.
- `app-border` hairline. Light `rgba(0,0,0,0.06)`, dark `rgba(255,255,255,0.08)`.
- `app-primary` tint. `#0071E3` in both modes.

Rules:

- Legal, filing (ICP/公安备案), and metadata text uses `text-app-subtle`, `hover:text-app-muted`, and 60–70% icon opacity. Never use `text-white/70` on the light sidebar or a solid black band.
- A bottom legal or filing area must stay visually separate from navigation: use a full-bleed footer with a top `border-app-border` hairline plus a slightly raised `bg-app-card/70` surface. Separation comes from hairline and background step, not from heavy color blocks.
- Selection, focus ring, and controls use `app-primary`. Do not introduce extra hues; the only brand exception is `app-favorite` `#FFD21E`.
- Prefer whitespace and hairlines over boxed sections and heavy dividers. Avoid solid color bands inside the page chrome.
- Dark mode is a true black system background, not gray. Surfaces get slightly lighter, borders get lighter, never darker.

## Typography

- Family: `Plus Jakarta Sans` + `Noto Sans SC`, falling back to `-apple-system`, `PingFang SC`. Keep the existing stack; do not add new font families.
- Primary label 14–17px weight 500–600, secondary 12–13px weight 400–500, captions and legal text 10–11px weight 400.
- Use `tracking-tight` on large titles, normal tracking on body. Keep numeric values `tabular-nums`.
- Truncate single-line labels with `truncate`; do not wrap navigation labels.

## Spacing and radius

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Use Tailwind steps that map to these values.
- Corner radius uses `rounded-app` (`--radius-app: 8px`) for buttons, pills, and cards. Media and avatars may use larger radii; avoid mixing arbitrary radii in one view.
- Minimum touch target is 44 × 44 px; icon-only buttons need at least `h-9 w-9` visual with adequate padding.
- Sidebar width: `w-20` collapsed, `lg:w-60` expanded; keep bottom legal content inside the same horizontal padding as navigation.

## Elevation and borders

- Resting surfaces use a 1px `app-border` hairline. Shadows are whisper-light: `shadow-xs` at rest, reserve deeper elevation for hover, drag, or overlays.
- Do not stack a shadow and a strong border on the same element; pick one.
- Backdrop blur belongs to chrome only (header, sidebar, sticky filter strips), usually `backdrop-blur-xl` with a 90% alpha surface.

## Motion

- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` for transitions, SwiftUI bouncy for press feedback. Use the existing `SWIFTUI_SMOOTH` and `SWIFTUI_BOUNCY` constants.
- Timing bands: 150ms micro-interactions, 250ms standard, 350ms larger layout changes.
- Press feedback uses `whileTap={{ scale: 0.92 }}` for text buttons and `0.84` for round icon buttons.
- Respect reduced motion; do not animate layout-critical elements without a fallback.

## Interaction details

- Hover on muted rows lifts to `text-app-text` with a low-alpha well (`bg-black/[0.04]` light, `bg-white/[0.05]` dark).
- Active navigation uses an elevated `app-card` pill with a hairline border, not a colored fill.
- Focus is always visible: `focus-visible:ring-2 focus-visible:ring-app-primary`.
- Do not animate empty states or loading placeholders into view; render them statically.

## Review checklist

1. Every color comes from an `app-*` token or a documented opacity of one.
2. Legal or tertiary text uses `app-subtle`/`app-muted`, never white-on-light.
3. Radii use `rounded-app`; no arbitrary per-component radius.
4. Touch targets are at least 44px high on mobile.
5. Dark mode verified: no black-on-black, no light-only borders.
6. Motion uses the shared easing constants and timing bands.
