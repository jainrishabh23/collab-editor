# Progress Log

A running record of what got built, when, and what was learned. Updated at the end of each week.

---

## Month 1 — Foundation (Weeks 1–2)

**Status:** Complete ✅
**Outcome:** Deployed, single-user document editor with rich text, auto-save, offline support, slash commands, and a polished dashboard.
**Tech added:** Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, Supabase (Postgres + Auth), Tiptap, Lucide icons, tippy.js, date-fns.

---

### Week 1 — Foundation skeleton

The goal was to get from "empty folder" to "deployed app with auth and document CRUD." Intentionally no editor — just the plumbing every real app needs. By end of week, the project had a public URL, working sign-up/sign-in, and a documents dashboard backed by Postgres.

#### Day 1 — Project skeleton
- Created the Next.js 16 app with `pnpm create next-app`. Picked TypeScript, Tailwind, App Router, `src/` directory.
- Initialized Git, pushed to GitHub at `jainrishabh23/collab-editor`.
- Resolved PowerShell execution policy + GitHub HTTPS auth via Personal Access Token.
- Local dev server running at `localhost:3000` showing the Next.js welcome page.

#### Day 2 — Landing page + design system
- Initialized shadcn/ui with the Radix preset and Zinc base color via the web preset builder.
- Added `Button` and `Card` components.
- Replaced the default Next.js page with a clean landing page: nav, hero ("Write together, in real time."), three feature cards, footer.
- Updated README with project description, tech stack, and progress checklist.
- Resolved a path-alias issue after moving code into `src/` — updated `tsconfig.json` to point `@/*` at `./src/*`.

#### Day 3 — Supabase setup + auth plumbing
- Created Supabase project in Singapore region.
- Installed `@supabase/supabase-js` and `@supabase/ssr`.
- Built three client utilities: browser client, server client (with cookies), and middleware client.
- Added `src/middleware.ts` to refresh sessions on every request.
- Added `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Verified `.env.local` is gitignored.
- Hit and fixed the "Invalid path specified in request URL" error — root cause was `/rest/v1/` mistakenly appended to the Supabase URL.
- Verified connection with a temporary `/test` page (deleted after).

#### Day 4 — Sign-up, sign-in, dashboard placeholder
- Disabled email confirmation in Supabase auth settings (development convenience — to re-enable before public launch).
- Built `/sign-up`, `/sign-in`, `/dashboard` pages using shadcn `Card`, `Input`, `Label`.
- Sign-up uses `supabase.auth.signUp`, sign-in uses `signInWithPassword`. Both redirect to `/dashboard` on success.
- Dashboard is a Server Component — calls `supabase.auth.getUser()` server-side and redirects to `/sign-in` if not authenticated.
- Sign-out implemented as a separate Client Component imported into the server-rendered dashboard. (Pattern to internalize: server pages, client components for interactivity.)
- First successful end-to-end auth: signed up → logged in → saw email on dashboard → signed out.

#### Day 5 — Documents table + CRUD
- Created `documents` table in Supabase with `id`, `owner_id`, `title`, `content` (jsonb), `created_at`, `updated_at`.
- Added Row Level Security policies so users can only read/write their own documents.
- Added a trigger to auto-update `updated_at` on every row update.
- Built `NewDocumentButton` (client component) that inserts and redirects to the new doc.
- Dashboard now lists documents sorted by `updated_at desc`, with relative timestamps (`date-fns`).
- Built `/doc/[id]` placeholder page using Next.js dynamic routing — fetches the doc with `.maybeSingle()` and renders a `notFound()` page on miss.
- Hit and fixed an EPERM file-lock issue on Windows — killed Node, deleted `.next`, restarted; eventually added a Windows Defender exclusion.
- Fixed an accidental folder-named-`01` instead of `[id]` (dynamic route requires square brackets).

#### Day 6 — Deploy to Vercel
- Imported the GitHub repo into Vercel. Auto-detected Next.js, used `pnpm install`.
- Added env vars to Vercel for both Production and Preview environments.
- Updated Supabase URL Configuration to allow the Vercel URL as a Site URL and Redirect URL.
- First successful production deploy. Live URL works end-to-end: sign up, create doc, sign out.
- Verified auto-deploy on push: every `git push` to `main` triggers a new deployment.
- Added the live URL to the README.

#### Day 7 — Week 1 review + rest
- Tested the live URL flow end-to-end one more time.
- Updated README progress checklist.
- Public commitment: posted a Week 1 update sharing the live URL and code repo.
- Wrote a short retro: what surprised me, what took longer than expected.
- Started reading about Tiptap to prepare for Week 2.

---

### Week 2 — Editor + polish

The goal was to take the dashboard from "CRUD app" to "real document editor that auto-saves and feels finished." By end of week, the editor had rich text, debounced auto-save with offline awareness, inline title editing, dashboard rename + delete, and a Notion-style slash command menu.

#### Day 8 — Tiptap rich text editor
- Installed `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-link`.
- Built `Editor` component with StarterKit, Placeholder ("Start writing..."), and Link extensions.
- Built `EditorToolbar` with bold, italic, strike, H1–H3, lists, blockquote, inline code, code block, link, undo/redo.
- Installed `@tailwindcss/typography` and registered the plugin in `globals.css` with `@plugin "@tailwindcss/typography";`.
- Wrapped editor content in `prose` classes for clean default styling.
- Important learning: `immediatelyRender: false` in `useEditor` is required to avoid SSR hydration mismatches in Next.js.
- Markdown-style input rules (e.g., `# `, `- `, `> `, ` ``` `) work for free via StarterKit.

