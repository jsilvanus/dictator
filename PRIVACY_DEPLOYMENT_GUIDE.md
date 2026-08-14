# Privacy Features Deployment Guide

This guide explains how to deploy Dictator with privacy-first architecture enabled.

## Pre-Deployment Checklist

- [ ] All environment variables configured (see `.env.example`)
- [ ] Database migrations applied (`npm run db:push`)
- [ ] Encryption keys generated and stored securely
- [ ] CRON_SECRET configured for cleanup jobs
- [ ] Email service configured (for deletion confirmations)
- [ ] TLS/HTTPS certificate configured for production
- [ ] Backup strategy defined and tested
- [ ] Data retention policies documented
- [ ] Privacy policy and terms of service written
- [ ] GDPR impact assessment completed (if applicable)

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t dictator:latest .
```

### 2. Docker Compose with Privacy Services

```yaml
# docker-compose.yml
version: '3.8'

services:
  dictator:
    image: dictator:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://dictator:${DB_PASSWORD}@postgres:5432/dictator
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - TELEMETRY_SERVER_SECRET=${TELEMETRY_SERVER_SECRET}
      - CRON_SECRET=${CRON_SECRET}
      - ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_TELEMETRY_ENABLED=false
      - ENABLE_AUDIT_LOGGING=true
      - ENABLE_EPHEMERAL_CLEANUP=true
      - STRICT_GDPR_MODE=${STRICT_GDPR_MODE:-false}
    depends_on:
      - postgres
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=dictator
      - POSTGRES_USER=dictator
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Optional: Cleanup job runner
  cleanup-job:
    image: curlimages/curl:latest
    command: |
      /bin/sh -c 'while true; do
        curl -X POST \
          -H "X-Cron-Secret: ${CRON_SECRET}" \
          http://dictator:3000/api/admin/jobs/cleanup-ephemeral;
        sleep 3600;
      done'
    depends_on:
      - dictator
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. Run Deployment

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Start services
docker-compose up -d

# Run migrations
docker-compose exec dictator npm run db:push

# Verify health
docker-compose exec dictator curl http://localhost:3000/api/health
```

## Kubernetes Deployment

### 1. ConfigMap for Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dictator-config
  namespace: dictator
data:
  LOG_LEVEL: "info"
  SANITIZE_LOGS: "true"
  NEXT_PUBLIC_TELEMETRY_ENABLED: "false"
  ENABLE_AUDIT_LOGGING: "true"
  ENABLE_EPHEMERAL_CLEANUP: "true"
  CLEANUP_INTERVAL_MINUTES: "60"
  STRICT_GDPR_MODE: "false"
```

### 2. Secrets for Sensitive Data

```bash
# Create namespace
kubectl create namespace dictator

# Create secrets
kubectl create secret generic dictator-secrets \
  --from-literal=nextauth-secret=$(openssl rand -base64 32) \
  --from-literal=telemetry-secret=$(openssl rand -base64 32) \
  --from-literal=cron-secret=$(openssl rand -base64 32) \
  --from-literal=encryption-key=$(openssl rand -base64 32) \
  --from-literal=database-url="postgresql://..." \
  --from-literal=anthropic-api-key="sk-ant-..." \
  -n dictator
```

### 3. Database StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dictator-postgres
  namespace: dictator
spec:
  serviceName: dictator-postgres
  replicas: 1
  selector:
    matchLabels:
      app: dictator-postgres
  template:
    metadata:
      labels:
        app: dictator-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_DB
          value: dictator
        - name: POSTGRES_USER
          value: dictator
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
```

### 4. Application Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dictator-app
  namespace: dictator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dictator-app
  template:
    metadata:
      labels:
        app: dictator-app
    spec:
      containers:
      - name: dictator
        image: dictator:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: nextauth-secret
        - name: NEXTAUTH_URL
          value: https://dictator.example.com
        - name: TELEMETRY_SERVER_SECRET
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: telemetry-secret
        - name: CRON_SECRET
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: cron-secret
        - name: ENCRYPTION_MASTER_KEY
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: encryption-key
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: dictator-secrets
              key: anthropic-api-key
        envFrom:
        - configMapRef:
            name: dictator-config
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

### 5. CronJob for Cleanup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dictator-cleanup
  namespace: dictator
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: dictator-job
          containers:
          - name: cleanup
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST \
                -H "X-Cron-Secret: $CRON_SECRET" \
                http://dictator-app:3000/api/admin/jobs/cleanup-ephemeral
            env:
            - name: CRON_SECRET
              valueFrom:
                secretKeyRef:
                  name: dictator-secrets
                  key: cron-secret
          restartPolicy: OnFailure
```

### 6. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace dictator

# Create secrets (see above)
kubectl create secret generic dictator-secrets ...

# Apply ConfigMap
kubectl apply -f configmap.yaml

# Apply database
kubectl apply -f postgres-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=dictator-postgres -n dictator --timeout=300s

# Run migrations
kubectl exec -it dictator-postgres-0 -n dictator -- psql -U dictator -d dictator -f /path/to/migrations.sql

# Apply application
kubectl apply -f deployment.yaml
kubectl apply -f cronjob.yaml

