#!/bin/bash

# Fixed Production Deployment Script for Estathub Backend
# =========================================================

echo "🚀 Fixed Production Deployment for Estathub Backend"
echo "=================================================="

# Configuration - CONSISTENT WITH SES
CLUSTER_NAME="estathub-cluster"
SERVICE_NAME="estathub-backend"
TASK_FAMILY="estathub-backend-task"
APP_NAME="estathub-backend"
REGION="eu-central-1"  # IMPORTANT: Same as SES region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Pre-flight checks
log_step "Running pre-flight checks..."
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
fi

# Step 1: Create Secrets (FIRST - for security)
log_step "Creating AWS Secrets Manager secrets..."
aws secretsmanager create-secret \
    --name estathub-db-url \
    --description "Database connection URL" \
    --secret-string "postgresql://postgres:CHANGE_ME_PASSWORD@CHANGE_ME_HOST:5432/estathub_db" \
    --region $REGION 2>/dev/null || log_warn "Database secret already exists"

aws secretsmanager create-secret \
    --name estathub-jwt-secret \
    --description "JWT signing secret" \
    --secret-string "CHANGE_ME_JWT_SECRET_32_CHARS_MINIMUM" \
    --region $REGION 2>/dev/null || log_warn "JWT secret already exists"

aws secretsmanager create-secret \
    --name estathub-aws-access-key \
    --description "AWS Access Key ID for SES" \
    --secret-string "CHANGE_ME_AWS_ACCESS_KEY" \
    --region $REGION 2>/dev/null || log_warn "AWS Access Key secret already exists"

aws secretsmanager create-secret \
    --name estathub-aws-secret-key \
    --description "AWS Secret Access Key for SES" \
    --secret-string "CHANGE_ME_AWS_SECRET_KEY" \
    --region $REGION 2>/dev/null || log_warn "AWS Secret Key already exists"

aws secretsmanager create-secret \
    --name estathub-email-from \
    --description "Email from address" \
    --secret-string "noreply@alwsm.sa" \
    --region $REGION 2>/dev/null || log_warn "Email secret already exists"

# Step 2: Use Existing VPC or Create New One
log_step "Setting up VPC and networking..."
VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values=estathub-vpc --region $REGION --query Vpcs[0].VpcId --output text 2>/dev/null)

if [ -z "$VPC_ID" ]; then
    log_info "Creating new VPC..."
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.10.0.0/16 \
        --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=estathub-vpc}]' \
        --region $REGION \
        --query Vpc.VpcId \
        --output text)
    
    # Enable DNS hostnames and resolution
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $REGION
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $REGION
else
    log_info "Using existing VPC: $VPC_ID"
fi

# Create Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC_ID --region $REGION --query InternetGateways[0].InternetGatewayId --output text 2>/dev/null)

if [ -z "$IGW_ID" ]; then
    log_info "Creating Internet Gateway..."
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=estathub-igw}]' \
        --region $REGION \
        --query InternetGateway.InternetGatewayId \
        --output text)
    
    aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION
else
    log_info "Using existing Internet Gateway: $IGW_ID"
fi

# Create Route Table
RT_ID=$(aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC_ID --region $REGION --query RouteTables[0].RouteTableId --output text)

aws ec2 create-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID \
    --region $REGION 2>/dev/null || log_warn "Route already exists"

# Create Subnets with different CIDR to avoid conflicts
SUBNET1_ID=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID,Name=tag:Name,Values=estathub-subnet-1 --region $REGION --query Subnets[0].SubnetId --output text 2>/dev/null)
SUBNET2_ID=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID,Name=tag:Name,Values=estathub-subnet-2 --region $REGION --query Subnets[0].SubnetId --output text 2>/dev/null)

if [ -z "$SUBNET1_ID" ]; then
    log_info "Creating subnets with non-conflicting CIDRs..."
    SUBNET1_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.10.1.0/24 \
        --availability-zone ${REGION}a \
        --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=estathub-subnet-1}]' \
        --region $REGION \
        --query Subnet.SubnetId \
        --output text)
    
    SUBNET2_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.10.2.0/24 \
        --availability-zone ${REGION}b \
        --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=estathub-subnet-2}]' \
        --region $REGION \
        --query Subnet.SubnetId \
        --output text)
    
    # Auto-assign public IPs
    aws ec2 modify-subnet-attribute --subnet-id $SUBNET1_ID --map-public-ip-on-launch --region $REGION
    aws ec2 modify-subnet-attribute --subnet-id $SUBNET2_ID --map-public-ip-on-launch --region $REGION
else
    log_info "Using existing subnets: $SUBNET1_ID, $SUBNET2_ID"
fi

# Step 3: Create Security Groups
log_step "Creating Security Groups..."
SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values=estathub-backend-sg --region $REGION --query SecurityGroups[0].GroupId --output text 2>/dev/null)