#### Day 9 — Persist editor content with debounced auto-save
- Decided to store content as Tiptap's ProseMirror JSON in the existing `content` JSONB column (round-trips perfectly, plays nicely with Yjs later).
- Built `useDebouncedValue` hook in `src/lib/hooks/use-debounced-value.ts`.
- Updated the editor to call `editor.getJSON()` on every change, debounce 800ms, then save via `supabase.from("documents").update(...)`.
- Added a save status indicator: "Saving…" → "Saved".
- `lastSavedRef` prevents redundant writes when content hasn't changed.
- A `cancelled` flag in the effect prevents stale saves from overwriting newer state.
- `beforeunload` listener warns the user before closing a tab while a save is in flight.
- Verified the JSON shape persists in Supabase — visible as proper ProseMirror JSON in Table Editor.

#### Day 10 — Inline title editing + rename + delete
- Added shadcn `alert-dialog` component for delete confirmation.
- Built `DocumentTitle` component on `/doc/[id]` — click the title in the nav to edit inline, Enter to save, Escape to cancel.
- Empty titles fall back to "Untitled" rather than allowing blank.
- Built `DocumentActions` — a "..." dropdown on each dashboard row with Rename and Delete options.
- Built `RenameDialog` (separate dialog reused by the dropdown for renaming from the dashboard).
- Delete uses `AlertDialog` — confirms before destructive action.
- Solved the "menu inside Link triggers navigation" problem by moving the actions menu *outside* the link via absolute positioning.
- After every mutation, called `router.refresh()` to re-fetch server data so the dashboard updates.

#### Day 11 — Production-grade save layer
- Built `useOnline` hook (`navigator.onLine` + online/offline event listeners).
- Built `RelativeTime` component that re-renders every 15s so "Saved 5s ago" stays current.
- Rewrote save logic into a dedicated `useDocumentSave` hook with explicit state machine: `idle | dirty | saving | saved | error`.
- Added exponential backoff on errors (1s → 2s → 4s → 8s, capped at 30s).
- Skipped saves while offline; flushed automatically on reconnect.
- Used refs for content + dirty tracking to avoid stale closures across timers.
- Updated indicator to show context: "⚠ Offline — changes will sync when you're back" / "Unsaved changes…" / "Saving…" / "Saved 30s ago" / "Save failed (attempt 2) — retrying…".
- Tested by throttling the network to Offline in DevTools — edits buffered, indicator updated, sync resumed automatically.

