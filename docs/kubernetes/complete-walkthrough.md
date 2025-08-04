# Complete Kubernetes Walkthrough

This comprehensive guide walks you through the entire Hacky Stack Kubernetes journey from initial setup to advanced StatefulSet deployment.

## Overview

This walkthrough combines all phases of the Kubernetes implementation:
1. **Basic Setup** - External PostgreSQL with core Kubernetes resources
2. **Intermediate Setup** - StatefulSet PostgreSQL with persistent storage
3. **Management & Operations** - Ongoing maintenance and monitoring

**Time Investment:** 2-4 hours for complete walkthrough  
**Prerequisites:** Docker, basic command line familiarity  
**Learning Outcome:** Production-ready Kubernetes deployment skills

## Phase 1: Environment Setup (30 minutes)

### Step 1: Verify Prerequisites

```bash
# Check required tools
docker --version          # Should be 20.10+
minikube version          # Should be 1.25+
kubectl version --client  # Should be 1.24+

# Check system resources
free -h                   # At least 4GB available RAM
df -h                     # At least 10GB available disk
```

### Step 2: Clone and Prepare Project

```bash
# Navigate to project directory
cd /path/to/hacky-stack

# Verify project structure
ls -la k8s/basic/         # Should contain YAML manifests
ls -la scripts/           # Should contain executable scripts
ls -la docs/kubernetes/   # Should contain documentation
```

### Step 3: Initialize Kubernetes Cluster

```bash
# Run the setup script
./scripts/k8s-setup.sh

# Follow interactive prompts:
# - Resource allocation (CPU: 2-4 cores, Memory: 4-8GB)
# - Driver selection (Docker recommended)
# - DNS configuration confirmation

# Expected output:
# ✅ Minikube started successfully
# ✅ Ingress addon enabled
# ✅ TLS certificate generated
# ✅ DNS configured
```

**What happens during setup:**
- Minikube cluster starts with specified resources
- NGINX ingress controller is installed
- Self-signed TLS certificate is generated
- `hackystack.local` is added to `/etc/hosts`

### Step 4: Verify Cluster Health

```bash
# Check cluster status
kubectl cluster-info
kubectl get nodes
kubectl get pods -A

# Verify ingress controller
kubectl get pods -n ingress-nginx

# Test DNS resolution
nslookup hackystack.local
```

## Phase 2: Basic Deployment (45 minutes)

### Step 5: Prepare Application Image

```bash
# Build Docker image
docker build -t hackystack:latest .

# Load image into Minikube
minikube image load hackystack:latest

# Verify image is loaded
minikube image ls | grep hackystack
```

### Step 6: Configure External Database

Before deployment, ensure you have a PostgreSQL database accessible from Kubernetes. Options:

**Option A: Local PostgreSQL**
```bash
# Start local PostgreSQL (macOS with Homebrew)
brew services start postgresql
createdb hackystack

# Connection string format:
# postgresql://username:password@host.docker.internal:5432/hackystack
```

**Option B: Docker PostgreSQL**
```bash
# Run PostgreSQL in Docker
docker run -d \
  --name postgres-hackystack \
  -e POSTGRES_DB=hackystack \
  -e POSTGRES_USER=hackystack \
  -e POSTGRES_PASSWORD=hackystack \
  -p 5432:5432 \
  postgres:15-alpine

# Connection string:
# postgresql://hackystack:hackystack@$(minikube ip):5432/hackystack
```

**Option C: Cloud Database**
Use any cloud PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)

### Step 7: Deploy Application

```bash
# Run deployment script
./scripts/k8s-deploy.sh

# Interactive configuration:
# 1. NextAuth.js secret (auto-generated if empty)
# 2. NextAuth.js URL (default: https://hackystack.local)
# 3. GitHub OAuth credentials:
#    - Go to https://github.com/settings/applications/new
#    - Application name: Hacky Stack Local
#    - Homepage URL: https://hackystack.local
#    - Callback URL: https://hackystack.local/api/auth/callback/github
# 4. Database URL (from Step 6)
```

