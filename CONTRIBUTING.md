# Contributing to NamLend Trust

Thank you for your interest in contributing to NamLend Trust! This guide will help you get started.

## Prerequisites

- **Node.js** 20+ and **npm** 9+
- **Git** for version control
- A code editor (VS Code recommended with ESLint + Prettier extensions)
- Access to the Supabase project (ask a team lead for credentials)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd namlend-trust-portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with your project credentials.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`.

## Branch Naming

Use the following prefixes:

- `feat/` — New features (e.g., `feat/loan-restructuring`)
- `fix/` — Bug fixes (e.g., `fix/payment-rounding`)
- `chore/` — Maintenance tasks (e.g., `chore/update-deps`)
- `docs/` — Documentation changes (e.g., `docs/api-reference`)
- `refactor/` — Code refactoring (e.g., `refactor/split-banking-section`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add loan restructuring workflow
fix: correct APR calculation for short-term loans
docs: update API reference for disbursement endpoints
chore: upgrade TanStack Query to v5.60
```

Include a scope when helpful: `feat(admin): add batch approval actions`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes, ensuring tests pass
3. Run lint and type checks: `npm run lint && npx tsc --noEmit`
4. Open a PR against `main` with a clear description
5. Fill in the PR template (what changed, why, how to test)
6. Request review from at least one team member
7. Address feedback and merge once approved

## Code Style

- **TypeScript** for all new code — avoid `any` types
- **TailwindCSS** for styling — use semantic theme variables (`bg-background`, `text-foreground`), never hardcoded colors
- **shadcn/ui** for components — check `src/components/ui/` before creating custom components
- **Services** — use existing services in `src/services/` before creating new ones
- **Currency** — always format as `N$ X,XXX.XX` using `formatNAD()` from `@/utils/currency`
- **APR limit** — never exceed 32% (Namibian regulatory requirement)

## Testing

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Run Playwright UI mode
npm run test:e2e:ui

# Run unit tests
npm run test:unit
```

When adding features:

- Add `data-testid` attributes for E2E test selectors
- Add Playwright tests in `e2e/` for new user flows
- Add unit tests in `src/tests/` for business logic

## Key Directories

| Directory              | Purpose                      |
| ---------------------- | ---------------------------- |
| `src/components/`      | Reusable UI components       |
| `src/pages/`           | Route-level page components  |
| `src/services/`        | Business logic and API calls |
| `src/hooks/`           | Custom React hooks           |
| `src/types/`           | TypeScript type definitions  |
| `src/constants/`       | Regulatory and app constants |
| `supabase/migrations/` | Database migrations          |
| `supabase/functions/`  | Edge Functions (Deno)        |
| `e2e/`                 | Playwright E2E tests         |
| `docs/`                | Project documentation        |

## Important Constraints

- **Never delete financial records** — use soft deletes only
- **All tables must have RLS policies** — no exceptions
- **Audit logging is mandatory** for financial operations
- **Data retention: 7 years** for financial records
- **Mobile-first design** — test on 375px viewport

## Questions?

Check `docs/INDEX.md` for the documentation index, or ask in the team channel.