#### Day 12 — Slash command menu (Notion-style)
- Installed `@tiptap/suggestion`, `@tiptap/core`, `tippy.js`, `lucide-react`.
- Built a Tiptap extension at `src/lib/editor/slash-command-extension.ts` that hooks the suggestion plugin to a tippy-positioned React component.
- Built `SlashCommandList` using `forwardRef` + `useImperativeHandle` so the suggestion plugin can call `onKeyDown` on the React component imperatively.
- Defined 8 commands at `src/lib/editor/slash-commands.tsx`: H1, H2, H3, Bullet list, Numbered list, Quote, Code block, Divider.
- Each command: title, description, search terms (so "ul" matches "Bullet list"), Lucide icon, and an `editor.chain()` action.
- Filter logic supports partial matches across title and search terms.
- Arrow keys navigate, Enter inserts, Escape closes, mouse hover highlights, click inserts.
- Added Cmd/Ctrl+K keyboard shortcut for inserting/editing links via `editorProps.handleKeyDown`.
- Imported `tippy.js/dist/tippy.css` in `globals.css` for positioning to work.

#### Day 13 — Buffer + consolidation
- Used the live app for 10+ minutes as a real user. Logged annoyances; fixed the top 2 (rest deferred to v2).
- Updated README with the full Week 2 checklist and added screenshots (`docs/screenshots/`).
- Added MIT LICENSE.
- Posted a Week 2 update publicly to lock in commitment for Week 3.
- Read Yjs intro docs, the "What is a CRDT?" article, and Tiptap collaboration docs.
- Wrote a short Week 2 retro.

#### Day 14 — Rest

---

## Lessons banked from Month 1

A few that are worth carrying forward:

1. **Server Components for data, Client Components for interactivity** is the App Router pattern. Keep auth checks and data fetching server-side; isolate state and event handlers into small `"use client"` components. The dashboard / sign-out-button split was the first place this clicked.

2. **Path aliases (`@/...`) need to match your folder layout.** When I moved code into `src/`, the alias kept pointing at the root and broke imports. Fix is in `tsconfig.json` `paths`.

3. **Env files load at server start, not on save.** Every `.env.local` change requires `Ctrl+C` + `pnpm dev`. Spent more time on this than I'd like to admit.

4. **Supabase URLs should never have a path.** `NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co` — never `.../rest/v1/`. The library appends paths internally.

5. **Row Level Security is the right default.** Postgres enforces "user A can't read user B's docs" at the database level, no matter what the app code does. Cheap insurance against bugs and a strong story in interviews.

6. **Refs > state for "current value, read on demand"** patterns — like content that updates on every keystroke but is only *read* during saves. Putting it in `useState` would re-render the world on every character.

7. **Discriminated union state machines are great for save indicators.** `{ kind: "saving" } | { kind: "saved", at: Date } | { kind: "error", message: string, attempt: number }` — TypeScript forces every UI branch to be handled, and adding a state later tells you everywhere to update.

8. **Windows Defender + Next.js `.next/` folder = pain.** Add an exclusion for the project folder. Saves about 10 minutes a week of EPERM debugging.

9. **`immediatelyRender: false` in Tiptap's `useEditor`** — required for Next.js SSR. Burned ~20 minutes finding this in the docs.

10. **Public commitment matters more than any technical decision.** Posting Week 1 progress is what made me show up for Week 2.

---

## What's next: Month 2 — Collaboration

The single-user product is done. Month 2 is what makes this project actually impressive on a resume: real-time multi-user editing.

Plan:
- **Week 3** — Yjs integration. Two browser tabs syncing the same document via a local WebSocket server.
- **Week 4** — Custom Node.js WebSocket server deployed to Fly.io. Live cursors and user presence (avatars + assigned colors).
- **Week 5** — Persistence of Yjs state to Postgres. Reconnection handling. Document load from CRDT instead of JSON.
- **Week 6** — Permissions and sharing links. Multi-user testing with friends.

The hardest part of the entire project starts next week. The plan is to go slow, expect debugging, and not be surprised when day-one of Yjs feels like fighting alien math.