**Expected deployment flow:**
1. Docker image built and loaded ✅
2. Environment variables collected ✅
3. Namespace created ✅
4. ConfigMap and Secret created ✅
5. TLS certificate applied ✅
6. Application deployed ✅
7. Pods become ready ✅
8. External connectivity verified ✅

### Step 8: Verify Basic Deployment

```bash
# Check pod status
kubectl get pods -n hackystack

# Expected output:
# NAME                            READY   STATUS    RESTARTS   AGE
# hackystack-app-xxxxxxxxx-xxxxx  1/1     Running   0          2m
# hackystack-app-xxxxxxxxx-xxxxx  1/1     Running   0          2m

# Check service
kubectl get svc -n hackystack

# Check ingress
kubectl get ingress -n hackystack

# Test application
curl -k https://hackystack.local/api/health
# Expected: {"status":"ok"}
```

### Step 9: Access Application

1. **Open browser** to `https://hackystack.local`
2. **Accept security warning** (self-signed certificate)
3. **Test authentication** with GitHub OAuth
4. **Verify functionality** - Create/read operations should work

## Phase 3: Operations and Management (30 minutes)

### Step 10: Explore Management Interface

```bash
# Launch management script
./scripts/k8s-manage.sh

# Try different options:
# 1. Status Overview - See all resources
# 2. View Logs - Real-time application logs
# 3. Scale Application - Change replica count
# 9. Resource Usage - Monitor CPU/memory
```

### Step 11: Practice Common Operations

**Scaling:**
```bash
# Scale up
kubectl scale deployment hackystack-app --replicas=3 -n hackystack

# Watch scaling
kubectl get pods -n hackystack -w

# Scale back down
kubectl scale deployment hackystack-app --replicas=2 -n hackystack
```

**Configuration Updates:**
```bash
# Edit ConfigMap
kubectl edit configmap hackystack-config -n hackystack

# Restart deployment to pick up changes
kubectl rollout restart deployment/hackystack-app -n hackystack

# Watch rollout
kubectl rollout status deployment/hackystack-app -n hackystack
```

**Troubleshooting:**
```bash
# View logs
kubectl logs -l app=hackystack -n hackystack -f

# Describe pod for events
kubectl describe pods -l app=hackystack -n hackystack

# Check resource usage (if metrics-server available)
kubectl top pods -n hackystack
```

### Step 12: Test Resilience

```bash
# Delete a pod (should be recreated automatically)
kubectl delete pod -l app=hackystack -n hackystack | head -1

# Watch pod recreation
kubectl get pods -n hackystack -w

# Verify application still works
curl -k https://hackystack.local/api/health
```

## Phase 4: Intermediate Setup Migration (60 minutes)

### Step 13: Backup Current State

```bash
# Create backup directory
mkdir -p ~/hackystack-backup

# Backup current configuration
kubectl get all -n hackystack -o yaml > ~/hackystack-backup/basic-setup.yaml

# Export current database (if using local PostgreSQL)
pg_dump "your-database-url" > ~/hackystack-backup/database-backup.sql
```

### Step 14: Run Migration Script

```bash
# Execute upgrade script
./scripts/k8s-upgrade-to-intermediate.sh

# Migration process:
# 1. Prerequisites check ✅
# 2. Database backup creation ✅
# 3. PostgreSQL StatefulSet deployment ✅
# 4. Data migration ✅
# 5. Application configuration update ✅
# 6. Health verification ✅
```

**Migration timeline:**
- Backup: 2-5 minutes
- PostgreSQL deployment: 3-5 minutes
- Data restoration: 1-3 minutes (depends on data size)
- Application restart: 1-2 minutes

### Step 15: Verify Intermediate Setup

```bash
# Check StatefulSet
kubectl get statefulset -n hackystack
kubectl get pods -n hackystack

# Expected new resources:
# postgresql-0                    1/1     Running   0          5m
# hackystack-app-xxxxxxxxx-xxxxx  1/1     Running   0          2m
# hackystack-app-xxxxxxxxx-xxxxx  1/1     Running   0          2m

# Check persistent storage
kubectl get pv
kubectl get pvc -n hackystack

# Test database connectivity
kubectl exec postgresql-0 -n hackystack -- pg_isready -U hackystack -d hackystack

# Verify application works with new database
curl -k https://hackystack.local/api/health
```

