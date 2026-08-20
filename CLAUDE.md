# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A browser-based Korean-language trivia quiz game, built as plain HTML/CSS/JS with no build step, no package manager, and no dependencies.

## Running / testing

There is no build tool, dev server, or test framework — just open `index.html` directly in a browser (or via `Start-Process index.html` on Windows). Because the scripts are loaded as plain `<script src>` tags (not ES modules), the page works straight from the `file://` protocol without needing a local server.

There are no automated tests. Each stage's spec doc under `pros/` ends with a manual "테스트 체크리스트" (test checklist) — verify against that checklist by playing through the game in a browser after making changes.

## Roadmap docs (`pros/*.pro.md`)

The project is being built in stages, each documented in a numbered spec file. These are the source of truth for scope — check them before adding features:

- `pros/1.pro.md` — Stage 1: core quiz MVP (implemented). Defines the question data shape, the core game-loop functions, and the required screens.
- `pros/2.pro.md` — Stage 2 (not yet implemented): scoring system (`ScoreManager`, time/no-hint/streak bonuses), game modes (full/category/speed), hints, pause, per-question timer, detailed result analytics.
- `pros/3.pro.md` — Stage 3 (not yet implemented): `localStorage` persistence (`LocalDataManager`), leaderboards (daily/weekly/all-time/by-category), stats dashboard, responsive/dark-mode UI, expanded question pool (20+ per category), share-to-clipboard.
- `pros/4.pro.md` — Cross-verification guideline for writing quiz questions. Apply this whenever adding/editing questions: every question must have exactly one correct answer (state the basis explicitly if ambiguous, e.g. "면적 기준"), superlative claims ("가장 큰", "최초의") must state their measurement basis, time-sensitive facts must state the reference date/period, and dubious facts should be cross-checked against mainstream/multiple sources.

When implementing a later stage, keep the earlier stages' checklist behavior intact — each stage builds on the previous screen/state structure rather than replacing it.

## Architecture

Three files, loaded in order by `index.html`, no module system (plain globals so the game works from `file://`):

1. **`js/questions.js`** — defines the global `QUESTIONS` array, the single source of question data. Each entry: `{ id, category, difficulty, question, options[4], correctAnswer (index into options), explanation }`. Currently 40 questions hardcoded, 10 each across 4 categories (한국사/과학/지리/스포츠).
2. **`js/game.js`** — all game logic, wrapped in an IIFE to avoid polluting globals. Holds a single mutable `state` object (`questions`, `currentIndex`, `score`, `correctCount`, `answered`) and an `el` cache of DOM references collected once at load. Core flow functions mirror the spec 1:1: `initGame` → `loadQuestion` → `handleAnswer` → `showFeedback` → `nextQuestion` → `endGame`. Screen switching is done via a `showScreen(id)` helper that toggles an `.active` class on `.screen` sections — there is no router.
3. **`css/style.css`** — single stylesheet, no CSS framework. `.screen`/`.screen.active` drives which of the three screens (start / quiz / result) is visible; `.option-btn.correct` / `.option-btn.incorrect` drive answer feedback coloring.

`index.html` contains all three screens' markup up front (start-screen, quiz-screen, result-screen); `game.js` never creates or removes screen sections, only shows/hides them and rewrites their inner content (question text, options, feedback, results).

## Adding questions

New questions go in `js/questions.js`, following the existing object shape and incrementing `id`. Apply the cross-verification rules from `pros/4.pro.md` (see Roadmap docs above) to every new question before adding it.
