#!/bin/bash

# Update Existing Service with Password Reset Feature
# =============================================

echo "🚀 Updating Existing Service with Password Reset"
echo "============================================"

# Configuration
APP_NAME="estathub-backend"
REGION="eu-central-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME"

# Existing Resources
EXISTING_CLUSTER="estathub-backend-cluster1"
EXISTING_SERVICE="alwsm-clean-backend-svc"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Check existing service
log_step "Checking existing service..."
aws ecs describe-services --cluster $EXISTING_CLUSTER --services $EXISTING_SERVICE --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    log_error "Service $EXISTING_SERVICE not found in cluster $EXISTING_CLUSTER"
    exit 1
fi

log_info "✅ Found service: $EXISTING_SERVICE"
log_info "✅ Found cluster: $EXISTING_CLUSTER"

# Step 2: Get current task definition
log_step "Getting current task definition..."
CURRENT_TASK_DEF=$(aws ecs describe-services --cluster $EXISTING_CLUSTER --services $EXISTING_SERVICE --region $REGION --query 'services[0].taskDefinition' --output text)
log_info "Current task definition: $CURRENT_TASK_DEF"

# Step 3: Create new task definition with password reset
log_step "Creating new task definition with password reset feature..."
aws ecs describe-task-definition --task-definition $CURRENT_TASK_DEF --region $REGION > current-task-def.json

# Update the image in the task definition
cat > new-task-def.json << EOF
{
  "family": "estathub-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "$ECR_REPO:latest",
      "portMappings": [
        {
          "containerPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://postgres:Maha59592025@database-1.c9w4q020yq0g.eu-central-1.rds.amazonaws.com:5432/estathub_db?schema=public"
        },
        {
          "name": "JWT_SECRET",
          "value": "CHANGE_ME_JWT_SECRET_32_CHARS_MINIMUM"
        },
        {
          "name": "AWS_ACCESS_KEY_ID",
          "value": "CHANGE_ME_AWS_ACCESS_KEY"
        },
        {
          "name": "AWS_SECRET_ACCESS_KEY",
          "value": "CHANGE_ME_AWS_SECRET_KEY"
        },
        {
          "name": "EMAIL_FROM",
          "value": "support@alwsm.sa"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5001"
        },
        {
          "name": "USE_FABRIC",
          "value": "false"
        },
        {
          "name": "FRONTEND_URL",
          "value": "https://alwsm.sa"
        },
        {
          "name": "CORS_ORIGIN",
          "value": "https://alwsm.sa"
        },
        {
          "name": "AWS_REGION",
          "value": "$REGION"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/estathub-backend",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register new task definition
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://new-task-def.json --region $REGION --query taskDefinition.taskDefinitionArn --output text)
log_info "✅ New task definition registered: $NEW_TASK_DEF_ARN"

# Step 4: Update service with new task definition
log_step "Updating service with new task definition..."
aws ecs update-service \
    --cluster $EXISTING_CLUSTER \
    --service $EXISTING_SERVICE \
    --task-definition $NEW_TASK_DEF_ARN \
    --force-new-deployment \
    --region $REGION

# Cleanup
rm -f current-task-def.json new-task-def.json

log_info "✅ Service update completed!"
echo ""
echo "🌐 Load Balancer DNS: http://alwsm-clean-alb-1638114414.eu-central-1.elb.amazonaws.com"
echo "📊 ECS Service: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$EXISTING_CLUSTER/services"
echo ""
echo "🎯 Test the updated service:"
echo "curl http://alwsm-clean-alb-1638114414.eu-central-1.elb.amazonaws.com/api/health"
echo ""
echo "🔐 Test password reset endpoints:"
echo "POST http://alwsm-clean-alb-1638114414.eu-central-1.elb.amazonaws.com/api/auth/forgot-password"
echo "POST http://alwsm-clean-alb-1638114414.eu-central-1.elb.amazonaws.com/api/auth/reset-password"
echo ""
echo "📋 IMPORTANT:"
echo "- Updated existing service: $EXISTING_SERVICE"
echo "- Using existing cluster: $EXISTING_CLUSTER"
echo "- No new resources created!"
echo "- Password reset feature is now enabled"
