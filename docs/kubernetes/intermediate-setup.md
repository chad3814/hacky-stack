# Kubernetes Intermediate Setup Guide

This guide covers upgrading from the basic setup (external PostgreSQL) to the intermediate setup (PostgreSQL StatefulSet) for a more production-like environment.

## Overview

The intermediate setup introduces several advanced Kubernetes concepts:
- **StatefulSets** for stateful applications like databases
- **PersistentVolumes** for data persistence
- **Headless Services** for StatefulSet networking
- **Data migration** between database environments

## Architecture Comparison

### Basic Setup (Current)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │───▶│  Ingress         │───▶│  Service        │
│ hackystack.local│    │ (NGINX)          │    │ (ClusterIP)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┘
                       │
                       ▼
                ┌─────────────────┐    ┌─────────────────┐
                │  Pod 1          │    │  Pod 2          │
                │ hackystack:latest│    │ hackystack:latest│
                └─────────────────┘    └─────────────────┘
                       │                         │
                       └────────┬────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ External PostgreSQL │
                    └─────────────────────┘
```

### Intermediate Setup (Target)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │───▶│  Ingress         │───▶│  Service        │
│ hackystack.local│    │ (NGINX)          │    │ (ClusterIP)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┘
                       │
                       ▼
                ┌─────────────────┐    ┌─────────────────┐
                │  Pod 1          │    │  Pod 2          │
                │ hackystack:latest│    │ hackystack:latest│
                └─────────────────┘    └─────────────────┘
                       │                         │
                       └────────┬────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ PostgreSQL Service  │
                    │ (ClusterIP)         │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ PostgreSQL Pod      │
                    │ (StatefulSet)       │
                    │        │            │
                    │        ▼            │
                    │ PersistentVolume    │
                    └─────────────────────┘
```

## Prerequisites

### Before Starting
1. **Basic setup must be running** - Complete the basic setup first
2. **PostgreSQL client tools** - Install `postgresql-client` for backup/restore
3. **Stable external database** - Ensure your current database is accessible
4. **Backup strategy** - Understand that this involves data migration

### Verification
```bash
# Verify basic setup is running
kubectl get pods -n hackystack

# Verify application is accessible
curl -k https://hackystack.local/api/health

# Check current database connectivity
kubectl logs -l app=hackystack -n hackystack | grep -i database
```

## Migration Process

### Automated Migration

The simplest way to upgrade is using the automated migration script:

```bash
./scripts/k8s-upgrade-to-intermediate.sh
```

**What this script does:**
1. **Pre-migration validation** - Checks prerequisites and current setup
2. **Database backup** - Creates SQL dump of existing data
3. **Deploy PostgreSQL StatefulSet** - Creates persistent database in Kubernetes
4. **Data migration** - Restores backup to new PostgreSQL instance
5. **Configuration update** - Updates application to use new database
6. **Verification** - Tests that everything is working correctly

### Manual Migration (Educational)

For learning purposes, you can perform the migration manually:

#### Step 1: Backup Current Database

```bash
# Get current database URL
kubectl get secret hackystack-secrets -n hackystack -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Create backup
pg_dump "your-database-url" > hackystack-backup.sql
```

#### Step 2: Create Storage Resources

```bash
# Create storage directory on Minikube
minikube ssh 'sudo mkdir -p /mnt/data/postgresql && sudo chmod 777 /mnt/data/postgresql'

# Apply storage configuration
kubectl apply -f k8s/intermediate/persistent-volume.yaml
```

#### Step 3: Generate PostgreSQL Passwords

```bash
# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
APP_PASSWORD=$(openssl rand -base64 32)

# Base64 encode for Kubernetes Secret
POSTGRES_PASSWORD_B64=$(echo -n "$POSTGRES_PASSWORD" | base64)
APP_PASSWORD_B64=$(echo -n "$APP_PASSWORD" | base64)
DB_URL_B64=$(echo -n "postgresql://hackystack:$APP_PASSWORD@postgresql-service:5432/hackystack" | base64)
```

#### Step 4: Create PostgreSQL Secret

```bash
# Update secret template with generated values
sed -i "s|POSTGRES_PASSWORD: \"\"|POSTGRES_PASSWORD: \"$POSTGRES_PASSWORD_B64\"|g" k8s/intermediate/postgresql-secret.yaml
sed -i "s|POSTGRES_APP_PASSWORD: \"\"|POSTGRES_APP_PASSWORD: \"$APP_PASSWORD_B64\"|g" k8s/intermediate/postgresql-secret.yaml
sed -i "s|DATABASE_URL: \"\"|DATABASE_URL: \"$DB_URL_B64\"|g" k8s/intermediate/postgresql-secret.yaml

# Apply secret
kubectl apply -f k8s/intermediate/postgresql-secret.yaml
```

