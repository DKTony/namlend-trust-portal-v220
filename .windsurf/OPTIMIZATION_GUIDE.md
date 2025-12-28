# Windsurf Optimization Guide

This guide documents all Windsurf optimizations implemented for the NamLend Trust project.

## ✅ Implemented Optimizations

### 1. AGENTS.md Files (Directory-Scoped Context)

**Location:**
- `/src/AGENTS.md` - Web platform guidance
- `/namlend-mobile/AGENTS.md` - Mobile app guidance
- `/supabase/AGENTS.md` - Database/migrations guidance

**Purpose:** Provide Cascade with automatic context-aware instructions based on file location.

**Usage:** Cascade automatically reads the appropriate AGENTS.md when working in that directory.

**Benefits:**
- Enforces project-specific rules (RLS, financial data handling, design system)
- Reduces repetitive instructions
- Ensures consistency across team members
- Provides regulatory compliance reminders

### 2. Workflows (Slash Commands)

**Location:** `.windsurf/workflows/`

**Available workflows:**
- `/deploy-web` - Deploy web platform to Netlify
- `/new-migration` - Create Supabase database migration
- `/rls-check` - Audit RLS policies for security
- `/e2e-test` - Run E2E tests with Playwright

**Usage:** Type `/workflow-name` in Cascade chat to invoke.

**Benefits:**
- Standardized processes
- Reduced errors
- Faster onboarding
- Consistent deployment procedures

### 3. Cascade Hooks

**Location:** `.windsurf/cascade_hooks.json`

**Configured hooks:**
- `post_write_code` - Auto-format with Prettier
- `pre_run_command` - Block dangerous commands (rm, force flags)
- `post_run_command` - Log commands (disabled by default)
- `pre_mcp_tool_use` - Log MCP usage (disabled by default)

**Benefits:**
- Automatic code formatting
- Safety guardrails
- Audit trail (when enabled)

### 4. Existing Memories & Rules

**Location:** `.windsurf/memories/`

**Active rules:**
- `namlendprojectrules.md` - Project-wide rules
- Enterprise Architecture Assistant Persona
- Financial correctness protocols
- Security priorities

## 🎯 Recommended Next Steps

### Phase 1: Configure Turbo Mode (15 minutes)

1. Open Windsurf Settings (Cmd/Ctrl + ,)
2. Search for "Turbo Mode"
3. Enable Turbo Mode
4. Configure allow list:
   ```
   git status
   git diff
   git log
   npm test
   npm run type-check
   supabase db diff
   netlify status
   ```
5. Configure deny list:
   ```
   rm
   supabase db reset
   supabase db push --force
   npm run build --force
   git push --force
   ```

### Phase 2: Pin Critical Context (10 minutes)

1. Open Cascade panel
2. Click "Advanced" tab
3. Pin these files:
   - `@/docs/context.md`
   - `@namlendprojectrules.md`
   - `@/src/types/settlement.ts`
   - `@/supabase/migrations/` (latest migration)

### Phase 3: Create Codemaps (30-60 minutes)

Create hierarchical maps for:
1. **Settlement System Architecture**
   - Settlement runs state machine
   - IPS/IPP integration flow
   - Reconciliation process

2. **Payment Flow**
   - Payment processing pipeline
   - TigerBeetle ledger integration
   - Settlement detection

3. **RLS Policy Structure**
   - Table-level policies
   - Role-based access patterns
   - Service role usage

**How to create:**
- Use Cascade command: "Create a codemap for [system name]"
- Review and refine the generated map
- Share with team members

### Phase 4: Optimize MCP Configuration (15 minutes)

Review which MCP servers you actually use:

**Currently configured:**
- ✅ github - Used frequently
- ✅ netlify - Used for deployments
- ✅ supabase-mcp-server - Used frequently
- ❓ playwright - Used for E2E tests
- ❓ puppeteer - Overlap with playwright?
- ❓ notion-mcp-server - Used for docs?

