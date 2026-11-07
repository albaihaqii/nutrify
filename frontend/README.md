# Nutrify Frontend

Web dashboard for Nutrify, a real-time nutrient-deficiency monitoring system
for pakcoy grown in an NFT hydroponic setup.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS 4 and shadcn/ui
- TanStack Router (file-based routes), TanStack Query, TanStack Table
- Zustand for client state, Axios for API calls
- Zod and React Hook Form for forms

## Requirements

- Node.js 22 or newer
- pnpm
- The Nutrify backend running locally (see `docs/Setup.md` once available)

## Getting Started

From the `frontend` folder:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The dev server runs at `http://localhost:5173` by default.

## Environment Variables

- `VITE_API_BASE_URL`: base URL of the backend API, for example
  `http://127.0.0.1:5000/api`

## Scripts

- `pnpm dev`: start the development server
- `pnpm build`: type-check and build for production
- `pnpm preview`: preview the production build
- `pnpm lint`: run ESLint
- `pnpm format`: format all files with Prettier
- `pnpm format:check`: check formatting without changing files
- `pnpm knip`: find unused files, exports and dependencies
- `pnpm test`: run tests once in a headless browser

## Conventions

- All user-facing Indonesian text lives in `src/locales/id.ts`.
- Code, file names and documentation are in English.
- Server data goes through TanStack Query; session and UI state use Zustand.
- Timestamps from the API are UTC and are displayed in Asia/Jakarta time.

## Credits

Based on [shadcn-admin](https://github.com/satnaing/shadcn-admin) by
Sat Naing, released under the MIT License. See `LICENSE`.
