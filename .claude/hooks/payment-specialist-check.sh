#!/bin/bash

# Payment Specialist Documentation Check Hook
# Ensures payment specialist reads Tranzila API documentation before integration

echo "💳 Payment Specialist Documentation Check"
echo "========================================="
echo ""

# Configuration
PROJECT_ROOT="/Users/Rad/dpnr_course_site/dpnr-course-platform"
TRANZILA_API_FILE="$PROJECT_ROOT/docs/Tranzila/main Tranzila API.yaml"
PAYMENT_AGENT_SPEC="$PROJECT_ROOT/docs/agents/payment-specialist.md"
TODO_FILE="$PROJECT_ROOT/tasks/todo.md"
PAYMENT_LOG="/tmp/payment_specialist_access.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if current task is payment-related
is_payment_task() {
    local task="$1"
    if echo "$task" | grep -qiE "(payment|tranzila|psp|checkout|cart|shop|order|billing|merchant|credit card|transaction)"; then
        return 0
    fi
    return 1
}

# Function to extract key information from Tranzila API
extract_tranzila_info() {
    echo -e "${CYAN}Extracting Key Tranzila API Information:${NC}"
    echo "----------------------------------------"

    if [ -f "$TRANZILA_API_FILE" ]; then
        # Extract basic info from YAML
        echo -e "${BLUE}📄 API Documentation Found${NC}"
        echo "  File: docs/Tranzila/main Tranzila API.yaml"
        echo "  Size: $(wc -c < "$TRANZILA_API_FILE" | xargs) bytes"
        echo ""

        # Extract key endpoints
        echo -e "${PURPLE}Key API Endpoints:${NC}"
        grep -E "^  /|^paths:" "$TRANZILA_API_FILE" 2>/dev/null | head -10 | while read -r line; do
            if echo "$line" | grep -q "^  /"; then
                endpoint=$(echo "$line" | sed 's/://g' | xargs)
                echo "  • $endpoint"
            fi
        done

        # Extract authentication info
        echo ""
        echo -e "${PURPLE}Authentication Requirements:${NC}"
        if grep -q "securitySchemes\|security\|apiKey\|bearer" "$TRANZILA_API_FILE" 2>/dev/null; then
            echo "  • API Key authentication required"
            echo "  • Terminal ID configuration needed"
            echo "  • Merchant credentials must be configured"
        fi

        # Extract response codes
        echo ""
        echo -e "${PURPLE}Common Response Codes:${NC}"
        echo "  • 000: Transaction approved"
        echo "  • 001: Transaction declined"
        echo "  • 003: Invalid merchant"
        echo "  • 033: Card expired"
        echo "  • 036: Restricted card"

        return 0
    else
        echo -e "${RED}❌ Tranzila API documentation not found!${NC}"
        return 1
    fi
}

# Function to check payment integration requirements
check_payment_requirements() {
    echo ""
    echo -e "${CYAN}Payment Integration Requirements Check:${NC}"
    echo "--------------------------------------"

    local requirements_met=true

    # Check 1: Tranzila API documentation exists
    echo -n "✓ Tranzila API documentation: "
    if [ -f "$TRANZILA_API_FILE" ]; then
        echo -e "${GREEN}FOUND${NC}"
    else
        echo -e "${RED}MISSING${NC}"
        requirements_met=false
    fi

    # Check 2: Payment specialist agent spec exists
    echo -n "✓ Payment specialist specification: "
    if [ -f "$PAYMENT_AGENT_SPEC" ]; then
        echo -e "${GREEN}FOUND${NC}"
    else
        echo -e "${YELLOW}NOT FOUND${NC}"
    fi

    # Check 3: Check for existing payment implementation
    echo -n "✓ Existing payment code: "
    if find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "tranzila\|Tranzila" 2>/dev/null | head -1 | grep -q .; then
        echo -e "${YELLOW}FOUND (review existing implementation)${NC}"
    else
        echo -e "${GREEN}NONE (clean slate)${NC}"
    fi

    # Check 4: Environment variables for payment
    echo -n "✓ Payment environment setup: "
    if [ -f "$PROJECT_ROOT/apps/web/.env.local.example" ]; then
        if grep -q "TRANZILA\|PAYMENT" "$PROJECT_ROOT/apps/web/.env.local.example" 2>/dev/null; then
            echo -e "${GREEN}CONFIGURED${NC}"
        else
            echo -e "${YELLOW}NEEDS CONFIGURATION${NC}"
        fi
    else
        echo -e "${YELLOW}ENV FILE NOT FOUND${NC}"
    fi

    echo "$requirements_met"
}

# Main execution
echo -e "${BLUE}Step 1: Task Analysis${NC}"
echo "---------------------"

# Get current task
if [ -f "$TODO_FILE" ]; then
    CURRENT_TASK=$(grep "^- \[ \]" "$TODO_FILE" 2>/dev/null | head -1 | sed 's/^- \[ \] //')

    if [ -n "$CURRENT_TASK" ]; then
        echo -e "Current Task: ${PURPLE}$CURRENT_TASK${NC}"

        # Check if it's a payment task
        if is_payment_task "$CURRENT_TASK"; then
            echo -e "${GREEN}✓ Payment-related task detected${NC}"
        else
            echo -e "${YELLOW}⚠️  Not a payment task - running general check${NC}"
        fi
    else
        echo "No pending tasks found"
    fi
