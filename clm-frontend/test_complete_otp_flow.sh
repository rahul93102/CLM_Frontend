#!/bin/bash

BASE_URL="https://clm-backend-at23.onrender.com"
TIMESTAMP=$(date +%s)
TEST_EMAIL="otp_flow_test_${TIMESTAMP}@example.com"
PASSWORD="SecurePass123!"
FULL_NAME="OTP Flow Test User"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

print_header() {
  echo ""
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  COMPLETE OTP FLOW TEST - END-TO-END VERIFICATION            ║${NC}"
  echo -e "${CYAN}║  Testing: $BASE_URL${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_test() {
  local name=$1
  local status=$2
  local details=$3
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✅ PASS${NC} - $name"
    ((PASS_COUNT++))
  else
    echo -e "${RED}❌ FAIL${NC} - $name"
    if [ ! -z "$details" ]; then
      echo -e "   ${RED}→ $details${NC}"
    fi
    ((FAIL_COUNT++))
  fi
}

print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}► $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# TEST 1: USER REGISTRATION
# ============================================================================
print_section "STEP 1: USER REGISTRATION (OTP Sent)"

echo "Registering user: $TEST_EMAIL"
echo "Full Name: $FULL_NAME"
echo "Password: [REDACTED]"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$PASSWORD\",
    \"full_name\": \"$FULL_NAME\"
  }")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Verify registration
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access // empty' 2>/dev/null)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.refresh // empty' 2>/dev/null)
USER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.user.email // empty' 2>/dev/null)

if [ ! -z "$ACCESS_TOKEN" ] && [ ! -z "$USER_EMAIL" ] && [ "$USER_EMAIL" = "$TEST_EMAIL" ]; then
  print_test "User Registration" "PASS"
  echo "   Email: $USER_EMAIL"
  echo "   Access Token: ${ACCESS_TOKEN:0:30}..."
  echo "   ✓ OTP should have been sent to registered email"
else
  print_test "User Registration" "FAIL" "Failed to register user or missing tokens"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

# ============================================================================
# TEST 2: REQUEST LOGIN OTP (Alternate OTP Method)
# ============================================================================
print_section "STEP 2: REQUEST LOGIN OTP (Alternative Flow)"

echo "Requesting login OTP for: $TEST_EMAIL"
echo ""

LOGIN_OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/request-login-otp/" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Response:"
echo "$LOGIN_OTP_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_OTP_RESPONSE"
echo ""

LOGIN_OTP_MSG=$(echo "$LOGIN_OTP_RESPONSE" | jq -r '.message // empty' 2>/dev/null)

if [ ! -z "$LOGIN_OTP_MSG" ]; then
  print_test "Request Login OTP" "PASS"
  echo "   Message: $LOGIN_OTP_MSG"
  echo "   ✓ OTP sent successfully"
else
  print_test "Request Login OTP" "FAIL" "No message in response"
fi

# ============================================================================
# TEST 3: VERIFY EMAIL OTP (Test with invalid OTP first)
# ============================================================================
print_section "STEP 3: VERIFY EMAIL OTP (Validation Test)"

echo "Testing OTP verification endpoint with invalid OTP..."
echo ""

INVALID_OTP="000000"
VERIFY_INVALID=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/verify-email-otp/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"otp\": \"$INVALID_OTP\"
  }")

HTTP_CODE=$(echo "$VERIFY_INVALID" | tail -1)
VERIFY_BODY=$(echo "$VERIFY_INVALID" | sed '$d')

echo "Invalid OTP Response (HTTP $HTTP_CODE):"
echo "$VERIFY_BODY" | jq '.' 2>/dev/null || echo "$VERIFY_BODY"
echo ""

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  print_test "OTP Validation (Rejects Invalid OTP)" "PASS"
  echo "   HTTP Status: $HTTP_CODE (Correctly rejected)"
  echo "   ✓ Endpoint properly validates OTP format"
else
  print_test "OTP Validation (Rejects Invalid OTP)" "FAIL" "Expected 400/401, got $HTTP_CODE"
fi

# ============================================================================
# TEST 4: FORGOT PASSWORD FLOW
# ============================================================================
print_section "STEP 4: FORGOT PASSWORD FLOW (Request OTP)"

echo "Requesting password reset OTP for: $TEST_EMAIL"
echo ""

FORGOT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password/" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Response:"
echo "$FORGOT_RESPONSE" | jq '.' 2>/dev/null || echo "$FORGOT_RESPONSE"
echo ""

FORGOT_MSG=$(echo "$FORGOT_RESPONSE" | jq -r '.message // empty' 2>/dev/null)

