# Turbo Mode Configuration Guide

Turbo Mode allows Cascade to auto-execute safe commands without asking for permission.

## How to Configure

### 1. Open Windsurf Settings

**macOS:** `Cmd + ,`
**Windows/Linux:** `Ctrl + ,`

### 2. Search for Cascade Commands

In the settings search bar, type:
- `windsurf.cascadeCommandsAllowList`
- `windsurf.cascadeCommandsDenyList`

### 3. Enable Turbo Mode

Search for: `windsurf.turboMode`
Toggle to: **ON**

## Recommended Allow List

Add these commands to auto-execute (safe, read-only operations):

```json
[
  "git status",
  "git diff",
  "git log",
  "git branch",
  "git show",
  "npm test",
  "npm run type-check",
  "npm run lint",
  "supabase db diff",
  "supabase status",
  "netlify status",
  "netlify env:list",
  "ls",
  "cat",
  "pwd",
  "echo"
]
```

### How Allow List Works

- Cascade will **automatically execute** any command starting with these prefixes
- Example: `git status` in allow list → `git status --short` auto-executes
- No user confirmation required
- Speeds up development workflow

## Recommended Deny List

Add these commands to **never** auto-execute (destructive operations):

```json
[
  "rm",
  "rmdir",
  "supabase db reset",
  "supabase db push --force",
  "npm run build --force",
  "git push --force",
  "git push -f",
  "git reset --hard",
  "git clean -fd",
  "npm install --force",
  "npm ci --force",
  "docker system prune",
  "kubectl delete"
]
```

### How Deny List Works

- Cascade will **always ask permission** for these commands
- Even in Turbo Mode
- Prevents accidental data loss
- Safety guardrail for destructive operations

## Configuration Priority

1. **Deny List** takes precedence over Allow List
2. **Deny List** takes precedence over Turbo Mode
3. If not in either list, Cascade uses default safety heuristics

## Example Scenarios

### ✅ Auto-Executes (Allow List)

```bash
# User: "Check git status"
Cascade: git status
# Executes immediately, no confirmation

# User: "What's the current branch?"
Cascade: git branch --show-current
# Executes immediately

# User: "Run type checking"
Cascade: npm run type-check
# Executes immediately
```

### ⚠️ Asks Permission (Deny List)

```bash
# User: "Delete old migration files"
Cascade: rm supabase/migrations/old_*.sql
# ⚠️ Asks: "This command will delete files. Proceed?"

# User: "Reset database"
Cascade: supabase db reset
# ⚠️ Asks: "This will reset your database. Proceed?"
```

### 🤔 Uses Heuristics (Not in Either List)

```bash
# User: "Install dependencies"
Cascade: npm install
# Asks permission (modifies node_modules)

# User: "Create new file"
Cascade: touch newfile.ts
# Asks permission (creates file)
```

## Project-Specific Recommendations

### For NamLend Trust

**Additional Allow List:**
```json
[
  "supabase functions list",
  "supabase db diff",
  "netlify deploy --dry-run",
  "playwright test --list",
  "npx tsc --noEmit"
]
```

**Additional Deny List:**
```json
[
  "supabase db push",
  "supabase functions deploy",
  "netlify deploy --prod",
  "git push origin main",
  "npm publish"
]
```

## Testing Your Configuration

### 1. Test Allow List

Ask Cascade to run a command in your allow list:
```
"Run git status"
```

**Expected:** Executes immediately without asking

### 2. Test Deny List

Ask Cascade to run a command in your deny list:
```
"Delete test files with rm"
```

**Expected:** Asks for confirmation

### 3. Test Heuristics

Ask Cascade to run a command not in either list:
```
"Create a new file called test.txt"
```

**Expected:** Asks for confirmation (file creation)

## Troubleshooting

### Commands Not Auto-Executing

**Check:**
1. Turbo Mode is enabled
2. Command is in allow list
3. Command is not in deny list
4. Restart Windsurf

### Too Many Auto-Executions

**Solution:**
1. Review allow list
2. Remove overly broad patterns
3. Add specific commands to deny list

### Commands Still Asking Permission

**Possible reasons:**
1. Command matches deny list pattern
2. Cascade safety heuristics triggered
3. Command has destructive side effects

## Best Practices

### ✅ DO

- Add read-only commands to allow list
- Add destructive commands to deny list
- Test configuration with safe commands first
- Review logs periodically
- Update lists as workflow evolves

### ❌ DON'T

- Add `rm` to allow list
- Add `git push --force` to allow list
- Disable Turbo Mode safety entirely
- Add overly broad patterns
- Skip testing configuration

## Security Considerations

### Safe for Allow List

- Read operations (`cat`, `ls`, `git show`)
- Status checks (`git status`, `npm test`)
- Dry-run commands (`--dry-run`, `--check`)
- List operations (`git branch`, `supabase functions list`)

### Never Allow List

- Delete operations (`rm`, `git clean`)
- Force operations (`--force`, `-f`)
- Production deployments (`deploy --prod`)
- Database resets (`db reset`, `db push`)
- Irreversible operations

## Advanced Configuration

### Pattern Matching

Allow list supports prefix matching:
```json
["git"]  // Matches: git status, git diff, git log, etc.
```

Be careful with broad patterns:
```json
["git"]  // ⚠️ Also matches: git push --force, git reset --hard
```

Better approach:
```json
[
  "git status",
  "git diff",
  "git log",
  "git branch"
]
```

### Environment-Specific Lists

**Development:**
```json
{
  "allow": ["npm test", "npm run dev"],
  "deny": ["npm publish", "git push origin main"]
}
```

**Production:**
```json
{
  "allow": ["git status", "netlify status"],
  "deny": ["rm", "supabase db reset", "npm install"]
}
```

## Monitoring

### Command Log (Optional)

Enable command logging in `cascade_hooks.json`:
```json
{
  "post_run_command": {
    "command": "echo \"[$(date)] ${command}\" >> .windsurf/command_log.txt",
    "enabled": true
  }
}
```

Review logs:
```bash
tail -f .windsurf/command_log.txt
```

## Team Configuration

### Shared Configuration

Create `.windsurf/turbo-config.json`:
```json
{
  "allowList": [...],
  "denyList": [...],
  "notes": "Team-wide Turbo Mode configuration"
}
```

Commit to repository for team consistency.

### Individual Overrides

Team members can override in personal settings:
- Settings → Windsurf → Cascade Commands
- Add personal preferences
- Overrides team config

## Success Criteria

✅ Safe commands execute automatically
✅ Dangerous commands always ask permission
✅ Development workflow is faster
✅ No accidental destructive operations
✅ Team has consistent configuration

---

**Last Updated:** December 28, 2025
**Review Schedule:** Monthly or when workflow changes
