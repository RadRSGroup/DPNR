# Claude Code Hooks

These hooks help maintain code quality and consistency in the DPNR Course Platform.

## Available Hooks

### pre-commit.sh
Runs before committing code:
- Lints TypeScript/JavaScript code
- Checks for TypeScript errors
- Warns about console.log statements
- Prevents committing sensitive information
- Validates Prisma schema changes

### post-edit.sh
Runs after editing files:
- Auto-formats TypeScript/JavaScript with Prettier
- Checks TypeScript types in edited files
- Validates React imports
- Validates Prisma schema
- Detects potentially unused imports

### pre-read.sh
Runs before reading files:
- Warns about large files
- Cautions against reading node_modules
- Suggests source files over built files
- Warns about reading sensitive .env files

### pre-bash.sh
Runs before executing bash commands:
- Prevents destructive commands (rm -rf, drop database)
- Blocks global git config changes
- Warns about force flags
- Checks for proper directory context
- Prevents commands that might expose secrets

### pre-agent-work.sh
Runs before an agent starts work:
- Reads and displays pending tasks from todo.md
- Identifies the next priority task
- Assigns the appropriate specialist agent
- Checks for blockers and dependencies
- Displays technical debt count
- Provides work reminders and guidelines

### enforce-delegation.sh
Enforces proper agent delegation with confirmation:
- Analyzes the current task from todo.md
- Determines the correct specialist agent with confidence scoring
- Validates agent specifications exist
- Checks for blocking dependencies
- Detects multi-agent task requirements
- Provides detailed delegation summary
- Confirms agent assignment before work begins
- Logs all delegations for audit trail
- Prevents wrong agent from working on tasks

### test-quality-review.sh
Enforces test quality standards when tests fail:
- Detects common test anti-patterns (always-passing tests, no assertions, etc.)
- Validates tests actually test functionality, not just pass
- Checks for both positive and negative test cases
- Identifies tests with generic descriptions or console.log
- Detects .only() or .skip() left in tests
- Generates detailed quality report with recommendations
- Invokes Code Quality Reviewer agent for deeper analysis
- Invokes Testing Engineer agent for coverage validation
- Blocks tests with critical quality issues
- Ensures tests fail when implementation is broken

### payment-specialist-check.sh
Ensures proper Tranzila payment integration:
- Detects payment-related tasks automatically
- Verifies Tranzila API documentation exists and is accessible
- Extracts key API endpoints and authentication requirements
- Provides complete integration checklist and guidelines
- Generates environment variable configuration template
- Recommends proper file structure for payment implementation
- Provides TypeScript implementation templates
- Enforces security requirements (HTTPS, PCI compliance)
- Blocks work if Tranzila documentation is missing
- Ensures Hebrew text encoding and Israeli market requirements

## Configuration

These hooks are automatically used by Claude Code when working in this repository. No additional configuration needed.

## Customization

To modify hook behavior, edit the corresponding .sh file. Each hook returns:
- 0 for success (continue)
- 1 for failure (block action)

## Testing Hooks

Test a hook manually:
```bash
./.claude/hooks/pre-commit.sh
```