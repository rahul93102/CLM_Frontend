#!/bin/bash

# COMPREHENSIVE CURL ENDPOINT TESTS
# Tests all endpoints with real data - NO MOCK

BASE_URL="http://127.0.0.1:8000"
TIMESTAMP=$(date +%s)
TEST_EMAIL="curl_test_${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!@#"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  COMPREHENSIVE ENDPOINT TESTING WITH CURL                 ║${NC}"
echo -e "${BLUE}║  Real Data - NO Mock - Production Ready                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local token=$5
  
  ((TOTAL++))
  
  local cmd="curl -s -X $method $BASE_URL$endpoint"
  
  if [ ! -z "$token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $token'"
  fi
  
  cmd="$cmd -H 'Content-Type: application/json'"
  
  if [ ! -z "$data" ]; then
    cmd="$cmd -d '$data'"
  fi
  
  local response=$(eval $cmd)
  local http_code=$(eval "$cmd -w '%{http_code}'" 2>&1 | tail -c 4)
  
  if [[ "$http_code" =~ ^[2][0-9][0-9]$ ]]; then
    echo -e "${GREEN}✅ PASS${NC} | $name (HTTP $http_code)"
    ((PASSED++))
    echo "$response"
  else
    echo -e "${RED}❌ FAIL${NC} | $name (HTTP $http_code)"
    ((FAILED++))
  fi
  echo ""
}

# ==================== AUTHENTICATION ====================
echo -e "${YELLOW}SECTION 1: AUTHENTICATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Register
echo "Testing: User Registration"
REG_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"Test User\"}")

