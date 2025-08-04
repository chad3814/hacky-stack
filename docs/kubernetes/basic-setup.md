# Kubernetes Basic Setup Guide

This guide will walk you through deploying Hacky Stack on Kubernetes using Minikube for local development and learning.

## Overview

By the end of this guide, you'll have:
- Hacky Stack Next.js application running in Kubernetes pods
- External PostgreSQL database connectivity 
- Ingress access via `https://hackystack.local`
- Understanding of core Kubernetes concepts

## Architecture

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
                │ ConfigMap       │    │ ConfigMap       │
                │ Secret          │    │ Secret          │
                └─────────────────┘    └─────────────────┘
                       │                         │
                       └────────┬────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ External PostgreSQL │
                    │ (host.docker.internal│
                    │  or Cloud DB)       │
                    └─────────────────────┘
```

## Prerequisites

### System Requirements
- **CPU**: 2+ cores available for Minikube
- **Memory**: 4GB+ RAM available 
- **Storage**: 10GB+ free disk space
- **OS**: macOS, Linux, or Windows with WSL2

### Required Tools
- [Docker](https://docs.docker.com/get-docker/) - Container runtime
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) - Local Kubernetes cluster
- [kubectl](https://kubernetes.io/docs/tasks/tools/) - Kubernetes CLI
- PostgreSQL database (local, Docker, or cloud)

### Verification
Run these commands to verify your setup:
```bash
docker --version          # Docker 20.10+
minikube version          # 1.25+
kubectl version --client  # 1.24+
```

## Setup Walkthrough

### Step 1: Initialize Kubernetes Cluster

The setup script handles all the heavy lifting:

```bash
./scripts/k8s-setup.sh
```

**What this script does:**
1. **Validates prerequisites** - Checks for required tools
2. **Configures Minikube** - Prompts for CPU/memory allocation
3. **Starts cluster** - Initializes Kubernetes with appropriate resources
4. **Enables ingress** - Installs NGINX ingress controller
5. **Generates TLS certificate** - Creates self-signed cert for HTTPS
6. **Configures DNS** - Adds `hackystack.local` to `/etc/hosts`

**Interactive prompts:**
- Resource allocation (CPU cores, memory)
- Confirmation for system changes (DNS modification)
- Driver selection (Docker, HyperKit, VirtualBox)

### Step 2: Deploy Application

```bash
./scripts/k8s-deploy.sh
```

**Configuration prompts:**
- **NextAuth.js secret** - Auto-generated if not provided
- **GitHub OAuth credentials** - Client ID and secret from GitHub
- **Database URL** - PostgreSQL connection string

**Example database URLs:**
```bash
# Local PostgreSQL
postgresql://user:password@host.docker.internal:5432/hackystack

# Docker PostgreSQL  
postgresql://user:password@$(minikube ip):5432/hackystack

# Cloud database
postgresql://user:password@your-db-host.com:5432/hackystack
```

### Step 3: Verify Deployment

After deployment, verify everything is working:

```bash
# Check pod status
kubectl get pods -n hackystack

# Check services
kubectl get svc -n hackystack

# Check ingress
kubectl get ingress -n hackystack

# View logs
kubectl logs -l app=hackystack -n hackystack -f
```

### Step 4: Access Application

Open your browser and visit:
- **https://hackystack.local**

You'll see a security warning due to the self-signed certificate - click "Advanced" and "Proceed to hackystack.local" to continue.

## Kubernetes Resources Explained

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hackystack
```

**Purpose**: Creates an isolated environment for all application resources.

**Why it's needed**: Namespaces prevent naming conflicts and provide resource isolation. In production, you might have separate namespaces for different environments (dev, staging, prod).

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackystack-app
spec:
  replicas: 2
```

**Purpose**: Manages the desired state of your application pods.

**Key features**:
- **Replicas**: Ensures 2 instances are always running
- **Rolling updates**: Allows zero-downtime deployments
- **Health checks**: Monitors application health
- **Resource limits**: Prevents resource exhaustion

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: hackystack-service
spec:
  type: ClusterIP
```

**Purpose**: Provides stable networking for pods.

**Why it's needed**: Pods are ephemeral and get new IP addresses when recreated. Services provide a consistent endpoint for communication.

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hackystack-config
data:
  NODE_ENV: "production"
  NEXTAUTH_URL: "https://hackystack.local"
```

**Purpose**: Stores non-sensitive configuration data.

**Best practices**:
- Separate configuration from code
- Easy to update without rebuilding images
- Can be mounted as files or environment variables

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hackystack-secrets
type: Opaque
data:
  NEXTAUTH_SECRET: "base64-encoded-value"
```

**Purpose**: Stores sensitive data like passwords and API keys.

**Security features**:
- Base64 encoded (not encrypted, but obscured)
- Can be mounted as files or environment variables
- Access controlled by RBAC

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hackystack-ingress
spec:
  rules:
  - host: hackystack.local
```

**Purpose**: Manages external access to services.

**Features**:
- Host-based routing
- TLS termination
- Load balancing
- Path-based routing

## Manual Deployment (Educational)

If you want to understand each step, you can deploy manually:

```bash
# 1. Create namespace
kubectl apply -f k8s/basic/namespace.yaml

