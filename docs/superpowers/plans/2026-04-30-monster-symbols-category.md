# Monster Symbols Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `Monster Symbols` category that moves boss, lieutenant, beast, and minion out of `Points on Cards` across score, analytics cards, and insight copy.

**Architecture:** Update the shared stat metadata and shared analytics category model first, then wire the score-screen grouping helper and the score screen render order to the new category. Keep the change test-first with pure helper coverage for layout, category math, and insight copy so the UI surfaces inherit the new grouping from one source of truth.

**Tech Stack:** Expo Router, React Native, TypeScript, Node built-in test runner

---

## File Map

- Modify: `data/statMeta.ts`
  Responsibility: define the shared display section and row labels for monster symbol stats.

- Modify: `lib/score-stat-layout.ts`
  Responsibility: group score-screen rows into a new `monsterSymbols` bucket and preserve the score-screen order.

- Modify: `lib/score-stat-layout.test.js`
  Responsibility: prove the score-screen grouping moves monster symbol rows below `Symbols`.

- Modify: `lib/score-category-breakdown.ts`
  Responsibility: promote `monsterSymbols` into the shared analytics category model, labels, ordering, and stat-key mapping.

- Modify: `lib/score-category-breakdown.test.js`
  Responsibility: prove totals and category mapping now separate monster symbols from `Points on Cards`.

- Modify: `lib/category-insights.ts`
  Responsibility: continue using shared labels/order so the new category appears in profile/player category insight copy.

- Modify: `lib/category-insights.test.js`
  Responsibility: verify insight copy can name `Monster Symbols` as the lead category.

- Modify: `lib/duke-breakdown-insights.test.js`
  Responsibility: verify duke breakdown copy can name `Monster Symbols` through the shared category label model.

- Modify: `components/PlayerCategoryBreakdownCard.tsx`
  Responsibility: render the new shared category with its own icon/color in category breakdown cards.

- Modify: `app/score.tsx`
  Responsibility: render the new score-screen section between `Symbols` and `Counts`.

## Inline Execution Summary

- [ ] Write failing tests for score layout and shared category behavior.
- [ ] Run the focused tests and confirm they fail for the missing `Monster Symbols` category.
- [ ] Implement the minimal shared category changes in metadata, helpers, component visuals, and score-screen render order.
- [ ] Re-run the focused tests and confirm they pass.
