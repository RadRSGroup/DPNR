#!/bin/bash

# Enforce-delegation hook for DPNR Course Platform
# This hook ensures proper agent delegation and requires confirmation

echo "🔐 Agent Delegation Enforcement Hook"
echo "===================================="
echo ""

# Configuration
PROJECT_ROOT="/Users/Rad/dpnr_course_site/dpnr-course-platform"
TODO_FILE="$PROJECT_ROOT/tasks/todo.md"
AGENTS_DIR="$PROJECT_ROOT/docs/agents"
DELEGATION_LOG="/tmp/agent_delegation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to determine the correct agent for a task
determine_agent() {
    local task="$1"
    local agent=""
    local confidence=0

    # Auth-related tasks
    if echo "$task" | grep -qiE "(auth|cognito|amplify|login|register|session|jwt|token)"; then
        agent="auth-specialist"
        confidence=95
    # Frontend tasks
    elif echo "$task" | grep -qiE "(landing|page|component|ui|tailwind|react|hero|button|form|layout)"; then
        agent="frontend-developer"
        confidence=90
    # Backend/API tasks
    elif echo "$task" | grep -qiE "(api|database|prisma|endpoint|route|server|schema|migration)"; then
        agent="backend-developer"
        confidence=90
    # Payment tasks
    elif echo "$task" | grep -qiE "(payment|stripe|checkout|cart|shop|order|purchase|billing)"; then
        agent="payment-specialist"
        confidence=95
    # 3D tasks
    elif echo "$task" | grep -qiE "(3d|three|fiber|canvas|webgl|scene|mesh|geometry)"; then
        agent="3d-specialist"
        confidence=95
    # Testing tasks
    elif echo "$task" | grep -qiE "(test|spec|jest|cypress|e2e|unit|coverage|mock)"; then
        agent="testing-engineer"
        confidence=90
    # Deployment tasks
    elif echo "$task" | grep -qiE "(deploy|terraform|aws|vercel|production|infrastructure|docker)"; then
        agent="deployment-engineer"
        confidence=90
    # Default to project coordinator for general tasks
    else
        agent="project-coordinator"
        confidence=70
    fi

    echo "$agent:$confidence"
}

# Function to check if agent specification exists
check_agent_spec() {
    local agent="$1"
    local spec_file="$AGENTS_DIR/${agent}.md"

    if [ -f "$spec_file" ]; then
        return 0
    else
        return 1
    fi
}

# Function to display agent capabilities
display_agent_capabilities() {
    local agent="$1"

    case "$agent" in
        "auth-specialist")
            echo "  • AWS Cognito configuration"
            echo "  • User authentication flows"
            echo "  • Session management"
            echo "  • GDPR compliance"
            ;;
        "frontend-developer")
            echo "  • Next.js pages and components"
            echo "  • Tailwind CSS styling"
            echo "  • React components"
            echo "  • UI/UX implementation"
            ;;
        "backend-developer")
            echo "  • API route development"
            echo "  • Database operations"
            echo "  • Prisma schema management"
            echo "  • Server-side logic"
            ;;
        "payment-specialist")
            echo "  • Payment gateway integration"
            echo "  • Checkout flows"
            echo "  • Order processing"
            echo "  • E-commerce features"
            ;;
        "3d-specialist")
            echo "  • Three.js implementations"
            echo "  • React Three Fiber"
            echo "  • 3D scene creation"
            echo "  • Performance optimization"
            ;;
        "testing-engineer")
            echo "  • Unit test creation"
            echo "  • E2E test implementation"
            echo "  • Test coverage analysis"
            echo "  • Quality assurance"
            ;;
        "deployment-engineer")
            echo "  • Infrastructure setup"
            echo "  • CI/CD pipelines"
            echo "  • Production deployment"
            echo "  • Environment configuration"
            ;;
        "project-coordinator")
            echo "  • Task orchestration"
            echo "  • Cross-functional coordination"
            echo "  • Documentation"
            echo "  • General project management"
            ;;
    esac
}

# Main delegation logic
echo -e "${BLUE}Step 1: Analyzing Current Task${NC}"
echo "--------------------------------"

# Get the next task from todo.md
if [ ! -f "$TODO_FILE" ]; then
    echo -e "${RED}❌ Error: todo.md not found${NC}"
    echo "Cannot proceed without task list"
    exit 1
fi

NEXT_TASK=$(grep "^- \[ \]" "$TODO_FILE" 2>/dev/null | head -1)

if [ -z "$NEXT_TASK" ]; then
    echo -e "${GREEN}✅ No pending tasks found${NC}"
    echo "All tasks may be completed!"
    exit 0
fi

# Clean up the task text
TASK_TEXT=$(echo "$NEXT_TASK" | sed 's/^- \[ \] //')
echo -e "${PURPLE}📋 Current Task:${NC} $TASK_TEXT"
echo ""

# Determine the appropriate agent
echo -e "${BLUE}Step 2: Agent Assignment${NC}"
echo "------------------------"

AGENT_INFO=$(determine_agent "$TASK_TEXT")
ASSIGNED_AGENT=$(echo "$AGENT_INFO" | cut -d: -f1)
CONFIDENCE=$(echo "$AGENT_INFO" | cut -d: -f2)

# Display agent assignment with confidence
echo -e "${GREEN}✓ Assigned Agent:${NC} ${ASSIGNED_AGENT}"
echo -e "${GREEN}✓ Confidence Level:${NC} ${CONFIDENCE}%"
echo ""

# Check if agent specification exists
if ! check_agent_spec "$ASSIGNED_AGENT"; then
    echo -e "${YELLOW}⚠️  Warning: Agent specification not found${NC}"
    echo "Expected at: $AGENTS_DIR/${ASSIGNED_AGENT}.md"