#### Step 5: Deploy PostgreSQL

```bash
# Deploy in order (dependencies first)
kubectl apply -f k8s/intermediate/postgresql-configmap.yaml
kubectl apply -f k8s/intermediate/postgresql-service.yaml
kubectl apply -f k8s/intermediate/postgresql-statefulset.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready --timeout=300s pod/postgresql-0 -n hackystack
```

#### Step 6: Restore Data

```bash
# Copy backup to PostgreSQL pod
kubectl cp hackystack-backup.sql hackystack/postgresql-0:/tmp/backup.sql

# Restore data
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -f /tmp/backup.sql

# Clean up backup file
kubectl exec postgresql-0 -n hackystack -- rm /tmp/backup.sql
```

#### Step 7: Update Application Configuration

```bash
# Get new DATABASE_URL from PostgreSQL secret
NEW_DB_URL=$(kubectl get secret postgresql-secret -n hackystack -o jsonpath='{.data.DATABASE_URL}')

# Update application secret
kubectl patch secret hackystack-secrets -n hackystack -p "{\"data\":{\"DATABASE_URL\":\"$NEW_DB_URL\"}}"

# Restart application
kubectl rollout restart deployment/hackystack-app -n hackystack
kubectl rollout status deployment/hackystack-app -n hackystack
```

## StatefulSet Concepts Explained

### What is a StatefulSet?

StatefulSets are designed for stateful applications that need:
- **Stable network identities** - Pods get consistent names (postgresql-0, postgresql-1, etc.)
- **Persistent storage** - Each pod gets its own PersistentVolumeClaim
- **Ordered operations** - Pods are created, scaled, and deleted in order

### Key Differences from Deployments

| Aspect | Deployment | StatefulSet |
|--------|------------|-------------|
| Pod naming | Random suffixes | Ordered indices (0, 1, 2...) |
| Storage | Shared or ephemeral | Individual persistent volumes |
| Scaling | Parallel | Sequential |
| Network identity | Dynamic | Stable |
| Use case | Stateless apps | Databases, queues |

### PostgreSQL StatefulSet Configuration

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: postgresql-headless  # Required for StatefulSet
  replicas: 1
  volumeClaimTemplates:  # Creates PVC for each pod
  - metadata:
      name: postgresql-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: local-storage
      resources:
        requests:
          storage: 10Gi
```

### Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql-headless
spec:
  clusterIP: None  # Makes it headless
  selector:
    app: postgresql
```

**Why headless?** StatefulSets require headless services to provide stable network identities. The headless service creates DNS records for each pod (postgresql-0.postgresql-headless.hackystack.svc.cluster.local).

## Persistent Storage Deep Dive

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Minikube Node                            │
│                                                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐   │
│  │ PostgreSQL Pod  │      │     Host Directory          │   │
│  │                 │      │   /mnt/data/postgresql      │   │
│  │ Container       │◄────▶│                             │   │
│  │ /var/lib/       │      │  ┌─────────────────────┐    │   │
│  │ postgresql/data │      │  │   Database Files    │    │   │
│  │                 │      │  │   - WAL logs        │    │   │
│  └─────────────────┘      │  │   - Data files      │    │   │
│                           │  │   - Config files    │    │   │
│                           │  └─────────────────────┘    │   │
│                           └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### PersistentVolume (PV)

- **Cluster-wide resource** that represents storage
- **Independent lifecycle** from pods
- **Reclaim policies**: Retain, Delete, Recycle

### PersistentVolumeClaim (PVC)

- **Namespace-scoped request** for storage
- **Binds to available PV** that meets requirements
- **Used by pods** to access storage

### StorageClass

- **Defines storage types** and provisioning parameters
- **Dynamic provisioning** (cloud) vs **static provisioning** (local)
- **Volume binding modes**: Immediate vs WaitForFirstConsumer

## Database Management

### Connecting to PostgreSQL

```bash
# Interactive connection
kubectl exec -it postgresql-0 -n hackystack -- psql -U hackystack -d hackystack

# Run single command
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT version();"

# Port forward for external tools
kubectl port-forward postgresql-0 5432:5432 -n hackystack
# Then connect with: psql -h localhost -U hackystack -d hackystack
```

### Database Operations

