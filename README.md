# Co. — Real-Time Collaborative Editor

**🚀 Live demo:** [https://collab-editor-silk.vercel.app/]

A fast, conflict-free collaborative document editor. Multiple users can edit the same document in real time, with live cursors and offline support.

**🚧 In active development.** Building in public — progress log below.

## What it does

- Multi-user real-time editing (CRDT-based — no edits lost, ever)
- Live cursors and presence
- Rich text (headings, lists, code blocks, links)
- Works offline, syncs on reconnect
- Auto-saves

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn/ui
- **Editor:** Tiptap (ProseMirror-based)
- **Real-time:** Yjs (CRDT) + WebSockets
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel + Fly.io (WebSocket server)

## Progress

**Month 1 — Foundation**
- [x] Project skeleton + GitHub
- [x] Landing page + shadcn/ui
- [x] Supabase auth setup
- [x] Sign-up / sign-in flow
- [x] Documents dashboard
- [x] Deploy to Vercel
- [ ] Tiptap rich text editor (solo)

**Month 2 — Collaboration**
- [ ] Yjs integration
- [ ] Real-time sync between tabs
- [ ] Live cursors and presence
- [ ] Custom WebSocket server on Fly.io

**Month 3 — Production**
- [ ] Persistence of CRDT state
- [ ] Permissions and sharing links
- [ ] Network resilience (reconnection)
- [ ] Mobile-responsive

**Month 4 — Polish**
- [ ] Slash commands menu
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Performance benchmarks
- [ ] Demo video + blog post

## Why I'm building this

To deeply understand CRDTs, real-time systems, and the engineering behind tools like Notion, Linear, and Figma. Writing about lessons learned along the way.

## Local development

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000.

**🚀 Live demo:** [https://collab-editor-silk.vercel.app/]

You'll need a Supabase project. Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url 
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

Built by [Rishabh Jain](https://github.com/jainrishabh23).


<!-- 
# Co. — Real-Time Collaborative Editor

A fast, conflict-free collaborative document editor. Multiple users can edit the same document in real time, with live cursors and offline support.

**🚧 In active development.** Building in public — see [progress log](#progress) below.

## What it does

- Multi-user real-time editing (CRDT-based — no edits lost, ever)
- Live cursors and presence
- Rich text (headings, lists, code blocks, links)
- Works offline, syncs on reconnect
- Auto-saves

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn/ui
- **Editor:** Tiptap (ProseMirror-based)
- **Real-time:** Yjs (CRDT) + WebSockets
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel + Fly.io (WebSocket server)

## Progress

- [x] Week 1: Project skeleton, deployed scaffolding
- [x] Week 2: Landing page, shadcn/ui setup
- [ ] Week 3: Supabase auth + dashboard
- [ ] Week 4: Tiptap editor (solo mode)
- [ ] Weeks 5–8: Yjs collaboration, presence, cursors
- [ ] Weeks 9–12: Production deploy, permissions, sharing
- [ ] Weeks 13–16: Polish, mobile, performance benchmarks

## Why I'm building this

To deeply understand CRDTs, real-time systems, and the engineering behind tools like Notion, Linear, and Figma. Writing about lessons learned along the way.

## Local development

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000.

---

Built by [Rishabh Jain](https://github.com/jainrishabh23). -->


<!-- This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. -->