### Step 16: Explore StatefulSet Features

```bash
# Connect to PostgreSQL directly
kubectl exec -it postgresql-0 -n hackystack -- psql -U hackystack -d hackystack

# Inside PostgreSQL:
\l                    # List databases
\dt                   # List tables
SELECT version();     # Check PostgreSQL version
\q                    # Quit

# Check persistent volume contents
kubectl exec postgresql-0 -n hackystack -- ls -la /var/lib/postgresql/data/

# Test data persistence by deleting and recreating pod
kubectl delete pod postgresql-0 -n hackystack
kubectl get pods -n hackystack -w
# Data should remain after pod recreation
```

## Phase 5: Advanced Operations (45 minutes)

### Step 17: Performance Testing

```bash
# Install hey for load testing (macOS)
brew install hey

# Or use curl in a loop
for i in {1..100}; do
  curl -k -s https://hackystack.local/api/health > /dev/null
  echo "Request $i completed"
done

# Monitor resource usage during load
kubectl top pods -n hackystack
```

### Step 18: Database Operations

```bash
# Create manual database backup
kubectl exec postgresql-0 -n hackystack -- pg_dump -U hackystack hackystack > backup-$(date +%Y%m%d).sql

# Copy backup out of cluster
kubectl cp hackystack/postgresql-0:/tmp/backup.sql ./backup-external.sql

# Monitor database performance
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "
SELECT 
  schemaname,
  relname,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables;
"
```

### Step 19: Horizontal Pod Autoscaling (Optional)

```bash
# Enable metrics server (if not already enabled)
minikube addons enable metrics-server

# Create HPA
kubectl autoscale deployment hackystack-app --cpu-percent=70 --min=2 --max=5 -n hackystack

# Check HPA status
kubectl get hpa -n hackystack

# Generate load to trigger autoscaling
hey -n 1000 -c 10 -k https://hackystack.local/

# Watch scaling
kubectl get pods -n hackystack -w
```

### Step 20: Monitoring Setup (Optional)

```bash
# Install Prometheus and Grafana (requires Helm)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana dashboard
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Open http://localhost:3000 (admin/prom-operator)
```

## Phase 6: Testing and Validation (30 minutes)

### Step 21: Run Comprehensive Tests

```bash
# Run full test suite
./scripts/k8s-test-suite.sh --full

# Expected test results:
# ✅ Prerequisites check
# ✅ Directory structure  
# ✅ YAML syntax validation
# ✅ Docker image build
# ✅ Namespace creation
# ✅ ConfigMap and Secret
# ✅ Service creation
# ✅ Deployment creation
# ✅ Ingress setup
# ✅ Basic connectivity
# ✅ Storage resources
# ✅ PostgreSQL setup
# ✅ PostgreSQL connectivity
# ✅ App to PostgreSQL connectivity
# ✅ Application scaling
# ✅ Rolling update
# ✅ Resource usage verification
# ✅ Resource cleanup

# Run specific test categories
./scripts/k8s-test-suite.sh --interactive
```

### Step 22: Disaster Recovery Test

```bash
# Simulate pod failure
kubectl delete pod postgresql-0 -n hackystack

# Verify automatic recovery
kubectl get pods -n hackystack -w

# Verify data integrity after recovery
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "SELECT count(*) FROM information_schema.tables;"

# Test application functionality
curl -k https://hackystack.local/api/health
```

### Step 23: Documentation Review

Review the created documentation to solidify your learning:

```bash
# Read through learning resources
less docs/kubernetes/learning-path.md
less docs/kubernetes/best-practices.md
less docs/kubernetes/troubleshooting.md
```

## Troubleshooting Common Issues

### Issue: Pods stuck in Pending

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n hackystack
kubectl get events -n hackystack
```

**Common causes:**
- Insufficient cluster resources
- Image pull failures
- PVC binding issues

**Solutions:**
```bash
# Increase Minikube resources
minikube stop
minikube start --cpus=4 --memory=6144