# 2. Create configuration
kubectl apply -f k8s/basic/configmap.yaml

# 3. Create secrets (after base64 encoding values)
kubectl apply -f k8s/basic/secret.yaml

# 4. Create TLS certificate
kubectl create secret tls hackystack-tls \
  --cert=tls.crt --key=tls.key -n hackystack

# 5. Deploy service
kubectl apply -f k8s/basic/service.yaml

# 6. Deploy application
kubectl apply -f k8s/basic/deployment.yaml

# 7. Create ingress
kubectl apply -f k8s/basic/ingress.yaml

# 8. Wait for deployment
kubectl wait --for=condition=available --timeout=300s \
  deployment/hackystack-app -n hackystack
```

## Monitoring and Debugging

### View Resources
```bash
# All resources in namespace
kubectl get all -n hackystack

# Detailed pod information
kubectl describe pods -l app=hackystack -n hackystack

# Service endpoints
kubectl get endpoints -n hackystack
```

### View Logs
```bash
# Current logs
kubectl logs -l app=hackystack -n hackystack

# Follow logs in real-time
kubectl logs -l app=hackystack -n hackystack -f

# Previous pod logs (if pod restarted)
kubectl logs -l app=hackystack -n hackystack --previous
```

### Debug Network Issues
```bash
# Test service connectivity from within cluster
kubectl run debug --image=nicolaka/netshoot -it --rm -- bash
# Then inside the pod:
# curl http://hackystack-service.hackystack.svc.cluster.local:3000/api/health

# Port forwarding for direct access
kubectl port-forward svc/hackystack-service 3000:3000 -n hackystack
# Then access: http://localhost:3000
```

### Resource Usage
```bash
# CPU and memory usage
kubectl top pods -n hackystack

# Node resources
kubectl top nodes
```

## Common Issues and Solutions

### Pod Not Starting

**Symptoms**: Pod stuck in `Pending` or `CrashLoopBackOff`

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n hackystack
kubectl logs <pod-name> -n hackystack
```

**Common causes**:
- Image not found in Minikube
- Resource limits too low
- Missing environment variables
- Database connection issues

**Solutions**:
```bash
# Reload image into Minikube
minikube image load hackystack:latest

# Check resource usage
kubectl top pods -n hackystack

# Verify secrets and configmaps
kubectl get secret,configmap -n hackystack
```

### Ingress Not Working

**Symptoms**: Cannot access `https://hackystack.local`

**Diagnosis**:
```bash
kubectl get ingress -n hackystack
curl -k https://hackystack.local/api/health
```

**Common causes**:
- Ingress controller not ready
- DNS not configured
- TLS certificate issues

**Solutions**:
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify DNS
nslookup hackystack.local

# Check /etc/hosts
grep hackystack /etc/hosts
```

### Database Connection Issues

**Symptoms**: Application starts but cannot connect to database

**Diagnosis**:
```bash
kubectl logs -l app=hackystack -n hackystack | grep -i database
```

**Solutions**:
```bash
# Test database connectivity from pod
kubectl exec -it <pod-name> -n hackystack -- bash
# Then try connecting to your database

# Verify secret is correctly set
kubectl get secret hackystack-secrets -n hackystack -o yaml
```

## Scaling and Updates

### Scale Application
```bash
# Scale to 3 replicas
kubectl scale deployment hackystack-app --replicas=3 -n hackystack

# Verify scaling
kubectl get pods -n hackystack
```

### Update Application
```bash
# Build new image
docker build -t hackystack:v2 .

# Load into Minikube
minikube image load hackystack:v2

# Update deployment
kubectl set image deployment/hackystack-app \
  hackystack-app=hackystack:v2 -n hackystack

# Watch rollout
kubectl rollout status deployment/hackystack-app -n hackystack
```

### Update Configuration
```bash
# Edit configmap
kubectl edit configmap hackystack-config -n hackystack

# Restart deployment to pick up changes
kubectl rollout restart deployment/hackystack-app -n hackystack
```

## Cleanup

### Remove Application
```bash
# Delete namespace and all resources
kubectl delete namespace hackystack
```

### Stop Minikube
```bash
# Stop cluster
minikube stop

# Delete cluster
minikube delete
```

### Clean up DNS
```bash
# Remove from /etc/hosts
sudo sed -i.bak '/hackystack.local/d' /etc/hosts
```

## Next Steps

1. **Learn kubectl commands**: Practice with `kubectl get`, `describe`, `logs`, `exec`
2. **Experiment with scaling**: Try different replica counts
3. **Explore rolling updates**: Update the application without downtime
4. **Monitor resources**: Use `kubectl top` and Minikube dashboard
5. **Proceed to intermediate setup**: Try the StatefulSet PostgreSQL setup

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

## Learning Exercises

1. **Scale the application** to 4 replicas and observe the behavior
2. **Update an environment variable** in the ConfigMap and restart the deployment
3. **Simulate a pod failure** by deleting a pod and watch it get recreated
4. **Examine the ingress** configuration and understand how traffic routing works
5. **Use port-forwarding** as an alternative way to access the application