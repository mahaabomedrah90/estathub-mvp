#!/bin/bash

# ALWSM Production Fix Verification Script
# Run this after deployment to verify all fixes are working

set -e

echo "🔍 ALWSM Production Fix Verification"
echo "=================================="

# Configuration
DOMAIN="https://alwsm.sa"
API_BASE="${DOMAIN}/api"
DEBUG_TOKEN="${DEBUG_TOKEN:-}"  # Set this environment variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

echo ""
echo "1. Testing Health Endpoints"
echo "--------------------------"

# Test basic health
echo -n "Testing /health endpoint... "
curl -s -f "${DOMAIN}/health" > /dev/null
check_status "Health endpoint responding"

# Test API health  
echo -n "Testing /api/health endpoint... "
curl -s -f "${API_BASE}/health" > /dev/null
check_status "API health endpoint responding"

echo ""
echo "2. Testing Login Functionality"
echo "-----------------------------"

# Test login with email (should return 401 for invalid creds, not 400/500)
echo -n "Testing email login format... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass"}')

if [ "$response" = "401" ]; then
    check_status "Email login returns 401 (expected)"
elif [ "$response" = "400" ]; then
    warning "Email login returns 400 - check request format"
elif [ "$response" = "500" ]; then
    warning "Email login returns 500 - check database connectivity"
else
    warning "Email login returns unexpected status: $response"
fi

# Test login with phone
echo -n "Testing phone login format... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0512345678","password":"wrongpass"}')

if [ "$response" = "401" ]; then
    check_status "Phone login returns 401 (expected)"
else
    warning "Phone login returns unexpected status: $response"
fi

# Test login with emailOrPhone
echo -n "Testing emailOrPhone login format... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","password":"wrongpass"}')

if [ "$response" = "401" ]; then
    check_status "EmailOrPhone login returns 401 (expected)"
else
    warning "EmailOrPhone login returns unexpected status: $response"
fi

echo ""
echo "3. Testing Request Validation"
echo "----------------------------"

# Test missing password
echo -n "Testing missing password validation... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')

if [ "$response" = "400" ]; then
    check_status "Missing password returns 400 (expected)"
else
    warning "Missing password validation failed: $response"
fi

# Test missing email/phone
echo -n "Testing missing email/phone validation... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"testpass"}')

if [ "$response" = "400" ]; then
    check_status "Missing email/phone returns 400 (expected)"
else
    warning "Missing email/phone validation failed: $response"
fi

echo ""
echo "4. Database Connectivity (if DEBUG_TOKEN set)"
echo "--------------------------------------------"

if [ -n "$DEBUG_TOKEN" ]; then
    echo -n "Testing database connectivity... "
    response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/_debug/db-ping" \
      -H "X-Debug-Token: $DEBUG_TOKEN")
    
    if [ "$response" = "200" ]; then
        check_status "Database connectivity OK"
    else
        warning "Database connectivity issue: HTTP $response"
    fi
else
    info "DEBUG_TOKEN not set, skipping database connectivity test"
    info "Set DEBUG_TOKEN environment variable to run this test"
fi

echo ""
echo "5. Frontend Static Assets"
echo "-------------------------"

# Test main page loads
echo -n "Testing frontend main page... "
curl -s -f "${DOMAIN}/" > /dev/null
check_status "Frontend main page loads"

# Test static assets
echo -n "Testing static asset access... "
curl -s -f "${DOMAIN}/vite.svg" > /dev/null 2>&1 || \
curl -s -f "${DOMAIN}/assets/" > /dev/null 2>&1
check_status "Static assets accessible"

echo ""
echo "6. CORS Headers Check"
echo "---------------------"

echo -n "Testing CORS headers... "
cors_header=$(curl -s -I "${API_BASE}/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$cors_header" ]; then
    check_status "CORS headers present: $cors_header"
else
    warning "CORS headers missing"
fi

echo ""
echo "7. CloudFront Cache Behavior"
echo "---------------------------"

# Test that auth endpoints aren't cached (should vary by Authorization header)
echo -n "Testing auth endpoint cache behavior... "
response1=$(curl -s -I "${API_BASE}/auth/login" -X POST -H "Content-Type: application/json" -d '{"email":"test"}' | grep -i "cache-control" || echo "")
if [[ "$response1" == *"no-cache"* ]] || [[ "$response1" == *"max-age=0"* ]]; then
    check_status "Auth endpoints have proper cache headers"
else
    warning "Auth endpoints may be cached: $response1"
fi

echo ""
echo "8. ECS Service Status"
echo "--------------------"

# Check if we can get ECS service status (requires AWS CLI and permissions)
if command -v aws &> /dev/null; then
    echo -n "Checking ECS service status... "
    service_status=$(aws ecs describe-services \
      --cluster estathub-backend-cluster1 \
      --services alwsm-clean-backend-svc \
      --query 'services[0].status' \
      --output text 2>/dev/null || echo "")
    
    if [ "$service_status" = "ACTIVE" ]; then
        check_status "ECS service is ACTIVE"
    else
        warning "ECS service status: $service_status"
    fi
    
    # Check running count
    echo -n "Checking ECS running tasks... "
    running_count=$(aws ecs describe-services \
      --cluster estathub-backend-cluster1 \
      --services alwsm-clean-backend-svc \
      --query 'services[0].runningCount' \
      --output text 2>/dev/null || echo "0")
    
    if [ "$running_count" -gt 0 ]; then
        check_status "ECS has $running_count running tasks"
    else
        warning "ECS has no running tasks"
    fi
else
    info "AWS CLI not available, skipping ECS status check"
fi

echo ""
echo "=================================="
echo "🎯 Verification Complete!"
echo ""
echo "If any tests failed, check:"
echo "1. ECS service logs: aws logs tail /ecs/estathub-backend-task --follow"
echo "2. ALB health checks in AWS Console"
echo "3. RDS connectivity and security groups"
echo "4. CloudFront cache behaviors"
echo ""
echo "For database issues, run with DEBUG_TOKEN set:"
echo "DEBUG_TOKEN=your-token ./verify-deployment.sh"