# Reload image
minikube image load hackystack:latest
```

### Issue: Database connection failures

**Diagnosis:**
```bash
kubectl logs -l app=hackystack -n hackystack | grep -i database
kubectl exec <app-pod> -n hackystack -- env | grep DATABASE_URL
```

**Solutions:**
```bash
# Verify database is accessible
kubectl exec <app-pod> -n hackystack -- nc -zv postgresql-service 5432

# Check secret values
kubectl get secret hackystack-secrets -n hackystack -o yaml
```

### Issue: Ingress not accessible

**Diagnosis:**
```bash
kubectl get ingress -n hackystack
kubectl describe ingress hackystack-ingress -n hackystack
curl -k -v https://hackystack.local
```

**Solutions:**
```bash
# Check DNS configuration
grep hackystack /etc/hosts

# Verify ingress controller
kubectl get pods -n ingress-nginx

# Test with port forwarding as alternative
kubectl port-forward svc/hackystack-service 3000:3000 -n hackystack
```

## Performance Optimization Tips

### Resource Tuning

```yaml
# Optimized resource configuration
resources:
  requests:
    cpu: 100m      # Start conservative
    memory: 256Mi
  limits:
    cpu: 500m      # Allow bursting
    memory: 512Mi  # Prevent OOM kills
```

### Database Optimization

```bash
# PostgreSQL performance tuning
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
"
```

### Monitoring Key Metrics

```bash
# Application metrics
kubectl top pods -n hackystack

# Database metrics
kubectl exec postgresql-0 -n hackystack -- psql -U hackystack -d hackystack -c "
SELECT 
  datname,
  numbackends as connections,
  xact_commit as commits,
  xact_rollback as rollbacks
FROM pg_stat_database 
WHERE datname = 'hackystack';
"
```

## Next Steps and Advanced Topics

### Immediate Next Steps (1-2 weeks)
1. **Implement monitoring** with Prometheus and Grafana
2. **Set up CI/CD pipeline** with GitHub Actions
3. **Add automated testing** in the deployment pipeline
4. **Implement backup automation** with CronJobs

### Medium-term Goals (1-3 months)
1. **Learn Helm** for package management
2. **Implement service mesh** with Istio or Linkerd
3. **Set up multi-environment** deployments (dev/staging/prod)
4. **Study Kubernetes operators** for advanced automation

### Long-term Learning (3+ months)
1. **Multi-cluster management** with tools like Rancher
2. **GitOps workflows** with ArgoCD or Flux
3. **Custom resource definitions** and controller development
4. **Kubernetes certification** preparation (CKAD/CKA)

## Cleanup

When you're done with the walkthrough:

```bash
# Clean up all resources
./scripts/k8s-manage.sh
# Select option 11: Cleanup Resources
# Choose option 2: Remove entire namespace

# Stop Minikube (optional)
minikube stop

# Remove DNS entry (optional)
sudo sed -i.bak '/hackystack.local/d' /etc/hosts

# Clean up Docker images (optional)
docker rmi hackystack:latest hackystack:test hackystack:test-v2
```

## Conclusion

Congratulations! You've successfully completed a comprehensive Kubernetes deployment journey. You've learned:

✅ **Core Kubernetes concepts** - Pods, Services, Deployments, ConfigMaps, Secrets, Ingress  
✅ **Stateful applications** - StatefulSets, PersistentVolumes, data migration  
✅ **Operational practices** - Scaling, rolling updates, troubleshooting, monitoring  
✅ **Production readiness** - Health checks, resource management, backup strategies  
✅ **Testing methodologies** - Automated testing, disaster recovery, performance validation  

**What you've built:**
- Production-like Kubernetes application deployment
- Persistent database with automated failover
- Comprehensive operational tooling
- Complete documentation and learning resources

**Key takeaways:**
1. **Start simple, evolve complexity** - Basic setup first, then advanced features
2. **Operations matter** - Deployment is just the beginning; monitoring and maintenance are crucial
3. **Documentation is essential** - Good docs save time and reduce errors
4. **Testing is non-negotiable** - Automated testing catches issues early
5. **Learning is continuous** - Kubernetes ecosystem evolves rapidly

You now have the foundation to deploy and manage production applications on Kubernetes. Apply these concepts to your own projects and continue learning through the vast Kubernetes ecosystem.

**Happy Kubernetes journey!** 🚀