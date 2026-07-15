# ALWSM Production Fix Deployment Runbook
## Date: 2026-02-27
## Purpose: Fix login 400/500 errors, ECS health checks, and CloudFront caching

---

## 🔧 AWS Infrastructure Fixes (Manual)

### 1. RDS Security Group Configuration
```bash
# Get ECS task security group name
aws ecs describe-task-definition --task-definition estathub-backend-task:33 --query 'taskDefinition.containerDefinitions[0].networkConfiguration.awsvpcConfiguration.securityGroups'

# Get RDS security group name  
aws rds describe-db-instances --db-instance-identifier database-1 --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId'

# Add inbound rule allowing ECS -> RDS on port 5432
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-id \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ecs-id \
  --description "Allow ECS tasks to connect to RDS"
```

### 2. CloudFront Cache Behavior Configuration
```bash
# Create separate cache behavior for /api/auth/* with TTL 0
# Use AWS Console: CloudFront -> Distribution EY36PZAUZPUG -> Behaviors -> Create Behavior
# Path pattern: /api/auth/*
# Origin: Existing ALB origin
# Cache policy: Managed-CachingDisabled
# Origin request policy: AllViewer
# Forward headers: Authorization, Content-Type, Accept-Language, X-Request-ID
# Cache TTL: 0
```

### 3. S3 Bucket Policy Verification
```bash
# Ensure OAC is properly configured
aws s3api get-bucket-policy --bucket alwsm-frontend-prodv01

# Should include CloudFront OAC access like:
# {
#   "Sid": "AllowCloudFrontServicePrincipal",
#   "Effect": "Allow", 
#   "Principal": {"Service": "cloudfront.amazonaws.com"},
#   "Action": "s3:GetObject",
#   "Resource": "arn:aws:s3:::alwsm-frontend-prodv01/*"
# }
```

---

## 🚀 Backend Deployment

### 1. Build and Push Docker Image
```bash
cd /Users/mahaabomedrah/Desktop/Banah2025/estathub-mvp-starter/backend

# Login to ECR
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 101143944706.dkr.ecr.eu-central-1.amazonaws.com

# Build image with new tag
docker build -t estathub-backend:fix-login-20260227-01 .

# Tag and push
docker tag estathub-backend:fix-login-20260227-01 101143944706.dkr.ecr.eu-central-1.amazonaws.com/estathub-backend:fix-login-20260227-01
docker push 101143944706.dkr.ecr.eu-central-1.amazonaws.com/estathub-backend:fix-login-20260227-01
```

### 2. Update ECS Task Definition
```bash
# Copy existing task definition and update image
cp td33.json td34.json

# Update image in td34.json to new tag:
# "image": "101143944706.dkr.ecr.eu-central-1.amazonaws.com/estathub-backend:fix-login-20260227-01"

# Register new task definition
aws ecs register-task-definition --cli-input-json file://td34.json

# Note the new revision number (should be 34)
```

### 3. Update ECS Service
```bash
# Update service to use new task definition
aws ecs update-service \
  --cluster estathub-backend-cluster1 \
  --service alwsm-clean-backend-svc \
  --task-definition estathub-backend-task:34 \
  --force-new-deployment

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster estathub-backend-cluster1 \
  --services alwsm-clean-backend-svc
```

---

## 🎨 Frontend Deployment

### 1. Build and Deploy Frontend
```bash
cd /Users/mahaabomedrah/Desktop/Banah2025/estathub-mvp-starter/frontend

# Install dependencies and build
npm ci
npm run build

# Sync to S3
aws s3 sync dist/ s3://alwsm-frontend-prodv01 --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EY36PZAUZPUG \
  --paths "/index.html" "/api/*" "/*"
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks
```bash
# Check ALB health
curl -I https://alwsm.sa/api/health

# Check backend health directly
curl -I https://alwsm.sa/health

# Check database connectivity (requires DEBUG_TOKEN)
curl -H "X-Debug-Token: YOUR_DEBUG_TOKEN" \
  https://alwsm.sa/api/_debug/db-ping
```

### 2. Login Testing
```bash
# Test login with email
curl -X POST https://alwsm.sa/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Test login with phone  
curl -X POST https://alwsm.sa/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05xxxxxxxx","password":"testpass"}'

# Test login with emailOrPhone
curl -X POST https://alwsm.sa/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","password":"testpass"}'
```

### 3. ECS Logs Monitoring
```bash
# Check recent logs for database connectivity
aws logs tail /ecs/estathub-backend-task --follow --since 5m

# Look for these patterns:
# ✅ Database connectivity OK
# ❌ Database connectivity failed
# 🔍 [DEBUG] Processing login
# ✅ [DEBUG] Prisma: User lookup completed
```

---

## 🚨 Rollback Plan

### If Backend Issues Occur:
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster estathub-backend-cluster1 \
  --service alwsm-clean-backend-svc \
  --task-definition estathub-backend-task:33 \
  --force-new-deployment
```

### If Frontend Issues Occur:
```bash
# Restore previous frontend build from backup
aws s3 sync s3://alwsm-frontend-prodv01-backup/ s3://alwsm-frontend-prodv01 --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EY36PZAUZPUG \
  --paths "/*"
```

---

## 📞 Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Backend Lead**: [Contact Info]  
- **Frontend Lead**: [Contact Info]
- **AWS Support**: [Account Number]

---

## ✅ Deployment Checklist

- [ ] RDS security group updated to allow ECS traffic
- [ ] CloudFront cache behavior configured for /api/auth/*
- [ ] S3 bucket policy verified for OAC access
- [ ] Backend Docker image built and pushed
- [ ] ECS task definition updated and registered
- [ ] ECS service updated with new task definition
- [ ] Frontend built and synced to S3
- [ ] CloudFront cache invalidated
- [ ] Health checks passing
- [ ] Login functionality tested
- [ ] Database connectivity verified
- [ ] ECS logs showing normal operation

---

**Deployment Status**: _____________  
**Completed By**: _____________  
**Timestamp**: _____________
