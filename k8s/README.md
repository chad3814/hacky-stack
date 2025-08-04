# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying HackyStack to a Kubernetes cluster with comprehensive health checks and monitoring.

## Files Overview

- `deployment.yaml` - Main application deployment with health checks
- `service.yaml` - Service and headless service definitions
- `configmap.yaml` - Configuration and service account
- `secrets.yaml.template` - Template for secrets (copy and modify)
- `ingress.yaml` - Ingress configuration with SSL and health checks
- `README.md` - This file

## Health Check Endpoints

HackyStack provides three health check endpoints:

### `/api/health` - General Health Check

- Comprehensive health status including database connectivity
- Returns detailed information about all system components
- Use for: General monitoring and debugging

### `/api/health/live` - Liveness Probe

- Lightweight check to verify the application is running
- Only checks basic application responsiveness
- Use for: Kubernetes liveness probes, container restart decisions

### `/api/health/ready` - Readiness Probe

- Checks if application is ready to serve traffic
- Verifies database connectivity and required environment variables
- Use for: Kubernetes readiness probes, load balancer health checks

## Deployment Steps

### 1. Prepare Secrets

```bash
# Copy the secrets template
cp secrets.yaml.template secrets.yaml

# Edit secrets.yaml with your actual values
vim secrets.yaml

# Apply secrets (do not commit secrets.yaml to git)
kubectl apply -f secrets.yaml
```

### 2. Update Configuration

Edit `configmap.yaml` and `ingress.yaml` to match your domain and requirements:

```bash
# Update domain name in ingress.yaml
sed -i 's/your-domain.com/yourdomain.com/g' ingress.yaml

# Update NextAuth URL in configmap.yaml
sed -i 's|https://your-domain.com|https://yourdomain.com|g' configmap.yaml
```

### 3. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -l app=hackystack

# Check service endpoints
kubectl get endpoints hackystack-service

# Check ingress
kubectl get ingress

# View logs
kubectl logs -l app=hackystack --tail=100
```

## Health Check Configuration

### Kubernetes Probes

The deployment includes three types of probes:

#### Startup Probe

```yaml
startupProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 30  # 5 minutes total
```

#### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3
```

#### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

### Testing Health Checks

From within the cluster:

```bash
# Test from another pod
kubectl run test-pod --rm -i --tty --image=curlimages/curl -- sh

# Inside the test pod:
curl -v http://hackystack-service/api/health
curl -v http://hackystack-service/api/health/live
curl -v http://hackystack-service/api/health/ready
```

From outside the cluster (if ingress is configured):

```bash
curl -v https://yourdomain.com/health/
curl -v https://yourdomain.com/health/live
curl -v https://yourdomain.com/health/ready
```

## Monitoring and Alerts

### Prometheus Integration

Add these annotations to the deployment for Prometheus scraping:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/api/health"
```

### Alert Rules

Example Prometheus alert rules:

```yaml
groups:
- name: hackystack
  rules:
  - alert: HackyStackDown
    expr: up{job="hackystack"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "HackyStack is down"

  - alert: HackyStackUnhealthy
    expr: probe_success{job="hackystack-health"} == 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "HackyStack health check failing"
```

## Scaling and Performance

### Horizontal Pod Autoscaler

```bash
# Create HPA based on CPU usage
kubectl autoscale deployment hackystack --cpu-percent=70 --min=3 --max=10

# Or apply this manifest:
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hackystack-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hackystack
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Resource Recommendations

For production workloads:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Security Considerations

1. **Secrets Management**: Never commit actual secrets to git
2. **Network Policies**: Implement network policies to restrict pod communication
3. **Service Accounts**: Use least-privilege service accounts
4. **Security Context**: Run containers as non-root users
5. **Image Scanning**: Regularly scan container images for vulnerabilities

## Troubleshooting

### Common Issues

1. **Health Check Failures**

   ```bash
   # Check pod logs
   kubectl logs <pod-name> --previous

   # Check events
   kubectl describe pod <pod-name>
   ```

2. **Database Connection Issues**

   ```bash
   # Verify database connectivity
   kubectl exec -it <pod-name> -- curl -v http://localhost:3000/api/health
   ```

3. **Ingress Issues**

   ```bash
   # Check ingress controller logs
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

### Debug Commands

```bash
# Port forward for local testing
kubectl port-forward service/hackystack-service 3000:80

# Execute into pod for debugging
kubectl exec -it <pod-name> -- sh

# Check environment variables
kubectl exec <pod-name> -- env | grep -E "(DATABASE|NEXTAUTH|GITHUB)"
```
