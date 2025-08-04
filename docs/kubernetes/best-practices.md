# Kubernetes Best Practices

This guide covers production-ready best practices for deploying and managing applications in Kubernetes, building on the foundation you've established with Hacky Stack.

## Security Best Practices

### Container Security

#### 1. Use Non-Root Users
```yaml
# In Deployment spec
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001

# In Container spec
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

#### 2. Image Security
```bash
# Use specific image tags, never 'latest'
image: node:18.17.0-alpine  # Good
image: node:latest          # Bad

# Use minimal base images
image: node:alpine          # Better than node:full
image: distroless/nodejs    # Even better

# Scan images for vulnerabilities
docker scan hackystack:v1.0.0
```

#### 3. Secret Management
```yaml
# Use external secret management
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
```

### Network Security

#### 1. Network Policies
```yaml
# Deny all ingress traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: hackystack
spec:
  podSelector: {}
  policyTypes:
  - Ingress

---
# Allow specific ingress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-traffic
  namespace: hackystack
spec:
  podSelector:
    matchLabels:
      app: hackystack
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
```

#### 2. Service Mesh Security
```yaml
# Istio PeerAuthentication for mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: hackystack
spec:
  mtls:
    mode: STRICT
```

### Access Control

#### 1. RBAC (Role-Based Access Control)
```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hackystack-sa
  namespace: hackystack

---
# Role with minimal permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hackystack-role
  namespace: hackystack
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: hackystack-binding
  namespace: hackystack
subjects:
- kind: ServiceAccount
  name: hackystack-sa
  namespace: hackystack
roleRef:
  kind: Role
  name: hackystack-role
  apiGroup: rbac.authorization.k8s.io
```

#### 2. Pod Security Standards
```yaml
# Namespace with Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: hackystack
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Resource Management

### Resource Requests and Limits

#### 1. CPU and Memory
```yaml
resources:
  requests:
    cpu: 100m        # Guaranteed CPU
    memory: 128Mi    # Guaranteed memory
  limits:
    cpu: 500m        # Maximum CPU
    memory: 512Mi    # Maximum memory (enforced)
```

#### 2. Quality of Service Classes
```yaml
# Guaranteed QoS (highest priority)
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 100m      # Same as request
    memory: 128Mi  # Same as request

# Burstable QoS (medium priority)
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m      # Higher than request
    memory: 512Mi  # Higher than request

# BestEffort QoS (lowest priority)
# No requests or limits specified
```

### Resource Quotas

#### 1. Namespace Resource Quotas
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: hackystack-quota
  namespace: hackystack
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
    pods: "20"
    services: "5"
    secrets: "10"
    configmaps: "10"
```

#### 2. Limit Ranges
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: hackystack-limits
  namespace: hackystack
spec:
  limits:
  - default:
      cpu: 200m
      memory: 256Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
  - max:
      storage: 10Gi
    type: PersistentVolumeClaim
```

## High Availability and Reliability

### Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: hackystack-pdb
  namespace: hackystack
spec:
  minAvailable: 1  # Or use maxUnavailable: 1
  selector:
    matchLabels:
      app: hackystack
```

### Health Checks

#### 1. Comprehensive Probes
```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1

readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1

startupProbe:
  httpGet:
    path: /api/health/startup
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30  # Allow up to 5 minutes for startup
  successThreshold: 1