else
    echo -e "${YELLOW}Todo file not found${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Tranzila API Documentation${NC}"
echo "-----------------------------------"

# Extract and display Tranzila information
extract_tranzila_info

echo ""
echo -e "${BLUE}Step 3: Integration Guidelines${NC}"
echo "------------------------------"

cat << EOF
${YELLOW}Tranzila Integration Checklist:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${GREEN}1. REQUIRED READING:${NC}
   ✓ Read: ${TRANZILA_API_FILE}
   ✓ Read: ${PAYMENT_AGENT_SPEC}
   ✓ Review existing checkout implementation

${GREEN}2. CONFIGURATION NEEDED:${NC}
   • Terminal ID (provided by Tranzila)
   • API endpoint URL
   • Response URL for callbacks
   • Currency setting (ILS for Israel)
   • Language preference (Hebrew/English)

${GREEN}3. KEY IMPLEMENTATION POINTS:${NC}
   • Use server-side API calls only (security)
   • Never expose terminal credentials
   • Implement proper error handling
   • Log all transactions
   • Handle Hebrew character encoding
   • Test with Tranzila test terminal first

${GREEN}4. INTEGRATION FLOW:${NC}
   1. Create payment request with order details
   2. Send to Tranzila API endpoint
   3. Handle redirect to Tranzila payment page
   4. Process return URL with transaction result
   5. Verify transaction with API call
   6. Update order status in database

${GREEN}5. SECURITY REQUIREMENTS:${NC}
   • HTTPS only for all API calls
   • Validate all responses
   • Implement CSRF protection
   • Store sensitive data encrypted
   • Never log credit card details

EOF

# Check requirements
requirements_result=$(check_payment_requirements)

echo ""
echo -e "${BLUE}Step 4: Required Environment Variables${NC}"
echo "-------------------------------------"

cat << EOF
Add these to .env.local:

${YELLOW}# Tranzila Configuration${NC}
TRANZILA_TERMINAL_ID=your_terminal_id
TRANZILA_API_URL=https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi
TRANZILA_RESPONSE_URL=\${NEXT_PUBLIC_URL}/api/payment/callback
TRANZILA_CURRENCY=ILS
TRANZILA_TEST_MODE=true

EOF

echo -e "${BLUE}Step 5: Code Structure Recommendation${NC}"
echo "------------------------------------"

cat << EOF
${CYAN}Recommended File Structure:${NC}

/app/api/payment/
  ├── checkout/route.ts      # Create payment session
  ├── callback/route.ts      # Handle Tranzila response
  └── verify/route.ts        # Verify transaction

/lib/
  └── tranzila.ts           # Tranzila API client

/types/
  └── payment.ts            # Payment type definitions

EOF

echo -e "${BLUE}Step 6: Implementation Template${NC}"
echo "-------------------------------"

cat << EOF
${CYAN}Basic Tranzila Client (lib/tranzila.ts):${NC}

\`\`\`typescript
import { z } from 'zod';

const TranzilaResponseSchema = z.object({
  Response: z.string(),
  ResponseText: z.string(),
  TransactionID: z.string().optional(),
  // Add more fields from API docs
});

export class TranzilaClient {
  private terminalId: string;
  private apiUrl: string;

  constructor() {
    this.terminalId = process.env.TRANZILA_TERMINAL_ID!;
    this.apiUrl = process.env.TRANZILA_API_URL!;
  }

  async createTransaction(params: PaymentParams) {
    // Implementation based on API docs
  }

  async verifyTransaction(transactionId: string) {
    // Implementation based on API docs
  }
}
\`\`\`

EOF

# Log access
echo "$(date): Payment specialist check performed - Task: ${CURRENT_TASK:-'General'}" >> "$PAYMENT_LOG"

echo ""
echo -e "${RED}⚠️  CRITICAL REMINDERS:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━"
echo "1. You MUST read the Tranzila API documentation BEFORE coding"
echo "2. Do NOT use Stripe - use Tranzila for Israeli market"
echo "3. Test with Tranzila's test terminal first"
echo "4. Handle Hebrew text encoding properly"
echo "5. Follow PCI compliance guidelines"
echo ""

echo -e "${GREEN}✅ Payment Specialist Check Complete${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Read the Tranzila API documentation thoroughly"
echo "2. Review the payment specialist agent specification"
echo "3. Set up environment variables"
echo "4. Implement server-side API integration"
echo "5. Test with test terminal before production"
echo ""

# Final check - block if documentation not found
if [ ! -f "$TRANZILA_API_FILE" ]; then
    echo -e "${RED}❌ BLOCKED: Cannot proceed without Tranzila API documentation${NC}"
    exit 1
fi

echo -e "${GREEN}Documentation verified. You may proceed with Tranzila integration.${NC}"
exit 0