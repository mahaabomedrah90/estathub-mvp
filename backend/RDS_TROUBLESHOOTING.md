# AWS RDS Connectivity Troubleshooting Guide

## Quick Diagnosis

1. **Test the debug endpoint:**
   ```bash
   curl -H "X-Debug-Token: YOUR_DEBUG_TOKEN" https://your-domain.com/api/_debug/db-ping
   ```

2. **Check CloudWatch logs for enhanced error messages:**
   - Look for `❌ [CRITICAL] Prisma DB Error` entries
   - Look for `❌ [DEBUG] Database ping failed` entries

## Common RDS Connection Issues & Fixes

### Issue 1: Security Group Blocking

**Symptoms:**
- `timeout`, `connection refused`, `ECONNREFUSED`
- `connect ETIMEDOUT`

**Fix:**
```bash
# 1. Get your ECS Task Security Group ID
aws ecs describe-services --cluster your-cluster --services your-service --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups'

# 2. Get your RDS Security Group ID  
aws rds describe-db-instances --db-instance-identifier your-db --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId'

# 3. Add inbound rule to RDS SG
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-security-group-id \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ecs-task-security-group-id

# Alternative: Add CIDR rule (less secure)
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-security-group-id \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16  # Your VPC CIDR
```

### Issue 2: Subnet/Route Table Misconfiguration

**Symptoms:**
- `ENI not found in subnet`
- `Network unreachable`

**Fix:**
```bash
# 1. Check if ECS and RDS are in compatible subnets
aws ecs describe-services --cluster your-cluster --services your-service --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets'

aws rds describe-db-instances --db-instance-identifier your-db --query 'DBInstances[0].DBSubnetGroup.Subnets[*].SubnetIdentifier'

# 2. Ensure subnets have routes to each other
aws ec2 describe-route-tables --filters Name=vpc-id,Values=vpc-xxxxxxx

# 3. If using private subnets, ensure NAT Gateway exists
aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=vpc-xxxxxxx
```

### Issue 3: VPC Endpoint Issues

**Symptoms:**
- DNS resolution failures
- Intermittent connections

**Fix:**
```bash
# 1. Check VPC endpoints for RDS
aws ec2 describe-vpc-endpoints --filters Name=service-name,Values=com.amazonaws.<region>.rds

# 2. Create RDS VPC endpoint if missing
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxx \
  --service-name com.amazonaws.<region>.rds \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-xxxxxxx subnet-yyyyyyy \
  --security-group-ids sg-xxxxxxx \
  --private-dns-enabled
```

### Issue 4: IAM Authentication Issues

**Symptoms:**
- `AccessDenied` 
- Authentication failures

**Fix:**
```bash
# 1. Check ECS task role
aws ecs describe-task-definition --task-definition your-task-def --query 'taskDefinition.taskRoleArn'

# 2. Ensure role has RDS permissions
aws iam attach-role-policy \
  --role-name your-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSDataFullAccess

# 3. For IAM database authentication, ensure:
# - RDS instance has IAM authentication enabled
# - Task role has rds-db:connect permission
```

## Environment Variable Checklist

```bash
# Required for production
DATABASE_URL=postgresql://username:password@host:port/database
DEBUG_TOKEN=your-secure-debug-token

# Alternative individual vars
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

## Testing Steps

1. **Deploy updated code** with enhanced logging
2. **Set DEBUG_TOKEN** environment variable in ECS
3. **Test debug endpoint** to isolate DB connectivity
4. **Check CloudWatch** for detailed error messages
5. **Apply appropriate fixes** based on error patterns

## Final Verdict Criteria

- **Code Bug**: If debug endpoint works but login fails → Application logic issue
- **RDS Connectivity**: If debug endpoint fails with connection errors → Infrastructure issue

## Emergency Rollback

If changes cause issues:
```bash
# Revert to previous task definition
aws ecs update-service --cluster your-cluster --service your-service --task-definition previous-task-def
```
