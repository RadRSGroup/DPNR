#!/bin/bash

# Pre-agent-work hook for DPNR Course Platform
# This hook runs before an agent starts work to ensure they read their assigned tasks

echo "🤖 Pre-Agent Work Check"
echo "========================"

# Check if we're in the dpnr-course-platform directory
PROJECT_ROOT="/Users/Rad/dpnr_course_site/dpnr-course-platform"
TODO_FILE="$PROJECT_ROOT/tasks/todo.md"

# Check if todo.md exists
if [ ! -f "$TODO_FILE" ]; then
    echo "❌ Error: todo.md not found at $TODO_FILE"
    echo "💡 Agents must have a todo.md file to track tasks"
    exit 1
fi

echo "📋 Reading current tasks from todo.md..."
echo ""

# Extract incomplete tasks (lines starting with "- [ ]")
PENDING_TASKS=$(grep "^- \[ \]" "$TODO_FILE" 2>/dev/null | head -10)

if [ -z "$PENDING_TASKS" ]; then
    echo "✅ No pending tasks found in todo.md"
    echo "💡 All tasks may be completed or the file may need updating"
else
    echo "📌 Pending Tasks (First 10):"
    echo "----------------------------"
    echo "$PENDING_TASKS"
    echo ""
fi

# Check for the next priority task (first incomplete task)
NEXT_TASK=$(grep "^- \[ \]" "$TODO_FILE" 2>/dev/null | head -1)

if [ -n "$NEXT_TASK" ]; then
    echo "🎯 Next Priority Task:"
    echo "$NEXT_TASK"
    echo ""
fi

# Check which agent should handle the task based on patterns
determine_agent() {
    local task="$1"

    # Auth-related tasks
    if echo "$task" | grep -qiE "(auth|cognito|amplify|login|register|session)"; then
        echo "👤 Assigned to: Auth Specialist"
        echo "📄 Agent spec: docs/agents/auth-specialist.md"
        return
    fi

    # Frontend tasks
    if echo "$task" | grep -qiE "(page|component|ui|tailwind|react|landing|hero)"; then
        echo "🎨 Assigned to: Frontend Developer"
        echo "📄 Agent spec: docs/agents/frontend-developer.md"
        return
    fi

    # Backend/API tasks
    if echo "$task" | grep -qiE "(api|database|prisma|endpoint|route|server)"; then
        echo "⚙️ Assigned to: Backend Developer"
        echo "📄 Agent spec: docs/agents/backend-developer.md"
        return
    fi

    # Payment tasks
    if echo "$task" | grep -qiE "(payment|stripe|checkout|cart|shop|order)"; then
        echo "💳 Assigned to: Payment Specialist"
        echo "📄 Agent spec: docs/agents/payment-specialist.md"
        return
    fi

    # 3D tasks
    if echo "$task" | grep -qiE "(3d|three|fiber|canvas|webgl|scene)"; then
        echo "🎮 Assigned to: 3D Specialist"
        echo "📄 Agent spec: docs/agents/3d-specialist.md"
        return
    fi

    # Testing tasks
    if echo "$task" | grep -qiE "(test|spec|jest|cypress|e2e|unit)"; then
        echo "🧪 Assigned to: Testing Engineer"
        echo "📄 Agent spec: docs/agents/testing-engineer.md"
        return
    fi

    # Deployment tasks
    if echo "$task" | grep -qiE "(deploy|terraform|aws|vercel|production|infrastructure)"; then
        echo "🚀 Assigned to: Deployment Engineer"
        echo "📄 Agent spec: docs/agents/deployment-engineer.md"
        return
    fi

    # Default to project coordinator
    echo "📊 Assigned to: Project Coordinator"
    echo "📄 Agent spec: docs/agents/project-coordinator.md"
}

# Determine which agent should handle the next task
if [ -n "$NEXT_TASK" ]; then
    echo "🔍 Agent Assignment:"
    determine_agent "$NEXT_TASK"
    echo ""
fi

# Check for tech debt
TECH_DEBT_FILE="$PROJECT_ROOT/tasks/tech-debt.md"
if [ -f "$TECH_DEBT_FILE" ]; then
    DEBT_COUNT=$(grep "^- \[ \]" "$TECH_DEBT_FILE" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DEBT_COUNT" -gt 0 ]; then
        echo "⚠️ Technical Debt: $DEBT_COUNT items pending in tech-debt.md"
    fi
fi

# Remind about updating todo after completion
echo ""
echo "📝 Important Reminders:"
echo "1. Read the assigned agent specification before starting"
echo "2. Focus ONLY on the current task - no scope creep"
echo "3. Test your implementation before marking complete"
echo "4. Update todo.md after completing each task: - [x]"
echo "5. Follow existing patterns in the codebase"
echo ""

# Check for any blockers or dependencies mentioned in comments
BLOCKERS=$(grep -E "(blocked|pending|waiting|depends|requires)" "$TODO_FILE" 2>/dev/null | grep -i "do not proceed" | head -3)
if [ -n "$BLOCKERS" ]; then
    echo "🚧 Potential Blockers Found:"
    echo "$BLOCKERS"
    echo ""
    echo "⚠️ Some tasks may be blocked. Check dependencies before proceeding."
    echo ""
fi

echo "✅ Pre-agent check complete. Ready to start work!"
echo ""

# Return success to allow work to proceed
exit 0