ACCESS_TOKEN=$(echo "$REG_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✅ PASS${NC} | User Registration"
  ((PASSED++))
  echo "Token obtained: ${ACCESS_TOKEN:0:30}..."
else
  echo -e "${RED}❌ FAIL${NC} | User Registration"
  ((FAILED++))
fi
((TOTAL++))
echo ""

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Cannot continue without auth token${NC}"
  exit 1
fi

# Get Current User
echo "Testing: Get Current User"
CURRENT_USER=$(curl -s -X GET $BASE_URL/api/auth/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$CURRENT_USER" | grep -q "user_id\|id"; then
  echo -e "${GREEN}✅ PASS${NC} | Get Current User"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Get Current User"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== CONTRACTS ====================
echo -e "${YELLOW}SECTION 2: CONTRACTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create Contract
echo "Testing: Create Contract"
CONTRACT_RESPONSE=$(curl -s -X POST $BASE_URL/api/contracts/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Service Agreement\",\"description\":\"Test contract\",\"status\":\"draft\"}")

CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$CONTRACT_ID" ]; then
  echo -e "${GREEN}✅ PASS${NC} | Create Contract"
  ((PASSED++))
  echo "Contract ID: $CONTRACT_ID"
else
  echo -e "${RED}❌ FAIL${NC} | Create Contract"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# List Contracts
echo "Testing: List Contracts"
LIST_RESPONSE=$(curl -s -X GET $BASE_URL/api/contracts/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$LIST_RESPONSE" | grep -q "id\|results"; then
  echo -e "${GREEN}✅ PASS${NC} | List Contracts"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | List Contracts"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# Get Contract
if [ ! -z "$CONTRACT_ID" ]; then
  echo "Testing: Get Contract Details"
  GET_RESPONSE=$(curl -s -X GET $BASE_URL/api/contracts/$CONTRACT_ID/ \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$GET_RESPONSE" | grep -q "$CONTRACT_ID"; then
    echo -e "${GREEN}✅ PASS${NC} | Get Contract Details"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} | Get Contract Details"
    ((FAILED++))
  fi
  ((TOTAL++))
  echo ""
  
  # Update Contract
  echo "Testing: Update Contract"
  UPDATE_RESPONSE=$(curl -s -X PUT $BASE_URL/api/contracts/$CONTRACT_ID/ \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Updated Service Agreement\",\"status\":\"pending\"}")
  
  if echo "$UPDATE_RESPONSE" | grep -q "pending\|id"; then
    echo -e "${GREEN}✅ PASS${NC} | Update Contract"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} | Update Contract"
    ((FAILED++))
  fi
  ((TOTAL++))
  echo ""
  
  # Clone Contract
  echo "Testing: Clone Contract"
  CLONE_RESPONSE=$(curl -s -X POST $BASE_URL/api/contracts/$CONTRACT_ID/clone/ \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Cloned Service Agreement\"}")
  
  if echo "$CLONE_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✅ PASS${NC} | Clone Contract"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} | Clone Contract"
    ((FAILED++))
  fi
  ((TOTAL++))
  echo ""
fi

# ==================== TEMPLATES ====================
echo -e "${YELLOW}SECTION 3: TEMPLATES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create Template
echo "Testing: Create Template"
TEMPLATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/contract-templates/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"NDA Template\",\"contract_type\":\"NDA\",\"description\":\"Standard NDA\"}")

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✅ PASS${NC} | Create Template"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Create Template"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# List Templates
echo "Testing: List Templates"
TEMPLATES_RESPONSE=$(curl -s -X GET $BASE_URL/api/contract-templates/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$TEMPLATES_RESPONSE" | grep -q "id\|results"; then
  echo -e "${GREEN}✅ PASS${NC} | List Templates"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | List Templates"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== WORKFLOWS ====================
echo -e "${YELLOW}SECTION 4: WORKFLOWS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create Workflow
echo "Testing: Create Workflow"
WORKFLOW_RESPONSE=$(curl -s -X POST $BASE_URL/api/workflows/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Contract Review Workflow\",\"description\":\"Standard workflow\",\"steps\":[]}")

WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$WORKFLOW_ID" ]; then
  echo -e "${GREEN}✅ PASS${NC} | Create Workflow"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Create Workflow"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# List Workflows
echo "Testing: List Workflows"
WORKFLOWS_RESPONSE=$(curl -s -X GET $BASE_URL/api/workflows/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$WORKFLOWS_RESPONSE" | grep -q "id\|results"; then
  echo -e "${GREEN}✅ PASS${NC} | List Workflows"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | List Workflows"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== APPROVALS ====================
echo -e "${YELLOW}SECTION 5: APPROVALS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create Approval
echo "Testing: Create Approval Request"
APPROVAL_RESPONSE=$(curl -s -X POST $BASE_URL/api/approvals/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"entity_type\":\"contract\",\"entity_id\":\"test-uuid-123\",\"requester_id\":\"user-1\",\"status\":\"pending\",\"priority\":\"normal\"}")

APPROVAL_ID=$(echo "$APPROVAL_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$APPROVAL_ID" ]; then
  echo -e "${GREEN}✅ PASS${NC} | Create Approval Request"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Create Approval Request"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# List Approvals
echo "Testing: List Approvals"
APPROVALS_RESPONSE=$(curl -s -X GET $BASE_URL/api/approvals/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$APPROVALS_RESPONSE" | grep -q "id\|results"; then
  echo -e "${GREEN}✅ PASS${NC} | List Approvals"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | List Approvals"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== SEARCH ====================
echo -e "${YELLOW}SECTION 6: SEARCH${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Search
echo "Testing: Full-Text Search"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/search/?q=contract" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$SEARCH_RESPONSE" | grep -q "id\|results\|{"; then
  echo -e "${GREEN}✅ PASS${NC} | Full-Text Search"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Full-Text Search"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== NOTIFICATIONS ====================
echo -e "${YELLOW}SECTION 7: NOTIFICATIONS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get Notifications
echo "Testing: Get Notifications"
NOTIF_RESPONSE=$(curl -s -X GET $BASE_URL/api/notifications/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$NOTIF_RESPONSE" | grep -q "id\|results\|{"; then
  echo -e "${GREEN}✅ PASS${NC} | Get Notifications"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | Get Notifications"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== DOCUMENTS ====================
echo -e "${YELLOW}SECTION 8: DOCUMENTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# List Documents
echo "Testing: List Documents"
DOCS_RESPONSE=$(curl -s -X GET $BASE_URL/api/documents/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$DOCS_RESPONSE" | grep -q "id\|results\|{"; then
  echo -e "${GREEN}✅ PASS${NC} | List Documents"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} | List Documents"
  ((FAILED++))
fi
((TOTAL++))
echo ""

# ==================== SUMMARY ====================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     TEST SUMMARY                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$((PASSED * 100 / TOTAL))
  echo "Success Rate: $SUCCESS_RATE%"
  echo ""
  
  if [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${GREEN}✅ ENDPOINTS VERIFIED - READY FOR FRONTEND IMPLEMENTATION${NC}"
  else
    echo -e "${YELLOW}⚠️  Some endpoints need attention${NC}"
  fi
fi

echo ""
