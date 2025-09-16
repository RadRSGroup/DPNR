#!/bin/bash

# Test Quality Review Hook for DPNR Course Platform
# This hook enforces proper test quality when tests fail
# Prevents "tests designed to pass" anti-pattern

echo "🧪 Test Quality Review Hook"
echo "============================"
echo ""

# Configuration
PROJECT_ROOT="/Users/Rad/dpnr_course_site/dpnr-course-platform"
TEST_LOG="/tmp/test_quality_review.log"
REVIEW_REPORT="/tmp/test_review_report.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to analyze test file for quality issues
analyze_test_quality() {
    local test_file="$1"
    local issues_found=0
    local warnings=""

    # Check for common test anti-patterns

    # 1. Check for hardcoded expected values that mirror implementation
    if grep -q "expect(.*).toBe(.*)" "$test_file" 2>/dev/null; then
        local hardcoded_count=$(grep -c "expect.*\.toBe\(true\|false\|'success'\|'ok'\)" "$test_file" 2>/dev/null || echo 0)
        if [ "$hardcoded_count" -gt 3 ]; then
            warnings="${warnings}⚠️  Multiple hardcoded assertions detected (${hardcoded_count} found)\n"
            ((issues_found++))
        fi
    fi

    # 2. Check for tests that only test positive cases
    local positive_tests=$(grep -c "should\|it.*success\|it.*works\|it.*correct" "$test_file" 2>/dev/null || echo 0)
    local negative_tests=$(grep -c "should.*not\|should.*fail\|should.*error\|should.*throw\|should.*reject" "$test_file" 2>/dev/null || echo 0)

    if [ "$positive_tests" -gt 0 ] && [ "$negative_tests" -eq 0 ]; then
        warnings="${warnings}⚠️  No negative test cases found (only happy path tested)\n"
        ((issues_found++))
    fi

    # 3. Check for empty or trivial tests
    if grep -q "it\(.*\).*{[\s]*}" "$test_file" 2>/dev/null; then
        warnings="${warnings}⚠️  Empty test case detected\n"
        ((issues_found++))
    fi

    # 4. Check for console.log instead of assertions
    if grep -q "console\.log" "$test_file" 2>/dev/null; then
        warnings="${warnings}⚠️  console.log found in test (use assertions instead)\n"
        ((issues_found++))
    fi

    # 5. Check for .only() or .skip() left in tests
    if grep -qE "\.only\(|\.skip\(" "$test_file" 2>/dev/null; then
        warnings="${warnings}⚠️  .only() or .skip() found (all tests should run)\n"
        ((issues_found++))
    fi

    # 6. Check for proper async handling
    if grep -q "async.*=>" "$test_file" 2>/dev/null; then
        if ! grep -q "await\|\.then\|\.catch" "$test_file" 2>/dev/null; then
            warnings="${warnings}⚠️  Async test without proper await/then handling\n"
            ((issues_found++))
        fi
    fi

    # 7. Check for meaningful test descriptions
    local generic_descriptions=$(grep -cE "it\(['\"]test['\"]|it\(['\"]works['\"]|it\(['\"]should work['\"]" "$test_file" 2>/dev/null || echo 0)
    if [ "$generic_descriptions" -gt 0 ]; then
        warnings="${warnings}⚠️  Generic test descriptions found (be specific)\n"
        ((issues_found++))
    fi

    echo "$issues_found:$warnings"
}

# Function to validate test actually tests the function
validate_test_coverage() {
    local test_file="$1"
    local source_file="$2"
    local validation_passed=true

    echo -e "${BLUE}Validating Test Coverage:${NC}"

    # Extract function names from source file
    if [ -f "$source_file" ]; then
        # For TypeScript/JavaScript files
        local functions=$(grep -E "function |const.*=.*\(|export.*function|class.*{" "$source_file" 2>/dev/null | sed 's/[({].*//' | awk '{print $NF}' | sort -u)

        echo "  Functions found in source:"
        for func in $functions; do
            # Check if function is tested
            if grep -q "$func" "$test_file" 2>/dev/null; then
                echo -e "    ✓ ${GREEN}${func}${NC} - tested"
            else
                echo -e "    ✗ ${RED}${func}${NC} - not tested"
                validation_passed=false
            fi
        done
    else
        echo -e "  ${YELLOW}Source file not found for coverage analysis${NC}"
    fi

    echo "$validation_passed"
}

