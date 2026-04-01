ALWSM Production Deployment Runbook

Environment: AWS (eu-central-1)
Architecture:

Backend → ECS Fargate

Database → RDS PostgreSQL (Private in VPC)

Frontend → S3 + CloudFront

Secrets → AWS SSM Parameter Store

🔐 0. Environment Variables (Set Once Per Session)
export AWS_PAGER=""
export REGION="eu-central-1"

# ECS
export CLUSTER="estathub-backend-cluster1"
export SERVICE="alwsm-clean-backend-svc"
export TASK_FAMILY="estathub-backend-task"

# Network
export SUBNET1="subnet-095e6a02cbf2d0aea"
export SUBNET2="subnet-0f1dc215dde7fe398"
export ECS_SG="sg-0f1cd02e52b154e6c"

# Logs
export LOG_GROUP="/ecs/estathub-backend-task"

# RDS
export DB_ID="alwsm-db-1"
export DB_ENDPOINT="alwsm-db-1.c9w4q020yq0g.eu-central-1.rds.amazonaws.com"
export DB_NAME="estathub_db"
export DB_USER="estathub_user"

# SSM Parameter
export DB_PARAM="/alwsm/prod/DATABASE_URL"

# AWS Account
export AWS_ACCOUNT_ID="101143944706"
🧠 1. Backend Deployment (ECS + ECR)
✅ STEP 1 — Pre-Deployment Validation
1.1 Confirm RDS is Available
aws rds describe-db-instances \
  --region "$REGION" \
  --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

Expected:

available
1.2 Confirm DATABASE_URL in SSM
aws ssm get-parameter \
  --region "$REGION" \
  --name "$DB_PARAM" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text

Expected format:

postgresql://estathub_user:<PASSWORD>@alwsm-db-1...:5432/estathub_db?schema=public

⚠️ Never hardcode DATABASE_URL inside task definition.

1.3 Confirm ECS Task Uses SSM Secret
aws ecs describe-task-definition \
  --region "$REGION" \
  --task-definition "$TASK_FAMILY:34" \
  --query 'taskDefinition.containerDefinitions[?name==`backend`].secrets'

Expected:

[
  {
    "name": "DATABASE_URL",
    "valueFrom": "/alwsm/prod/DATABASE_URL"
  }
]
🐳 2. Build & Push Backend (ONLY if code changed)

⚠️ Required only when backend code changes.
Not required for DB password updates.

2.1 Login to ECR
aws ecr get-login-password --region "$REGION" | \
docker login --username AWS --password-stdin \
"$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
2.2 Build + Tag
IMAGE_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/estathub-backend"
TAG="prod-$(date +%Y%m%d-%H%M)"

docker build -t estathub-backend:$TAG .
docker tag estathub-backend:$TAG $IMAGE_REPO:$TAG
2.3 Push Image
docker push $IMAGE_REPO:$TAG
🧾 3. Register New Task Definition
3.1 Export Current Task Definition
CUR_TD=$(aws ecs describe-services \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --query 'services[0].taskDefinition' \
  --output text)

aws ecs describe-task-definition \
  --region "$REGION" \
  --task-definition "$CUR_TD" \
  --query 'taskDefinition' \
  --output json > taskdef.json
3.2 Update Image
jq --arg IMG "$IMAGE_REPO:$TAG" '
  .containerDefinitions |= map(
    if .name=="backend" then .image=$IMG else . end
  )
' taskdef.json > taskdef.tmp.json
3.3 Clean JSON
jq '
  del(
    .taskDefinitionArn,
    .revision,
    .status,
    .requiresAttributes,
    .compatibilities,
    .registeredAt,
    .registeredBy
  )
' taskdef.tmp.json > taskdef.clean.json

jq 'walk(if type=="object" then with_entries(select(.value != null)) else . end)' \
  taskdef.clean.json > taskdef.register.json
3.4 Register
NEW_TD=$(aws ecs register-task-definition \
  --region "$REGION" \
  --cli-input-json file://taskdef.register.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
🔄 4. Deploy Service
aws ecs update-service \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$NEW_TD" \
  --force-new-deployment

aws ecs wait services-stable \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --services "$SERVICE"
🗄 5. Prisma Migration (CRITICAL After DB Change)
aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --task-definition "$NEW_TD" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["sh","-lc","npx prisma migrate deploy"]}]}'

Monitor logs:

aws logs tail "$LOG_GROUP" --region "$REGION" --since 10m --follow
🌐 6. Frontend Deployment (S3 + CloudFront)
6.1 Build Frontend
npm ci
npm run build
6.2 Upload to S3
BUCKET="s3://alwsm-frontend-prodv01"
aws s3 sync dist/ "$BUCKET" --delete --region "$REGION"
6.3 CloudFront Invalidation
DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"
🧪 7. Post-Deployment Validation
Backend Health
curl -i https://alwsm.sa/api/health
Login Test
curl -i https://alwsm.sa/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"user@example.com","password":"***"}'
Register Test
curl -i https://alwsm.sa/api/auth/register \
  -H 'Content-Type: application/json' \
  --data '{
    "fullName":"Test User",
    "email":"user@example.com",
    "phoneNumber":"0530000000",
    "nationalId":"1234567890",
    "password":"StrongPass123!",
    "confirmPassword":"StrongPass123!",
    "termsAccepted":true
  }'
⚠️ Important Production Notes

DATABASE_URL must always come from SSM.

RDS is private — never test via local psql.

After DB reset → always run prisma migrate deploy.

If using CloudFront → backend must include:

app.set('trust proxy', 1);

Always invalidate CloudFront after frontend deploy.

Never store secrets inside code or Git.

✅ Production Architecture (Final State)

RDS inside ECS VPC

ECS reads DATABASE_URL from SSM

No .env file in container

Prisma migrations deployed

CloudFront in front of backend

Security Groups allow ECS → RDS (5432)