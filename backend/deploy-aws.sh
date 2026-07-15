#!/bin/bash

# AWS Deployment Script for Estathub Backend
# =============================================

echo "🚀 Starting AWS Deployment for Estathub Backend"
echo "=============================================="

# Configuration
APP_NAME="estathub-backend"
AWS_REGION="us-east-1"
ECR_REPO="$AWS_REGION.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
fi

# Step 1: Build the application
log_info "Building the application..."
npm run build
if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi

# Step 2: Login to AWS ECR
log_info "Logging into AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
if [ $? -ne 0 ]; then
    log_error "ECR login failed"
    exit 1
fi

# Step 3: Create ECR repository if it doesn't exist
log_info "Checking/Creating ECR repository..."
aws ecr describe-repositories --repository-names $APP_NAME --region $AWS_REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
    log_warn "Repository does not exist. Creating it..."
    aws ecr create-repository --repository-name $APP_NAME --region $AWS_REGION
    if [ $? -ne 0 ]; then
        log_error "Failed to create ECR repository"
        exit 1
    fi
fi

# Step 4: Build Docker image
log_info "Building Docker image..."
docker build -t $APP_NAME .
if [ $? -ne 0 ]; then
    log_error "Docker build failed"
    exit 1
fi

# Step 5: Tag Docker image
log_info "Tagging Docker image..."
docker tag $APP_NAME:latest $ECR_REPO:latest
if [ $? -ne 0 ]; then
    log_error "Docker tag failed"
    exit 1
fi

# Step 6: Push Docker image to ECR
log_info "Pushing Docker image to ECR..."
docker push $ECR_REPO:latest
if [ $? -ne 0 ]; then
    log_error "Docker push failed"
    exit 1
fi

# Step 7: Update ECS service (if using ECS)
if command -v ecs &> /dev/null; then
    log_info "Updating ECS service..."
    # Update the service with the new image
    aws ecs update-service --cluster estathub-cluster --service estathub-backend --force-new-deployment --region $AWS_REGION
    if [ $? -ne 0 ]; then
        log_warn "ECS update failed. You may need to update manually."
    fi
fi

# Step 8: Run database migrations
log_info "Running database migrations..."
if [ -n "$DATABASE_URL" ]; then
    npx prisma migrate deploy
    if [ $? -ne 0 ]; then
        log_error "Database migration failed"
        exit 1
    fi
else
    log_warn "DATABASE_URL not set. Skipping migrations."
fi

log_info "✅ Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify the service is running: aws ecs describe-services --cluster estathub-cluster --services estathub-backend --region $AWS_REGION"
echo "2. Check logs: aws logs tail /ecs/estathub-backend --follow --region $AWS_REGION"
echo "3. Test the service: curl https://your-domain.com/api/health"
echo ""
echo "🔧 Environment Variables to set in AWS:"
echo "- NODE_ENV=production"
echo "- DATABASE_URL=your-production-db-url"
echo "- JWT_SECRET=your-secure-jwt-secret"
echo "- AWS_ACCESS_KEY_ID=your-aws-access-key"
echo "- AWS_SECRET_ACCESS_KEY=your-aws-secret-key"
echo "- EMAIL_FROM=noreply@alwsm.sa"
echo "- FRONTEND_URL=https://alwsm.sa"
echo "- CORS_ORIGIN=https://alwsm.sa"