# Verify deployment
kubectl get pods -n dictator
kubectl logs -f deployment/dictator-app -n dictator
```

## Monitoring & Logging

### 1. Structured Logging

```typescript
// lib/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const sanitizeLogs = process.env.SANITIZE_LOGS === 'true';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: sanitizeLogs ? {
    paths: [
      '*.password',
      '*.apiKey',
      '*.secret',
      '*.token',
      'user.email',
      'user.name',
      'documentContent',
      'prompt',
      'response',
    ],
  } : undefined,
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  } : undefined,
});
```

### 2. Key Metrics to Monitor

```typescript
// Privacy-specific metrics
- audit_log_entries_total (counter)
- sensitive_data_detections_total (counter)
- ai_requests_with_redaction_total (counter)
- ephemeral_cleanup_job_duration (histogram)
- deletion_requests_total (counter)
- data_export_requests_total (counter)
- privacy_settings_updates_total (counter)
```

### 3. Example Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dictator'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### 4. Grafana Dashboard

Create dashboards to visualize:
- Privacy audit log activity
- Sensitive data detections over time
- Cleanup job execution times
- Account deletion requests
- Data export activity
- User privacy settings adoption

## Compliance & Auditing

### 1. Data Retention Policy

```typescript
// Define in environment
DEFAULT_DATA_RETENTION_DAYS=30  // AI sessions deleted after 30 days
BACKUP_RETENTION_DAYS=90        // Backups kept for 90 days
AUDIT_LOG_RETENTION_DAYS=365    // Audit logs kept for 1 year
```

### 2. Regular Audits

```bash
# Export audit log for compliance review
psql dictator -c "SELECT * FROM privacy_audit_log WHERE timestamp > NOW() - INTERVAL '7 days' ORDER BY timestamp DESC;" > audit-report-$(date +%Y-%m-%d).csv

# Verify encryption keys are secure
kubectl get secret dictator-secrets -o jsonpath="{.data.encryption-key}" | wc -c

# Check for orphaned data (old sessions/documents)
psql dictator -c "SELECT COUNT(*) FROM ai_turns WHERE created_at < NOW() - INTERVAL '90 days';"
```

### 3. Compliance Checklist (GDPR)

- [ ] Privacy notice/policy displayed to users
- [ ] Explicit consent collected before data processing
- [ ] Data processing documented and logged
- [ ] Data retention policies enforced
- [ ] User export functionality working
- [ ] User deletion functionality working
- [ ] Data breach response plan in place
- [ ] Privacy impact assessment completed
- [ ] Third-party processor agreements signed
- [ ] DPA (Data Processing Agreement) in place

## Backup & Disaster Recovery

### 1. Database Backup

```bash
# Daily backup
0 2 * * * pg_dump ******db:5432/dictator | gzip > /backups/dictator-$(date +%Y-%m-%d).sql.gz

# Verify backup
gunzip -c dictator-2024-08-13.sql.gz | psql -U dictator -d dictator_test

# Retention policy
find /backups -name "dictator-*.sql.gz" -mtime +90 -delete
```

### 2. Encryption Key Backup

```bash
# Backup encryption master key to secure location
# WARNING: Key is stored encrypted in AWS Secrets Manager / Azure Key Vault
# Never backup unencrypted keys to regular storage

# Verify you can recover from backup
aws secretsmanager get-secret-value --secret-id dictator/encryption-master-key
```

### 3. Recovery Testing

```bash
# Monthly test recovery procedure
1. Restore database from backup
2. Restore encryption keys from secret manager
3. Verify application can decrypt stored data
4. Check all users can still access their documents
5. Verify audit logs are intact
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl http://localhost:3000/api/health
# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "telemetry": "enabled",
#   "encryption": "enabled",
#   "privacy": {"auditLogging": true}
# }
```

### 2. Privacy Features Check

```bash
# Test sensitive data detection
curl -X POST http://localhost:3000/api/ai/privacy/check-sensitive \
  -H "Content-Type: application/json" \
  -d '{"content": "My credit card is 4111-1111-1111-1111"}'

# Test provider policies
curl http://localhost:3000/api/ai/privacy/policies

# Test cleanup job
curl -X POST \
  -H "X-Cron-Secret: your-cron-secret" \
  http://localhost:3000/api/admin/jobs/cleanup-ephemeral
```

### 3. Security Scanning

```bash
# Scan for secrets in environment
npm run check-secrets

# Scan dependencies for vulnerabilities
npm audit

# Check logs don't contain sensitive data
grep -E "(password|token|key|secret)" /app/logs/*.log
```

## Rollback Procedure

If critical privacy feature breaks:

```bash
1. Immediately disable affected feature via feature flag
2. Revert database migration if applicable
3. Investigate issue
4. Create fix with security review
5. Re-enable feature after verification
6. Document incident in audit log
```

## Security Hardening

### 1. Network Security

```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dictator-network-policy
spec:
  podSelector:
    matchLabels:
      app: dictator-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: dictator-postgres
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

### 2. Pod Security Policy

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: dictator-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'MustRunAs'
    seLinuxOptions:
      level: 's0:c123,c456'
```

### 3. TLS/HTTPS

```bash
# Generate self-signed cert for testing
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# In production, use Let's Encrypt with cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## Support & Troubleshooting

See **PRIVACY_INTEGRATION_GUIDE.md** for common issues and solutions.

Contact: privacy@dictator.app
