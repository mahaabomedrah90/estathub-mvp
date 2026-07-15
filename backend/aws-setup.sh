#!/bin/bash

# AWS ECS Setup Script for Estathub Backend
# ==========================================

echo "🚀 Setting up AWS ECS for Estathub Backend"
echo "==========================================="

# Configuration
CLUSTER_NAME="estathub-cluster"
SERVICE_NAME="estathub-backend"
TASK_FAMILY="estathub-backend-task"
REGION="eu-central-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/estathub-backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Step 1: Create ECS Cluster
log_info "Creating ECS Cluster..."
aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $REGION \
    --capacity-providers FARGATE,FARGATE_SPOT \
    --default-capacity-provider-strategy FARGATE_SPOT

# Step 2: Create Task Definition
log_info "Creating Task Definition..."
cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskRole",
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
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-jwt-secret"
        },
        {
          "name": "AWS_ACCESS_KEY_ID",
          "valueFrom": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-aws-access-key"
        },
        {
          "name": "AWS_SECRET_ACCESS_KEY",
          "valueFrom": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-aws-secret-key"
        },
        {
          "name": "EMAIL_FROM",
          "valueFrom": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-email-from"
        },
        {
          "name": "FRONTEND_URL",
          "value": "https://alwsm.sa"
        },
        {
          "name": "CORS_ORIGIN",
          "value": "https://alwsm.sa"
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
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5001/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json --region $REGION

# Step 3: Create Security Group
log_info "Creating Security Group..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name estathub-backend-sg \
    --description "Security group for Estathub backend" \
    --region $REGION \
    --query GroupId \
    --output text)

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION

# Allow HTTPS traffic
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION

# Step 4: Create VPC and Subnets (if needed)
log_info "Setting up VPC..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --region $REGION \
    --query Vpc.VpcId \
    --output text)

# Create public subnets
SUBNET1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ${REGION}a \
    --region $REGION \
    --query Subnet.SubnetId \
    --output text)

SUBNET2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone ${REGION}b \
    --region $REGION \
    --query Subnet.SubnetId \
    --output text)

# Step 5: Create Application Load Balancer
log_info "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name estathub-backend-alb \
    --subnets $SUBNET1_ID $SUBNET2_ID \
    --security-groups $SECURITY_GROUP_ID \
    --scheme internet-facing \
    --type application \
    --region $REGION \
    --query LoadBalancers[0].LoadBalancerArn \
    --output text)

# Create target group
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name estathub-backend-tg \
    --protocol HTTP \
    --port 5001 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --query TargetGroups[0].TargetGroupArn \
    --output text)

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $REGION

# Step 6: Create ECS Service
log_info "Creating ECS Service..."
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1_ID,$SUBNET2_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=estathub-backend,containerPort=5001 \
    --region $REGION

# Step 7: Create Secrets Manager secrets
log_info "Creating Secrets Manager secrets..."

# Database URL
aws secretsmanager create-secret \
    --name estathub-db-url \
    --description "Database connection URL" \
    --secret-string "postgresql://postgres:YourPassword123!@estathub-db.xxx.eu-central-1.rds.amazonaws.com:5432/estathub_db" \
    --region $REGION

# JWT Secret
aws secretsmanager create-secret \
    --name estathub-jwt-secret \
    --description "JWT signing secret" \
    --secret-string "your-very-secure-jwt-secret-32-chars-minimum" \
    --region $REGION

# AWS Access Key
aws secretsmanager create-secret \
    --name estathub-aws-access-key \
    --description "AWS Access Key ID for SES" \
    --secret-string "your-aws-access-key-id" \
    --region $REGION

# AWS Secret Key
aws secretsmanager create-secret \
    --name estathub-aws-secret-key \
    --description "AWS Secret Access Key for SES" \
    --secret-string "your-aws-secret-access-key" \
    --region $REGION

# Email From
aws secretsmanager create-secret \
    --name estathub-email-from \
    --description "Email from address" \
    --secret-string "noreply@alwsm.sa" \
    --region $REGION

log_info "✅ ECS Setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Update the secrets with your real values"
echo "2. Create RDS database instance"
echo "3. Deploy the Docker image using: ./deploy-aws.sh"
echo "4. Run database migrations: npx prisma migrate deploy"
echo ""
echo "🔧 Load Balancer DNS Name:"
aws elbv2 describe-load-balancers \
    --names estathub-backend-alb \
    --region $REGION \
    --query LoadBalancers[0].DNSName \
    --output text