fi

# Display agent capabilities
echo -e "${BLUE}Agent Capabilities:${NC}"
display_agent_capabilities "$ASSIGNED_AGENT"
echo ""

# Check for delegation conflicts
echo -e "${BLUE}Step 3: Delegation Validation${NC}"
echo "-----------------------------"

# Check if task has blocking dependencies
if echo "$TASK_TEXT" | grep -qi "do not proceed"; then
    echo -e "${RED}⚠️  BLOCKED: Task has unmet dependencies${NC}"
    echo "This task cannot be started until dependencies are resolved."
    echo ""
    echo "Blocking reason: $TASK_TEXT"
    echo ""
    echo -e "${YELLOW}Action Required:${NC} Resolve dependencies before proceeding"
    exit 1
fi

# Check for cross-agent dependencies
REQUIRES_MULTIPLE=false
ADDITIONAL_AGENTS=""

if echo "$TASK_TEXT" | grep -qiE "(auth|login)" && echo "$TASK_TEXT" | grep -qiE "(page|ui)"; then
    REQUIRES_MULTIPLE=true
    ADDITIONAL_AGENTS="May also require: frontend-developer"
elif echo "$TASK_TEXT" | grep -qiE "(api|endpoint)" && echo "$TASK_TEXT" | grep -qiE "(test)"; then
    REQUIRES_MULTIPLE=true
    ADDITIONAL_AGENTS="May also require: testing-engineer"
fi

if [ "$REQUIRES_MULTIPLE" = true ]; then
    echo -e "${YELLOW}⚠️  Multi-Agent Task Detected${NC}"
    echo "$ADDITIONAL_AGENTS"
    echo "Consider breaking this into subtasks for better delegation"
    echo ""
fi

# Delegation confirmation
echo -e "${BLUE}Step 4: Delegation Confirmation${NC}"
echo "-------------------------------"

# Log the delegation
echo "$(date): Task '$TASK_TEXT' -> Agent '$ASSIGNED_AGENT' (Confidence: $CONFIDENCE%)" >> "$DELEGATION_LOG"

# Create delegation confirmation
cat << EOF
${GREEN}📝 DELEGATION SUMMARY${NC}
━━━━━━━━━━━━━━━━━━━━━
Task: $TASK_TEXT
Agent: $ASSIGNED_AGENT
Confidence: $CONFIDENCE%
Spec File: $AGENTS_DIR/${ASSIGNED_AGENT}.md

${YELLOW}⚠️  IMPORTANT INSTRUCTIONS:${NC}
1. The ${ASSIGNED_AGENT} agent MUST handle this task
2. Read the agent specification before proceeding
3. Do NOT exceed the agent's defined scope
4. Follow the patterns in the agent specification
5. Test implementation before marking complete

EOF

# Prompt for confirmation (in a CI/CD environment, this would be automatic)
echo -e "${PURPLE}DELEGATION PROTOCOL:${NC}"
echo "1. I confirm that ${ASSIGNED_AGENT} is the correct agent"
echo "2. I will read the agent specification at: $AGENTS_DIR/${ASSIGNED_AGENT}.md"
echo "3. I will not exceed the defined scope"
echo "4. I will test before marking the task complete"
echo ""

# Check if this is the correct agent context
if [ -n "$CURRENT_AGENT" ]; then
    if [ "$CURRENT_AGENT" != "$ASSIGNED_AGENT" ]; then
        echo -e "${RED}❌ DELEGATION REQUIRED${NC}"
        echo "Current agent: $CURRENT_AGENT"
        echo "Required agent: $ASSIGNED_AGENT"
        echo ""
        echo "This task must be delegated to: $ASSIGNED_AGENT"
        echo "Please switch to the appropriate agent context."
        exit 1
    fi
fi

# Final checks
echo -e "${BLUE}Step 5: Pre-Work Checklist${NC}"
echo "--------------------------"

CHECKLIST_PASSED=true

# Check 1: Agent spec exists
echo -n "✓ Agent specification exists: "
if check_agent_spec "$ASSIGNED_AGENT"; then
    echo -e "${GREEN}YES${NC}"
else
    echo -e "${RED}NO${NC}"
    CHECKLIST_PASSED=false
fi

# Check 2: No blockers
echo -n "✓ No blocking dependencies: "
if ! echo "$TASK_TEXT" | grep -qi "do not proceed"; then
    echo -e "${GREEN}YES${NC}"
else
    echo -e "${RED}NO${NC}"
    CHECKLIST_PASSED=false
fi

# Check 3: Confidence threshold
echo -n "✓ Confidence > 70%: "
if [ "$CONFIDENCE" -ge 70 ]; then
    echo -e "${GREEN}YES (${CONFIDENCE}%)${NC}"
else
    echo -e "${YELLOW}LOW (${CONFIDENCE}%)${NC}"
fi

echo ""

if [ "$CHECKLIST_PASSED" = false ]; then
    echo -e "${RED}❌ Pre-work checklist failed${NC}"
    echo "Please resolve issues before proceeding"
    exit 1
fi

# Success message
echo -e "${GREEN}✅ DELEGATION CONFIRMED${NC}"
echo ""
echo "The ${ASSIGNED_AGENT} agent is now authorized to work on:"
echo "  $TASK_TEXT"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Read: $AGENTS_DIR/${ASSIGNED_AGENT}.md"
echo "2. Implement the task following agent guidelines"
echo "3. Test the implementation"
echo "4. Update todo.md: mark task as [x]"
echo "5. Commit with descriptive message"
echo ""

# Record successful delegation
echo "$(date): CONFIRMED - Agent '$ASSIGNED_AGENT' authorized for task" >> "$DELEGATION_LOG"

exit 0