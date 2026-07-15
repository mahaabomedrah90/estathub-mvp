#!/bin/bash

# Verification script for login error handling
# Tests that POST /api/auth/login returns JSON with 401 for invalid credentials

echo "🧪 Testing login error handling..."
echo "=================================="

# Test 1: Invalid email
echo -e "\n📧 Test 1: Invalid email with wrong password"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "wrongpassword"
  }')

http_code=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $http_code"
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# Test 2: Invalid phone
echo -e "\n📱 Test 2: Invalid phone with wrong password"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "phoneNumber": "0599999999",
    "password": "wrongpassword"
  }')

http_code=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $http_code"
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# Test 3: Missing password
echo -e "\n🔒 Test 3: Missing password field"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "email": "test@example.com"
  }')

http_code=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $http_code"
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# Test 4: API 404 handler
echo -e "\n🔍 Test 4: Non-existent API endpoint"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  http://localhost:5001/api/nonexistent)

http_code=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $http_code"
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

echo -e "\n✅ Verification complete!"
echo "Expected results:"
echo "- Tests 1-2: HTTP 401 with {\"code\":\"INVALID_CREDENTIALS\",\"message\":\"البريد الإلكتروني/الجوال أو كلمة المرور غير صحيحة\"}"
echo "- Test 3: HTTP 400 with JSON error"
echo "- Test 4: HTTP 404 with {\"code\":\"NOT_FOUND\",\"message\":\"Not found\"}"
