# Windsurf AI Setup Guide for NamLend Trust

## Overview

This document describes the optimal Windsurf AI configuration for the NamLend Trust fintech platform.

## Configuration Files

### AGENTS.md Files (Auto-discovered)

AGENTS.md files provide context-aware instructions that automatically apply based on which directory you're working in.

| Location | Purpose |
|----------|---------|
| `/AGENTS.md` | Global project context, regulatory constraints |
| `/src/AGENTS.md` | Frontend React/TypeScript guidelines |
| `/supabase/AGENTS.md` | Database, migrations, RLS patterns |
| `/e2e/AGENTS.md` | Testing patterns and best practices |

### Rules (`.windsurf/rules/`)

Rules provide always-on or conditional guidance for Cascade.

- **namlendprojectrules.md**: Core project rules (always on)

### Workflows (`.windsurf/workflows/`)

Workflows are invoked with `/workflow-name` command.

| Workflow | Command | Purpose |
|----------|---------|---------|
| Deploy Web | `/deploy-web` | Deploy to Netlify |
| E2E Tests | `/e2e-test` | Run Playwright tests |
| New Migration | `/new-migration` | Create DB migration |
| RLS Check | `/rls-check` | Audit RLS policies |
| AI Assistant Identity | `/10x-enterprise-ai-coding-assiistant-coe-identity` | NamLend AI Savant prompt |

### Cascade Hooks (`.windsurf/cascade_hooks.json`)

Hooks automate actions and enforce safety:

- **pre_run_command**: Blocks dangerous commands (DROP, DELETE, rm -rf)
- **pre_write_code**: Alerts on sensitive file modifications
- **post_write_code**: Auto-formats code with Prettier

## Recommended Extensions

Install these extensions for optimal experience (see `recommended-extensions.json`):

### Essential

- **GitLens**: Git blame and history
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Class autocomplete

### Testing

- **Playwright Test**: E2E test runner

### Database

- **Prisma**: SQL syntax highlighting

## Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint

# Testing
npm run test:e2e         # Run E2E tests
npx playwright test --ui # Interactive mode

# Database
npx supabase start       # Local Supabase
npx supabase db push     # Apply migrations
```

## Best Practices

### Using Cascade Effectively

1. **Be specific**: Include file paths, function names, exact requirements
2. **Use @mentions**: Reference files with `@src/services/loanService.ts`
3. **Invoke workflows**: Use `/e2e-test` instead of describing test runs
4. **Course correct early**: Interrupt with Escape if going wrong direction

### Fintech-Specific Guidelines

1. **APR Limit**: Never exceed 32% (regulatory requirement)
2. **Currency**: Always use NAD (Namibian Dollar), format as `N$ X,XXX.XX`
3. **RLS**: Every table must have Row-Level Security policies
4. **Audit**: All financial operations must be logged
5. **No Deletes**: Use soft deletes only for financial records

### Security Reminders

- Never disable RLS on any table
- Use SECURITY DEFINER for RPC functions
- Test all roles (admin, loan_officer, client)
- Never expose service role keys to client

## Troubleshooting

### Cascade Not Following Rules

1. Check if AGENTS.md is in the correct directory
2. Verify rules have correct `trigger: always_on` frontmatter
3. Use `/clear` to reset context if it gets confused

### Hooks Not Running

1. Verify `.windsurf/cascade_hooks.json` syntax is valid JSON
2. Check hook command paths are absolute or available in PATH
3. Ensure `show_output: true` to see hook results

### Extensions Not Working

1. Check Open VSX marketplace compatibility
2. Reload window after installing extensions
3. Verify extension settings in workspace settings