```

#### 2. Health Check Endpoints
```javascript
// Example health check endpoints in your application
app.get('/api/health/liveness', (req, res) => {
  // Check if the application is alive
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/api/health/readiness', async (req, res) => {
  try {
    // Check if the application is ready to serve traffic
    await checkDatabaseConnection();
    await checkExternalDependencies();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

app.get('/api/health/startup', async (req, res) => {
  try {
    // Check if the application has started successfully
    await checkInitialConfiguration();
    res.status(200).json({ status: 'started', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'starting', error: error.message });
  }
});
```

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hackystack-hpa
  namespace: hackystack
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hackystack-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

## Configuration Management

### ConfigMap Best Practices

#### 1. Environment-Specific ConfigMaps
```yaml
# Base configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: hackystack-config-base
  namespace: hackystack
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"

---
# Environment-specific overrides
apiVersion: v1
kind: ConfigMap
metadata:
  name: hackystack-config-prod
  namespace: hackystack
data:
  LOG_LEVEL: "warn"
  RATE_LIMIT: "1000"
  CACHE_TTL: "3600"
```

#### 2. Using Kustomize for Configuration
```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- base/

patchesStrategicMerge:
- config-patch.yaml

configMapGenerator:
- name: hackystack-config
  files:
  - app.properties
  - database.conf
```

### Secret Management

#### 1. External Secrets Operator
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hackystack-secrets
  namespace: hackystack
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: hackystack-secrets
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: hackystack/database
      property: url
  - secretKey: GITHUB_CLIENT_SECRET
    remoteRef:
      key: hackystack/oauth
      property: github_secret
```

#### 2. Sealed Secrets
```bash
# Install Sealed Secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Create sealed secret
echo -n mypassword | kubectl create secret generic mysecret --dry-run=client --from-file=password=/dev/stdin -o yaml | kubeseal -o yaml > mysealedsecret.yaml
```

## Storage Best Practices

### PersistentVolume Configuration

#### 1. Storage Classes
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

#### 2. Volume Snapshot Classes
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: database-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  description: "Database backup snapshots"
```

### Database Best Practices

#### 1. StatefulSet Configuration
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  replicas: 3  # Primary + 2 replicas
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: postgresql
              topologyKey: kubernetes.io/hostname
```

#### 2. Backup Strategy
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
spec:
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
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
              pg_dump $DATABASE_URL > /backups/backup-$(date +%Y%m%d-%H%M%S).sql
              aws s3 cp /backups/backup-$(date +%Y%m%d-%H%M%S).sql s3://my-backups/postgresql/
              find /backups -name "backup-*.sql" -mtime +7 -delete
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: DATABASE_URL
          restartPolicy: OnFailure
```

## Observability and Monitoring

### Metrics Collection

#### 1. Service Monitor for Prometheus
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hackystack-metrics
  namespace: hackystack
spec:
  selector:
    matchLabels:
      app: hackystack
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

#### 2. Application Metrics
```javascript
// Example Prometheus metrics in Node.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Logging Best Practices

#### 1. Structured Logging
```javascript
// Use structured logging (JSON format)
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Log with context
logger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  source: 'auth-middleware',
  requestId: req.id
});
```

#### 2. Log Aggregation
```yaml
# Fluent Bit DaemonSet for log collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      name: fluent-bit
  template:
    metadata:
      labels:
        name: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.0
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

### Distributed Tracing

#### 1. OpenTelemetry Setup
```javascript
// OpenTelemetry setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger-collector:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

## Deployment Strategies

### Blue-Green Deployment

```yaml
# Blue deployment (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackystack-blue
  labels:
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hackystack
      version: blue
  template:
    metadata:
      labels:
        app: hackystack
        version: blue
    spec:
      containers:
      - name: app
        image: hackystack:v1.0.0

---
# Green deployment (new)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackystack-green
  labels:
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hackystack
      version: green
  template:
    metadata:
      labels:
        app: hackystack
        version: green
    spec:
      containers:
      - name: app
        image: hackystack:v2.0.0
```

### Canary Deployment

```yaml
# Canary deployment with Istio
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: hackystack-canary
spec:
  hosts:
  - hackystack.local
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: hackystack-service
        subset: v2
  - route:
    - destination:
        host: hackystack-service
        subset: v1
      weight: 90
    - destination:
        host: hackystack-service
        subset: v2
      weight: 10
```

## Disaster Recovery

### etcd Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: etcd-backup
            image: k8s.gcr.io/etcd:3.5.0-0
            command:
            - /bin/sh
            - -c
            - |
              etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db
              aws s3 cp /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db s3://my-etcd-backups/
            env:
            - name: ETCDCTL_ENDPOINTS
              value: "https://127.0.0.1:2379"
            - name: ETCDCTL_CACERT
              value: "/etc/kubernetes/pki/etcd/ca.crt"
            - name: ETCDCTL_CERT
              value: "/etc/kubernetes/pki/etcd/server.crt"
            - name: ETCDCTL_KEY
              value: "/etc/kubernetes/pki/etcd/server.key"
            - name: ETCDCTL_API
              value: "3"
          restartPolicy: OnFailure
```

### Velero Backup Configuration

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    includedNamespaces:
    - hackystack
    - default
    excludedResources:
    - events
    - events.events.k8s.io
    ttl: 720h  # 30 days
```

## Performance Optimization

### Node Affinity and Pod Affinity

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hackystack-app
spec:
  template:
    spec:
      affinity:
        # Prefer nodes with SSD storage
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: storage-type
                operator: In
                values:
                - ssd
        # Spread pods across different nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: hackystack
              topologyKey: kubernetes.io/hostname
        # Co-locate with database pods
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: postgresql
              topologyKey: kubernetes.io/hostname
```

### Vertical Pod Autoscaling

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: hackystack-vpa
  namespace: hackystack
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hackystack-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: hackystack-app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 1000m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
```

## Cost Optimization

### Resource Right-Sizing

```yaml
# Use resource recommendations from VPA
resources:
  requests:
    cpu: 150m      # Based on actual usage
    memory: 200Mi  # Based on actual usage
  limits:
    cpu: 300m      # 2x requests for burst
    memory: 400Mi  # 2x requests for burst
```

### Cluster Autoscaling

```yaml
# Cluster Autoscaler configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/hackystack-cluster
        - --balance-similar-node-groups
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
```

## Conclusion

These best practices form the foundation of production-ready Kubernetes deployments. Remember:

1. **Start with security** - Implement security measures from day one
2. **Monitor everything** - Observability is crucial for production systems
3. **Plan for failure** - Assume components will fail and design accordingly
4. **Optimize iteratively** - Don't over-optimize early; measure and improve
5. **Document your decisions** - Maintain clear documentation for your team

Apply these practices gradually to your Hacky Stack deployment and other projects. Each practice addresses real production challenges you'll encounter as you scale your Kubernetes usage.

Remember: Perfect is the enemy of good. Start with the basics and improve over time rather than trying to implement everything at once.