**Action:** Disable unused MCP servers to reduce overhead.

### Phase 5: Expand Workflows (1-2 hours)

Create additional workflows:
- `/deploy-mobile` - Expo build & deploy
- `/settlement-run` - Execute settlement process
- `/tigerbeetle-reconcile` - Reconcile TigerBeetle ledger
- `/dark-mode-audit` - Check theme consistency
- `/security-audit` - Comprehensive security check

## 📊 Usage Analytics

Track your Windsurf usage to optimize further:

1. View analytics in Windsurf dashboard
2. Identify most-used features
3. Create workflows for repetitive tasks
4. Pin frequently accessed files

## 🔧 Maintenance Schedule

**Weekly:**
- Review command logs (if enabled)
- Update workflows based on new processes
- Add new AGENTS.md sections as needed

**Monthly:**
- Run `/rls-check` workflow
- Review and update pinned context
- Audit MCP server usage
- Update Codemaps

**Quarterly:**
- Review all workflows for accuracy
- Update AGENTS.md with new patterns
- Optimize Turbo Mode lists
- Team training on new features

## 💡 Best Practices

### Context Management
- **Pin strategically** - Only pin files you reference constantly
- **Use @-mentions** - Explicitly mention files when needed
- **Leverage AGENTS.md** - Let directory context work for you

### Workflow Usage
- **Use // turbo annotation** - For safe auto-run steps
- **Document assumptions** - In workflow files
- **Keep workflows updated** - As processes evolve

### Cascade Interaction
- **Be specific** - "Update RLS policy for loans table" vs "fix security"
- **Use checkpoints** - For complex multi-step tasks
- **Reference docs** - Use @-mentions for context

### Team Collaboration
- **Share Codemaps** - Visual system understanding
- **Document workflows** - Make them discoverable
- **Update AGENTS.md** - As patterns emerge

## 🚀 Advanced Features to Explore

### Knowledge Base (Teams/Enterprise)
- Convert key docs to Google Docs
- Configure team-wide access
- Share context across organization

### Remote Repository Indexing
- If mobile becomes separate repo
- Index for cross-repo context

### Conversation Sharing
- Share complex debugging sessions
- Document architectural decisions
- Onboard new team members

### PR Reviews (Beta)
- Enable automatic PR reviews
- Configure review criteria
- Integrate with GitHub workflow

## 📈 Success Metrics

Track these to measure optimization impact:

- **Time to deployment** - Should decrease with workflows
- **RLS policy errors** - Should decrease with audits
- **Code consistency** - Should improve with AGENTS.md
- **Onboarding time** - Should decrease with documentation
- **Security incidents** - Should decrease with guardrails

## 🆘 Troubleshooting

**Cascade not reading AGENTS.md:**
- Verify file is in correct directory
- Check file permissions
- Restart Windsurf

**Hooks not executing:**
- Check `cascade_hooks.json` syntax
- Verify `enabled: true`
- Check command permissions

**Workflows not appearing:**
- Verify `.md` extension
- Check YAML frontmatter format
- Restart Windsurf

**Turbo Mode too aggressive:**
- Review deny list
- Add problematic commands
- Disable temporarily if needed

## 📚 Additional Resources

- [Windsurf Documentation](https://docs.windsurf.com)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Cascade Best Practices](https://docs.windsurf.com/best-practices/use-cases)
- [Workflow Examples](https://docs.windsurf.com/windsurf/cascade/workflows)

## 🎓 Training Recommendations

For team members new to Windsurf:

1. **Week 1:** Basic Cascade usage, @-mentions, workflows
2. **Week 2:** AGENTS.md context, pinned files, checkpoints
3. **Week 3:** Advanced features, Codemaps, hooks
4. **Week 4:** Team collaboration, PR reviews, analytics

---

**Last Updated:** December 28, 2025
**Maintained By:** Development Team
**Review Schedule:** Monthly
