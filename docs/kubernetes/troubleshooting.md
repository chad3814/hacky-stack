# Kubernetes Troubleshooting Guide

This guide covers common issues you might encounter when running Hacky Stack on Kubernetes and how to diagnose and resolve them.

## Quick Diagnostic Commands

Before diving into specific issues, these commands provide a good overview of system health:

```bash
# Check overall cluster health
kubectl cluster-info

# Check all resources in the hackystack namespace
kubectl get all -n hackystack

# Check recent events
kubectl get events -n hackystack --sort-by=.lastTimestamp

# Check pod status with more details
kubectl get pods -n hackystack -o wide

# Check logs for all pods
kubectl logs -l app=hackystack -n hackystack --tail=50
```

## Common Issues and Solutions

### 1. Pod Issues

#### Pod Stuck in Pending State

**Symptoms:**
```bash
kubectl get pods -n hackystack
NAME                            READY   STATUS    RESTARTS   AGE
hackystack-app-xxx-xxx          0/1     Pending   0          5m
```

**Diagnostic Steps:**
```bash
# Check pod description for events
kubectl describe pod <pod-name> -n hackystack

# Check node resources
kubectl top nodes
kubectl describe nodes
```

**Common Causes and Solutions:**

1. **Insufficient Resources:**
   ```bash
   # Check resource requests vs available
   kubectl describe nodes | grep -A 5 "Allocated resources"
   
   # Solution: Reduce resource requests or increase Minikube resources
   minikube stop
   minikube start --cpus=4 --memory=6144
   ```

2. **Image Pull Issues:**
   ```bash
   # Check if image exists in Minikube
   minikube image ls | grep hackystack
   
   # Solution: Load image into Minikube
   docker build -t hackystack:latest .
   minikube image load hackystack:latest
   ```

3. **Storage Issues:**
   ```bash
   # Check persistent volume claims
   kubectl get pvc -n hackystack
   
   # Solution: Ensure storage class is available
   kubectl get storageclass
   ```

#### Pod in CrashLoopBackOff

**Symptoms:**
```bash
kubectl get pods -n hackystack
NAME                            READY   STATUS             RESTARTS   AGE
hackystack-app-xxx-xxx          0/1     CrashLoopBackOff   5          10m
```

**Diagnostic Steps:**
```bash
# Check logs from current container
kubectl logs <pod-name> -n hackystack

# Check logs from previous container (if it restarted)
kubectl logs <pod-name> -n hackystack --previous

# Check detailed pod information
kubectl describe pod <pod-name> -n hackystack
```

**Common Causes and Solutions:**

1. **Application Startup Errors:**
   ```bash
   # Check application logs for error details
   kubectl logs -l app=hackystack -n hackystack --tail=100
   
   # Common Next.js issues:
   # - Missing environment variables
   # - Database connection failures
   # - Port binding issues
   ```

2. **Database Connection Issues:**
   ```bash
   # Check if DATABASE_URL is correctly set
   kubectl get secret hackystack-secrets -n hackystack -o yaml
   
   # Test database connectivity
   kubectl exec -it <pod-name> -n hackystack -- bash
   # Inside pod: ping your-database-host
   ```

3. **Health Check Failures:**
   ```bash
   # Check if health endpoint is working
   kubectl exec -it <pod-name> -n hackystack -- curl http://localhost:3000/api/health
   
   # Solution: Verify health check endpoint exists and returns 200
   ```

#### Pod Running but Not Ready

**Symptoms:**
```bash
kubectl get pods -n hackystack
NAME                            READY   STATUS    RESTARTS   AGE
hackystack-app-xxx-xxx          0/1     Running   0          5m
```

**Diagnostic Steps:**
```bash
# Check readiness probe
kubectl describe pod <pod-name> -n hackystack | grep -A 10 "Readiness"

# Test readiness endpoint manually
kubectl exec -it <pod-name> -n hackystack -- curl http://localhost:3000/api/health
```

**Solutions:**
- Increase `initialDelaySeconds` in readiness probe
- Verify the health endpoint responds correctly
- Check if the application takes longer to start than expected

### 2. Service and Networking Issues

#### Cannot Access Application via Ingress

**Symptoms:**
- `curl https://hackystack.local` returns connection refused or timeout
- Browser shows "This site can't be reached"

**Diagnostic Steps:**
```bash
# Check ingress status
kubectl get ingress -n hackystack -o wide

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check service endpoints
kubectl get endpoints -n hackystack

# Check DNS resolution
nslookup hackystack.local
```

**Common Causes and Solutions:**