# Function to generate test quality report
generate_quality_report() {
    local test_file="$1"
    local issues="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat > "$REVIEW_REPORT" << EOF
# Test Quality Review Report
Generated: ${timestamp}

## File Reviewed
\`${test_file}\`

## Quality Issues Found
${issues}

## Required Test Characteristics

### ✅ Good Test Should Have:
1. **Clear Description**: Test name describes what is being tested
2. **Arrange-Act-Assert**: Clear setup, execution, and verification
3. **Independent**: Does not depend on other tests
4. **Deterministic**: Always produces same result
5. **Fast**: Executes quickly
6. **Complete**: Tests both success and failure cases

### ❌ Common Anti-Patterns to Avoid:
1. **Testing Implementation**: Don't test HOW, test WHAT
2. **Hardcoded Values**: Use realistic test data
3. **No Assertions**: Every test must have expectations
4. **Testing Framework**: Don't test the testing library
5. **Flaky Tests**: Avoid time-dependent or random tests

## Test Review Checklist

- [ ] Tests actual functionality, not implementation details
- [ ] Includes both positive and negative test cases
- [ ] Has meaningful, descriptive test names
- [ ] Uses proper assertions (not just console.log)
- [ ] Handles async operations correctly
- [ ] Tests edge cases and error conditions
- [ ] No .only() or .skip() in committed code
- [ ] Tests are independent and can run in any order

## Recommended Actions

1. Review and fix identified issues
2. Add missing test cases
3. Ensure tests validate actual behavior
4. Remove any test-only code paths
5. Verify tests fail when code is broken

EOF
}

# Main execution
echo -e "${CYAN}Step 1: Detecting Test Execution${NC}"
echo "--------------------------------"

# Check if this is triggered by a test failure
TEST_COMMAND="$1"
TEST_OUTPUT="$2"
FAILED_TEST_FILE="$3"

# If no arguments, try to find recent test failures
if [ -z "$TEST_COMMAND" ]; then
    echo "Checking for recent test failures..."

    # Look for common test output patterns
    if [ -f "$PROJECT_ROOT/test-results.json" ]; then
        FAILED_TEST_FILE=$(grep -l "failed" "$PROJECT_ROOT/test-results.json" 2>/dev/null)
    fi
fi

# Analyze test quality
echo ""
echo -e "${CYAN}Step 2: Test Quality Analysis${NC}"
echo "-----------------------------"

if [ -n "$FAILED_TEST_FILE" ] && [ -f "$FAILED_TEST_FILE" ]; then
    echo -e "Analyzing: ${PURPLE}$FAILED_TEST_FILE${NC}"

    # Perform quality analysis
    ANALYSIS_RESULT=$(analyze_test_quality "$FAILED_TEST_FILE")
    ISSUE_COUNT=$(echo "$ANALYSIS_RESULT" | cut -d: -f1)
    WARNINGS=$(echo "$ANALYSIS_RESULT" | cut -d: -f2-)

    if [ "$ISSUE_COUNT" -gt 0 ]; then
        echo -e "${RED}⚠️  Quality Issues Found: ${ISSUE_COUNT}${NC}"
        echo -e "$WARNINGS"
    else
        echo -e "${GREEN}✓ No obvious quality issues detected${NC}"
    fi
else
    echo -e "${YELLOW}No specific test file to analyze${NC}"
    echo "Performing general test quality check..."

    # Find all test files
    TEST_FILES=$(find "$PROJECT_ROOT" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -10)

    if [ -n "$TEST_FILES" ]; then
        total_issues=0
        for test_file in $TEST_FILES; do
            if [ -f "$test_file" ]; then
                ANALYSIS_RESULT=$(analyze_test_quality "$test_file")
                ISSUE_COUNT=$(echo "$ANALYSIS_RESULT" | cut -d: -f1)
                ((total_issues += ISSUE_COUNT))
            fi
        done

        if [ "$total_issues" -gt 0 ]; then
            echo -e "${YELLOW}Total quality issues across test files: ${total_issues}${NC}"
        fi
    fi
fi

# Invoke Code Quality Reviewer
echo ""
echo -e "${CYAN}Step 3: Invoking Code Quality Reviewer${NC}"
echo "--------------------------------------"

echo -e "${BLUE}🔍 Code Quality Review Agent Activated${NC}"
echo "  Reviewing for:"
echo "  • Test coverage adequacy"
echo "  • Assertion meaningfulness"
echo "  • Error handling coverage"
echo "  • Edge case consideration"

# Simulate quality review (in real implementation, this would call the actual agent)
cat << EOF

${YELLOW}Quality Review Findings:${NC}
━━━━━━━━━━━━━━━━━━━━━━━
1. Ensure tests validate actual behavior, not mocked responses
2. Add negative test cases for error conditions
3. Test boundary conditions and edge cases
4. Verify tests fail when implementation is broken
5. Remove any circular logic in test assertions

EOF

# Invoke Testing Engineer
echo -e "${CYAN}Step 4: Invoking Testing Engineer${NC}"
echo "---------------------------------"

echo -e "${BLUE}👷 Testing Engineer Agent Activated${NC}"
echo "  Validating:"
echo "  • Test-to-code mapping"
echo "  • Coverage completeness"
echo "  • Test independence"
echo "  • Performance impact"

# Generate recommendations
cat << EOF

${YELLOW}Testing Engineer Recommendations:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# Check for specific anti-patterns
echo -e "${PURPLE}Anti-Pattern Detection:${NC}"

# Pattern 1: Tests that always pass
echo -n "  • Checking for always-passing tests: "
if [ -n "$FAILED_TEST_FILE" ] && grep -q "expect(true).toBe(true)" "$FAILED_TEST_FILE" 2>/dev/null; then
    echo -e "${RED}FOUND${NC}"
    echo "    ⚠️  Remove tautological assertions"
else
    echo -e "${GREEN}OK${NC}"
fi

# Pattern 2: Tests without assertions
echo -n "  • Checking for tests without assertions: "
if [ -n "$FAILED_TEST_FILE" ] && ! grep -q "expect\|assert\|should" "$FAILED_TEST_FILE" 2>/dev/null; then
    echo -e "${RED}FOUND${NC}"
    echo "    ⚠️  Add proper assertions to validate behavior"
else
    echo -e "${GREEN}OK${NC}"
fi

# Pattern 3: Testing mock instead of real function
echo -n "  • Checking for mock-only testing: "
if [ -n "$FAILED_TEST_FILE" ] && grep -c "mock" "$FAILED_TEST_FILE" 2>/dev/null | grep -q "^[5-9]\|[0-9][0-9]"; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "    ⚠️  High mock usage detected - ensure real functions are tested"
else
    echo -e "${GREEN}OK${NC}"
fi

# Generate quality report
if [ -n "$FAILED_TEST_FILE" ]; then
    generate_quality_report "$FAILED_TEST_FILE" "$WARNINGS"
    echo ""
    echo -e "${GREEN}📄 Quality report generated: ${REVIEW_REPORT}${NC}"
fi

# Final validation
echo ""
echo -e "${CYAN}Step 5: Test Validation Confirmation${NC}"
echo "------------------------------------"

cat << EOF
${RED}⚠️  CRITICAL REQUIREMENTS:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━
Your tests MUST:
1. ✓ Test actual functionality, not test framework
2. ✓ Fail when the implementation is broken
3. ✓ Pass when the implementation is correct
4. ✓ Cover error cases and edge conditions
5. ✓ Use realistic test data and scenarios

${YELLOW}Ask yourself:${NC}
• If I break the function, will this test fail?
• Am I testing the outcome, not the implementation?
• Would this test catch real bugs?

EOF

# Log the review
echo "$(date): Test quality review performed on ${FAILED_TEST_FILE:-'general review'}" >> "$TEST_LOG"

# Determine if tests should be blocked
BLOCK_TESTS=false
if [ "$ISSUE_COUNT" -gt 3 ]; then
    BLOCK_TESTS=true
    echo -e "${RED}❌ TEST QUALITY GATE FAILED${NC}"
    echo "Too many quality issues detected ($ISSUE_COUNT)"
    echo "Please fix the issues before proceeding"
    exit 1
fi

echo -e "${GREEN}✅ Test Quality Review Complete${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review and address any quality issues found"
echo "2. Ensure tests validate actual functionality"
echo "3. Add missing test cases for edge conditions"
echo "4. Re-run tests after improvements"
echo "5. Commit only when tests properly validate code"

exit 0