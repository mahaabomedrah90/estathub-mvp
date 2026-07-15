#!/bin/bash

# Deploy to Existing Infrastructure (NO NEW RESOURCES)
# ===================================================

echo "🚀 Deploying Estathub Backend to Existing Infrastructure"
echo "=================================================="

# Configuration - USE EXISTING RESOURCES
APP_NAME="estathub-backend"
REGION="eu-central-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME"

# Existing Resources
EXISTING_LB_ARN="arn:aws:elasticloadbalancing:eu-central-1:101143944706:loadbalancer/app/alwsm-clean-alb/d679cdf60f6affef"
EXISTING_LB_DNS="alwsm-clean-alb-1638114414.eu-central-1.elb.amazonaws.com"
EXISTING_TG_ARN="arn:aws:elasticloadbalancing:eu-central-1:101143944706:targetgroup/alwsm-clean-tg-5001/xxxxxxxxx"
EXISTING_VPC="vpc-026be679c661d5fcb"

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

# Step 1: Check existing resources
log_step "Checking existing infrastructure..."
log_info "Load Balancer: $EXISTING_LB_DNS"
log_info "VPC: $EXISTING_VPC"

# Step 2: Build and Deploy Docker Image
log_step "Building and Deploying Docker Image..."

# Build application
log_info "Building application..."
npm run build
if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi

# Login to ECR
log_info "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Create ECR repository if not exists
aws ecr describe-repositories --repository-names $APP_NAME --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    log_info "Creating ECR repository..."
    aws ecr create-repository --repository-name $APP_NAME --region $REGION
fi

# Build and push Docker image
log_info "Building Docker image..."
docker buildx build --platform linux/amd64 -t $APP_NAME .
log_info "Tagging Docker image..."
docker tag $APP_NAME:latest $ECR_REPO:latest
log_info "Pushing Docker image to ECR..."
docker push $ECR_REPO:latest

# Step 3: Create Task Definition (for existing infrastructure)
log_step "Creating Task Definition for existing infrastructure..."
cat > task-definition.json << EOF
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
      "name": "estathub-backend",
      "image": "$ECR_REPO:latest",
      "portMappings": [
        {
          "containerPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
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

# Register task definition
TASK_DEFINITION_ARN=$(aws ecs register-task-definition --cli-input-json file://task-definition.json --region $REGION --query taskDefinition.taskDefinitionArn --output text)

# Step 4: Create ECS Service (using existing LB)
log_step "Creating ECS Service with existing Load Balancer..."

# Get existing subnets
SUBNET1=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$EXISTING_VPC --region $REGION --query 'Subnets[0].SubnetId' --output text)
SUBNET2=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$EXISTING_VPC --region $REGION --query 'Subnets[1].SubnetId' --output text)

# Get existing security groups
SG_ID=$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$EXISTING_VPC,Name=group-name,Values=backend-sg --region $REGION --query 'SecurityGroups[0].GroupId' --output text)

if [ -z "$SG_ID" ]; then
    SG_ID=$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$EXISTING_VPC --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
fi

log_info "Using subnets: $SUBNET1, $SUBNET2"
log_info "Using security group: $SG_ID"

# Create service
aws ecs create-service \
    --cluster estathub-cluster \
    --service-name estathub-backend \
    --task-definition $TASK_DEFINITION_ARN \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=$EXISTING_TG_ARN,containerName=estathub-backend,containerPort=5001 \
    --health-check-grace-period-seconds 300 \
    --region $REGION

# Cleanup
rm -f task-definition.json

log_info "✅ Deployment completed!"
echo ""
echo "🌐 Load Balancer DNS: http://$EXISTING_LB_DNS"
echo "📊 ECS Service: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/estathub-cluster/services"
echo ""
echo "🎯 Test the service:"
echo "curl http://$EXISTING_LB_DNS/api/health"
echo ""
echo "📋 IMPORTANT:"
echo "- Using existing Load Balancer: alwsm-clean-alb"
echo "- Using existing VPC: $EXISTING_VPC"
echo "- No new resources created!"
echo "- Service will be available at: http://$EXISTING_LB_DNS"