1. **Ingress Controller Not Ready:**
   ```bash
   # Check ingress controller status
   kubectl get pods -n ingress-nginx
   
   # Solution: Wait for ingress controller or restart it
   kubectl delete pod -n ingress-nginx -l app.kubernetes.io/component=controller
   ```

2. **DNS Not Configured:**
   ```bash
   # Check /etc/hosts
   grep hackystack.local /etc/hosts
   
   # Solution: Add DNS entry
   echo "$(minikube ip) hackystack.local" | sudo tee -a /etc/hosts
   ```

3. **Service Not Routing to Pods:**
   ```bash
   # Check service endpoints
   kubectl get endpoints hackystack-service -n hackystack
   
   # Solution: Verify pod labels match service selector
   kubectl get pods -n hackystack --show-labels
   kubectl describe service hackystack-service -n hackystack
   ```

#### Internal Service Communication Issues

**Diagnostic Steps:**
```bash
# Test service DNS resolution from within cluster
kubectl run debug --image=nicolaka/netshoot -it --rm -- bash
# Inside debug pod:
nslookup hackystack-service.hackystack.svc.cluster.local
curl http://hackystack-service.hackystack.svc.cluster.local:3000/api/health
```

**Solutions:**
- Verify service is running: `kubectl get svc -n hackystack`
- Check service selector matches pod labels
- Ensure pods are in Ready state

### 3. Configuration Issues

#### Environment Variables Not Loading

**Symptoms:**
- Application logs show missing environment variables
- Features not working (OAuth, database connections)

**Diagnostic Steps:**
```bash
# Check ConfigMap contents
kubectl get configmap hackystack-config -n hackystack -o yaml

# Check Secret contents (keys only)
kubectl get secret hackystack-secrets -n hackystack -o jsonpath='{.data}' | jq -r 'keys[]'

# Check if environment variables are injected into pods
kubectl exec -it <pod-name> -n hackystack -- env | grep -E "(NEXTAUTH|GITHUB|DATABASE)"
```

**Solutions:**
```bash
# Recreate ConfigMap/Secret with correct values
kubectl delete configmap hackystack-config -n hackystack
kubectl apply -f k8s/basic/configmap.yaml

# Restart pods to pick up new configuration
kubectl rollout restart deployment/hackystack-app -n hackystack
```

#### TLS Certificate Issues

**Symptoms:**
- Browser shows certificate warnings
- HTTPS not working

**Diagnostic Steps:**
```bash
# Check TLS secret
kubectl get secret hackystack-tls -n hackystack

# Check certificate validity
kubectl get secret hackystack-tls -n hackystack -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

**Solutions:**
```bash
# Regenerate TLS certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=hackystack.local/O=hackystack/C=US" \
  -addext "subjectAltName=DNS:hackystack.local"

# Update TLS secret
kubectl create secret tls hackystack-tls \
  --cert=tls.crt --key=tls.key \
  --namespace=hackystack --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Database Connectivity Issues

#### Cannot Connect to External Database

**Symptoms:**
- Application logs show database connection errors
- "connection refused" or "timeout" errors

**Diagnostic Steps:**
```bash
# Test database connectivity from pod
kubectl exec -it <pod-name> -n hackystack -- bash
# Inside pod:
nc -zv your-database-host 5432
ping your-database-host

# Check DATABASE_URL format
kubectl get secret hackystack-secrets -n hackystack -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

**Common Solutions:**

1. **For Local PostgreSQL:**
   ```bash
   # Use host.docker.internal to reach host machine
   DATABASE_URL="postgresql://user:password@host.docker.internal:5432/hackystack"
   ```

2. **For Docker PostgreSQL:**
   ```bash
   # Use Minikube IP
   DATABASE_URL="postgresql://user:password@$(minikube ip):5432/hackystack"
   ```

3. **Firewall/Network Issues:**
   ```bash
   # Test from host machine first
   telnet your-database-host 5432
   
   # Check if database allows external connections
   # PostgreSQL: check pg_hba.conf and postgresql.conf
   ```

### 5. Resource and Performance Issues

#### High Resource Usage

**Symptoms:**
- Pods being killed (OOMKilled)
- Slow application performance
- Node running out of resources

**Diagnostic Steps:**
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n hackystack

# Check resource limits and requests
kubectl describe deployment hackystack-app -n hackystack | grep -A 10 "Limits\|Requests"

# Check events for resource-related issues
kubectl get events -n hackystack | grep -i "oom\|evict\|resource"
```

