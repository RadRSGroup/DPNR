#!/bin/bash

# Pre-bash hook for DPNR Course Platform
# This hook runs before executing bash commands

COMMAND="$1"

echo "🔍 Pre-execution check for command: $COMMAND"

# 1. Warn about destructive commands
if echo "$COMMAND" | grep -qE "(rm -rf|rm -fr|delete|drop database|DROP DATABASE)"; then
    echo "⚠️  WARNING: Potentially destructive command detected!"
    echo "Please confirm this action is intentional."
    exit 1
fi

# 2. Check for commands that modify git config
if echo "$COMMAND" | grep -qE "git config --global"; then
    echo "❌ Modifying global git config is not allowed"
    exit 1
fi

# 3. Warn about installing global packages
if echo "$COMMAND" | grep -qE "npm install -g|npm i -g|yarn global add"; then
    echo "⚠️  Installing global packages - Consider using npx or local installation instead"
fi

# 4. Check for force flags
if echo "$COMMAND" | grep -qE "(--force|-f )"; then
    echo "⚠️  Force flag detected - Please ensure this is necessary"
fi

# 5. Ensure we're in the right directory for npm commands
if echo "$COMMAND" | grep -qE "^npm "; then
    if [ ! -f "package.json" ] && [ ! -f "dpnr-course-platform/package.json" ]; then
        echo "💡 No package.json found - consider navigating to dpnr-course-platform first"
    fi
fi

# 6. Check for hardcoded ports that might conflict
if echo "$COMMAND" | grep -qE "localhost:(3000|3001|5432)"; then
    echo "💡 Using standard ports - ensure Docker services aren't running if there are conflicts"
fi

# 7. Database migration safety check
if echo "$COMMAND" | grep -qE "prisma migrate deploy|prisma db push"; then
    echo "⚠️  Database migration command - ensure you have a backup"
fi

# 8. Check for commands that might expose secrets
if echo "$COMMAND" | grep -qE "echo.*SECRET|echo.*PASSWORD|echo.*TOKEN|curl.*api_key"; then
    echo "🔐 Command might expose sensitive information - please review"
    exit 1
fi

exit 0