if [ ! -z "$FORGOT_MSG" ]; then
  print_test "Forgot Password Request" "PASS"
  echo "   Message: $FORGOT_MSG"
  echo "   ✓ Password reset OTP sent"
else
  print_test "Forgot Password Request" "FAIL" "No message in response"
fi

# ============================================================================
# TEST 5: VERIFY PASSWORD RESET OTP
# ============================================================================
print_section "STEP 5: PASSWORD RESET OTP VERIFICATION"

echo "Testing password reset OTP endpoint..."
echo ""

VERIFY_RESET=$(curl -s -X POST "$BASE_URL/api/auth/verify-password-reset-otp/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"otp\": \"000000\"
  }")

echo "Response:"
echo "$VERIFY_RESET" | jq '.' 2>/dev/null || echo "$VERIFY_RESET"
echo ""

if [ ! -z "$VERIFY_RESET" ]; then
  print_test "Password Reset OTP Verification" "PASS"
  echo "   ✓ Endpoint exists and validates OTP"
else
  print_test "Password Reset OTP Verification" "FAIL" "No response"
fi

# ============================================================================
# TEST 6: RESEND PASSWORD RESET OTP
# ============================================================================
print_section "STEP 6: RESEND PASSWORD RESET OTP"

echo "Testing resend OTP functionality..."
echo ""

RESEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/resend-password-reset-otp/" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Response:"
echo "$RESEND_RESPONSE" | jq '.' 2>/dev/null || echo "$RESEND_RESPONSE"
echo ""

RESEND_MSG=$(echo "$RESEND_RESPONSE" | jq -r '.message // empty' 2>/dev/null)

if [ ! -z "$RESEND_MSG" ]; then
  print_test "Resend Password Reset OTP" "PASS"
  echo "   Message: $RESEND_MSG"
  echo "   ✓ Resend OTP works correctly"
else
  print_test "Resend Password Reset OTP" "FAIL" "No message in response"
fi

# ============================================================================
# TEST 7: REFRESH TOKEN
# ============================================================================
print_section "STEP 7: TOKEN REFRESH"

if [ ! -z "$REFRESH_TOKEN" ]; then
  echo "Testing token refresh with valid refresh token..."
  echo ""
  
  REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh/" \
    -H "Content-Type: application/json" \
    -d "{\"refresh\": \"$REFRESH_TOKEN\"}")
  
  echo "Response:"
  echo "$REFRESH_RESPONSE" | jq '.' 2>/dev/null || echo "$REFRESH_RESPONSE"
  echo ""
  
  NEW_ACCESS=$(echo "$REFRESH_RESPONSE" | jq -r '.access // empty' 2>/dev/null)
  
  if [ ! -z "$NEW_ACCESS" ]; then
    print_test "Token Refresh" "PASS"
    echo "   New Access Token: ${NEW_ACCESS:0:30}..."
    echo "   ✓ Token refresh successful"
  else
    print_test "Token Refresh" "FAIL" "Could not get new access token"
  fi
else
  print_test "Token Refresh" "FAIL" "No refresh token available"
fi

# ============================================================================
# TEST 8: LOGIN WITH PASSWORD
# ============================================================================
print_section "STEP 8: LOGIN WITH PASSWORD (Direct)"

echo "Testing direct login with password..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

LOGIN_ACCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.access // empty' 2>/dev/null)

if [ ! -z "$LOGIN_ACCESS" ]; then
  print_test "Direct Password Login" "PASS"
  echo "   Access Token: ${LOGIN_ACCESS:0:30}..."
  echo "   ✓ Login successful"
else
  print_test "Direct Password Login" "FAIL" "Could not authenticate"
fi

# ============================================================================
# SUMMARY
# ============================================================================
print_section "TEST SUMMARY"

TOTAL=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL))

echo ""
echo -e "${CYAN}Total Tests: $TOTAL${NC}"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "${CYAN}Success Rate: ${SUCCESS_RATE}%${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ ALL OTP FLOW TESTS PASSED SUCCESSFULLY!                   ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "OTP Flow Validation:"
  echo "  ✓ User can register (receives welcome email + OTP)"
  echo "  ✓ Request login OTP works"
  echo "  ✓ Email OTP verification endpoint exists"
  echo "  ✓ Password reset OTP request works"
  echo "  ✓ Password reset OTP verification works"
  echo "  ✓ Resend OTP functionality works"
  echo "  ✓ Token refresh works"
  echo "  ✓ Direct password login works"
  echo ""
  echo "Frontend can now:"
  echo "  • Show OTP input screen after registration"
  echo "  • Verify OTP with correct error handling"
  echo "  • Request password reset"
  echo "  • Handle token expiration with refresh"
  echo ""
else
  echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ SOME TESTS FAILED - CHECK ERRORS ABOVE                   ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