**Solutions:**
```bash
# Increase resource limits
kubectl patch deployment hackystack-app -n hackystack -p '{"spec":{"template":{"spec":{"containers":[{"name":"hackystack-app","resources":{"limits":{"memory":"1Gi","cpu":"1000m"}}}]}}}}'

# Or increase Minikube resources
minikube stop
minikube start --cpus=4 --memory=8192
```

#### Slow Application Startup

**Diagnostic Steps:**
```bash
# Check startup time in pod events
kubectl describe pod <pod-name> -n hackystack

# Check if readiness probe is appropriate
kubectl describe deployment hackystack-app -n hackystack | grep -A 10 "Readiness"
```

**Solutions:**
- Increase `initialDelaySeconds` in health probes
- Optimize application startup (reduce dependencies, lazy loading)
- Increase resource allocation

### 6. Minikube-Specific Issues

#### Minikube Not Starting

**Diagnostic Steps:**
```bash
# Check Minikube status
minikube status

# Check Minikube logs
minikube logs

# Check Docker daemon (if using Docker driver)
docker info
```

**Solutions:**
```bash
# Clean restart
minikube stop
minikube delete
minikube start --driver=docker --cpus=2 --memory=4096

# Try different driver
minikube start --driver=hyperkit  # macOS
minikube start --driver=kvm2      # Linux
```

#### Image Not Found in Minikube

**Symptoms:**
- `ImagePullBackOff` or `ErrImagePull` status
- Pods cannot start due to missing image

**Solutions:**
```bash
# Build and load image
docker build -t hackystack:latest .
minikube image load hackystack:latest

# Verify image is loaded
minikube image ls | grep hackystack

# Alternative: Use Minikube's Docker daemon
eval $(minikube docker-env)
docker build -t hackystack:latest .
```

## Useful kubectl Commands Reference

### Pod Management
```bash
# Get detailed pod information
kubectl describe pod <pod-name> -n hackystack

# Execute commands in pod
kubectl exec -it <pod-name> -n hackystack -- bash

# Copy files to/from pod
kubectl cp local-file <pod-name>:/container-path -n hackystack
kubectl cp <pod-name>:/container-path local-file -n hackystack

# Port forward to pod
kubectl port-forward pod/<pod-name> 3000:3000 -n hackystack
```

### Logging and Debugging
```bash
# Stream logs from all pods
kubectl logs -l app=hackystack -n hackystack -f

# Get logs from previous container (if restarted)
kubectl logs <pod-name> -n hackystack --previous

# Get events sorted by time
kubectl get events -n hackystack --sort-by=.lastTimestamp

# Debug network connectivity
kubectl run debug --image=nicolaka/netshoot -it --rm -- bash
```

### Resource Management
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n hackystack

# Scale deployment
kubectl scale deployment hackystack-app --replicas=3 -n hackystack

# Update image
kubectl set image deployment/hackystack-app hackystack-app=hackystack:v2 -n hackystack

# Check rollout status
kubectl rollout status deployment/hackystack-app -n hackystack
```

### Configuration Management
```bash
# Edit live configuration
kubectl edit configmap hackystack-config -n hackystack
kubectl edit secret hackystack-secrets -n hackystack

# View configuration
kubectl get configmap hackystack-config -n hackystack -o yaml
kubectl get secret hackystack-secrets -n hackystack -o yaml
```

## Prevention Strategies

### 1. Resource Planning
- Always set resource requests and limits
- Monitor resource usage regularly
- Plan for peak load scenarios

### 2. Health Checks
- Implement proper health check endpoints
- Set appropriate probe timeouts and intervals
- Use different endpoints for liveness and readiness if needed

### 3. Configuration Management
- Use external configuration management tools
- Validate configuration before deployment
- Keep sensitive data in Secrets, not ConfigMaps

### 4. Monitoring and Alerting
- Set up monitoring for key metrics
- Create alerts for common failure scenarios
- Regular health checks and automated testing

### 5. Documentation
- Document configuration requirements
- Maintain troubleshooting runbooks
- Keep deployment procedures up to date

## Getting Help

### Minikube Issues
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Minikube Troubleshooting](https://minikube.sigs.k8s.io/docs/handbook/troubleshooting/)

### Kubernetes Issues
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)
- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug/)

### Application-Specific Issues
- Check application logs first
- Review environment configuration
- Test components individually (database, OAuth, etc.)

### Community Resources
- [Kubernetes Slack](https://kubernetes.slack.com/)
- [Stack Overflow - Kubernetes](https://stackoverflow.com/questions/tagged/kubernetes)
- [Reddit - r/kubernetes](https://www.reddit.com/r/kubernetes/)

Remember: Most Kubernetes issues are configuration-related. Start with the basics (pods running, services accessible, configuration correct) before diving into complex debugging.