if [ -z "$SG_ID" ]; then
    log_info "Creating Security Group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name estathub-backend-sg \
        --description "Security group for Estathub backend" \
        --vpc-id $VPC_ID \
        --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=estathub-backend-sg}]' \
        --region $REGION \
        --query GroupId \
        --output text)
    
    # Allow HTTP from anywhere
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    # Allow HTTPS from anywhere
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    # Allow app port from ALB only
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 5001 \
        --cidr 0.0.0.0/0 \
        --region $REGION
else
    log_info "Using existing Security Group: $SG_ID"
fi

# Step 4: Create ECS Cluster (Fixed parameters)
log_step "Creating ECS Cluster..."
aws ecs describe-clusters --cluster-names $CLUSTER_NAME --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    aws ecs create-cluster \
        --cluster-name $CLUSTER_NAME \
        --region $REGION \
        --capacity-providers FARGATE \
        --default-capacity-provider-strategy FARGATE
else
    log_info "ECS Cluster already exists"
fi

# Step 5: Create Application Load Balancer (Fixed)
log_step "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names estathub-backend-alb --region $REGION --query LoadBalancers[0].LoadBalancerArn --output text 2>/dev/null)

if [ -z "$ALB_ARN" ]; then
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name estathub-backend-alb \
        --subnets $SUBNET1_ID $SUBNET2_ID \
        --security-groups $SG_ID \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --region $REGION \
        --query LoadBalancers[0].LoadBalancerArn \
        --output text)
    
    # Create Target Group
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
        --matcher HttpCode=200-299 \
        --region $REGION \
        --query TargetGroups[0].TargetGroupArn \
        --output text)
    
    # Create Listener
    aws elbv2 create-listener \
        --load-balancer-arn $ALB_ARN \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
        --region $REGION
else
    log_info "Load Balancer already exists"
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names estathub-backend-tg --region $REGION --query TargetGroups[0].TargetGroupArn --output text)
fi

# Step 6: Use Existing IAM Roles
log_step "Checking IAM Roles..."
aws iam describe-role --role-name ecsTaskExecutionRole --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    log_info "Creating IAM Roles..."
    cat > execution-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document file://execution-role-trust-policy.json \
        --region $REGION
    
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
        --region $REGION
    
    # Add Secrets Manager access
    cat > secrets-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecrets"
            ],
            "Resource": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:estathub-*"
        }
    ]
}
EOF
    
    aws iam put-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-name EstathubSecretsAccess \
        --policy-document file://secrets-policy.json \
        --region $REGION
else
    log_info "IAM Roles already exist"
fi

# Step 7: Build and Deploy Docker Image
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

# Create ECR repository
aws ecr describe-repositories --repository-names $APP_NAME --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    log_info "Creating ECR repository..."
    aws ecr create-repository --repository-name $APP_NAME --region $REGION
fi

# Build and push Docker image
log_info "Building Docker image..."
docker build -t $APP_NAME .
log_info "Tagging Docker image..."
docker tag $APP_NAME:latest $ECR_REPO:latest
log_info "Pushing Docker image to ECR..."
docker push $ECR_REPO:latest

# Step 8: Create Task Definition (Fixed)
log_step "Creating Task Definition..."
cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
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

# Step 9: Create ECS Service (Fixed)
log_step "Creating ECS Service..."
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition $TASK_DEFINITION_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1_ID,$SUBNET2_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=estathub-backend,containerPort=5001 \
        --health-check-grace-period-seconds 300 \
        --deployment-controller ECS \
        --region $REGION
else
    log_info "Updating existing service..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition $TASK_DEFINITION_ARN \
        --force-new-deployment \
        --region $REGION
fi

# Step 10: Get Load Balancer DNS
log_step "Getting Load Balancer DNS Name..."
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names estathub-backend-alb \
    --region $REGION \
    --query LoadBalancers[0].DNSName \
    --output text)

# Cleanup temporary files
rm -f execution-role-trust-policy.json secrets-policy.json task-definition.json

log_info "✅ Deployment completed successfully!"
echo ""
echo "🌐 Load Balancer DNS: http://$ALB_DNS"
echo "📊 ECS Cluster: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services"
echo "🔐 Secrets Manager: https://console.aws.amazon.com/secretsmanager/home?region=$REGION#!/listSecrets"
echo ""
echo "📋 IMPORTANT NEXT STEPS:"
echo "1. Update secrets with real values in AWS Secrets Manager"
echo "2. Create RDS database instance"
echo "3. Update DATABASE_URL secret with real RDS connection string"
echo "4. Run database migrations: npx prisma migrate deploy"
echo "5. Test the service: curl http://$ALB_DNS/api/health"
echo ""
echo "🔧 Variables to update in Secrets Manager:"
echo "- estathub-db-url: postgresql://postgres:PASSWORD@RDS_HOST:5432/estathub_db"
echo "- estathub-jwt-secret: YOUR_SECURE_JWT_SECRET_32_CHARS"
echo "- estathub-aws-access-key: YOUR_AWS_ACCESS_KEY_ID"
echo "- estathub-aws-secret-key: YOUR_AWS_SECRET_ACCESS_KEY"