```bash
# Create backup
kubectl exec postgresql-0 -n hackystack -- pg_dump -U hackystack hackystack > backup.sql

# Restore backup
kubectl cp backup.sql hackystack/postgresql-0:/tmp/backup.sql
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -f /tmp/backup.sql

# View database size
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT pg_size_pretty(pg_database_size('hackystack'));"

# List tables
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "\dt"
```

### Performance Monitoring

```bash
# Check active connections
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT count(*) FROM pg_stat_activity;"

# View slow queries
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT query, query_start, state FROM pg_stat_activity WHERE state = 'active';"

# Database statistics
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT schemaname,relname,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables;"
```

## Backup and Recovery

### Automated Backup Strategy

Create a backup CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: hackystack
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgresql-service -U hackystack -d hackystack > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
              # Keep only last 7 backups
              ls -t /backup/backup-*.sql | tail -n +8 | xargs rm -f
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: POSTGRES_APP_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Point-in-Time Recovery

PostgreSQL supports Write-Ahead Logging (WAL) for point-in-time recovery:

```yaml
# Add to StatefulSet container env
- name: POSTGRES_INITDB_ARGS
  value: "--wal-level=replica --archive-mode=on --archive-command='cp %p /var/lib/postgresql/wal_archive/%f'"
```

## Troubleshooting

### StatefulSet Issues

```bash
# Check StatefulSet status
kubectl get statefulset -n hackystack
kubectl describe statefulset postgresql -n hackystack

# Check PVC binding
kubectl get pvc -n hackystack
kubectl describe pvc postgresql-data-postgresql-0 -n hackystack

# Check PV availability
kubectl get pv
kubectl describe pv postgresql-pv
```

### Storage Issues

```bash
# Check storage directory on Minikube
minikube ssh 'ls -la /mnt/data/postgresql'

# Check disk usage
minikube ssh 'df -h /mnt/data'

# Storage permissions
minikube ssh 'sudo chown -R 999:999 /mnt/data/postgresql'
```

### Database Connectivity

```bash
# Test from application pod
kubectl exec -it <app-pod> -n hackystack -- nc -zv postgresql-service 5432

# Check PostgreSQL logs
kubectl logs postgresql-0 -n hackystack -f

# Check PostgreSQL configuration
kubectl exec postgresql-0 -n hackystack -- cat /etc/postgresql/postgresql.conf
```

## Scaling Considerations

### Single Instance (Current)
- **Pros**: Simple, consistent, good for development
- **Cons**: Single point of failure, no read replicas

### Multiple Replicas (Advanced)
For production-like setups, consider:
- **Primary-Replica setup** with read/write splitting
- **Automated failover** with tools like Patroni
- **Load balancing** between read replicas

```yaml
# Example: 3-replica setup
spec:
  replicas: 3
  # Additional configuration for replication needed
```

## Performance Optimization

### Resource Allocation

```yaml
resources:
  requests:
    cpu: 500m      # Minimum guaranteed
    memory: 512Mi
  limits:
    cpu: 2000m     # Maximum allowed
    memory: 2Gi
```

### PostgreSQL Configuration

Key parameters to tune:

```conf
# Memory settings
shared_buffers = 256MB          # 25% of available memory
effective_cache_size = 1GB      # 75% of available memory
work_mem = 8MB                  # Per-query memory

# Connection settings
max_connections = 200           # Based on expected load

# Checkpoint settings
checkpoint_completion_target = 0.9
checkpoint_timeout = 10min
```

## Security Hardening

### Pod Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 999          # postgres user
  runAsGroup: 999         # postgres group
  fsGroup: 999
  seccompProfile:
    type: RuntimeDefault
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgresql-netpol
  namespace: hackystack
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: hackystack
    ports:
    - protocol: TCP
      port: 5432
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Resource Usage**: CPU, Memory, Disk I/O
2. **Database Metrics**: Connections, query performance, replication lag
3. **Storage Metrics**: Disk usage, I/O latency
4. **Application Metrics**: Response times, error rates

### Using Management Script

```bash
# Monitor resources
./scripts/k8s-manage.sh
# Select option 9: Resource Usage
```

## Next Steps

After completing the intermediate setup:

1. **Explore monitoring tools** like Prometheus and Grafana
2. **Learn about Helm** for package management
3. **Study operators** for automated database management
4. **Practice disaster recovery** scenarios
5. **Implement CI/CD pipelines** for automated deployments

## Additional Resources

- [StatefulSets Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Persistent Volumes Documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [PostgreSQL on Kubernetes Best Practices](https://postgresql.org/docs/current/)
- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)

Congratulations! You now have a production-like database setup running entirely within Kubernetes. This intermediate setup provides a solid foundation for understanding how stateful applications work in Kubernetes environments.