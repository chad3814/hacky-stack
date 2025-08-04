# Hacky Stack on Kubernetes

Deploy Hacky Stack on Kubernetes for local development and learning. This implementation provides two progressive setups: Basic (external database) and Intermediate (StatefulSet database) with comprehensive documentation and automation.

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) - Container runtime
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) - Local Kubernetes cluster  
- [kubectl](https://kubernetes.io/docs/tasks/tools/) - Kubernetes CLI
- PostgreSQL database (local, Docker, or cloud)

### 5-Minute Setup

```bash
# 1. Initialize Kubernetes cluster
./scripts/k8s-setup.sh

# 2. Deploy application  
./scripts/k8s-deploy.sh

# 3. Access application
open https://hackystack.local
```

That's it! Your application is running on Kubernetes with ingress, TLS, and production-like configuration.

## Architecture Overview

### Basic Setup (Level A)
```
Browser → Ingress (NGINX) → Service → Pods (2x) → External PostgreSQL
         (TLS)           (LoadBalancer) (Next.js)   (host.docker.internal)
```

### Intermediate Setup (Level B)  
```
Browser → Ingress (NGINX) → Service → Pods (2x) → PostgreSQL Service → StatefulSet
         (TLS)           (LoadBalancer) (Next.js)   (Internal)       (Persistent Storage)
```

## Available Setups

### 🚀 Basic Setup
**Perfect for:** Learning Kubernetes fundamentals, development environments

**Features:**
- Next.js application in Kubernetes pods
- External PostgreSQL database
- NGINX ingress with TLS termination
- ConfigMaps and Secrets management
- Interactive deployment scripts

**Time to deploy:** ~15 minutes

### 🏗️ Intermediate Setup  
**Perfect for:** Production-like environment, advanced learning

**Features:**
- PostgreSQL StatefulSet with persistent storage
- Automated data migration from basic setup
- PersistentVolumes for data persistence
- Production-ready database configuration
- Backup and recovery procedures

**Time to upgrade:** ~10 minutes

## Scripts and Commands

| Script | Purpose | Usage |
|--------|---------|-------|
| `k8s-setup.sh` | Initialize Minikube cluster | `./scripts/k8s-setup.sh` |
| `k8s-deploy.sh` | Deploy basic application | `./scripts/k8s-deploy.sh` |
| `k8s-manage.sh` | Manage and monitor deployment | `./scripts/k8s-manage.sh` |
| `k8s-upgrade-to-intermediate.sh` | Migrate to StatefulSet setup | `./scripts/k8s-upgrade-to-intermediate.sh` |
| `k8s-test-suite.sh` | Automated testing | `./scripts/k8s-test-suite.sh` |

### Common Operations

```bash
# View application status
kubectl get all -n hackystack

# Scale application
kubectl scale deployment hackystack-app --replicas=3 -n hackystack

# View logs
kubectl logs -l app=hackystack -n hackystack -f

# Access PostgreSQL (intermediate setup)
kubectl exec -it postgresql-0 -n hackystack -- psql -U hackystack -d hackystack

# Port forward for debugging
kubectl port-forward svc/hackystack-service 3000:3000 -n hackystack
```

## Documentation

### Getting Started
- [📖 Basic Setup Guide](docs/kubernetes/basic-setup.md) - Complete step-by-step tutorial
- [🔧 Intermediate Setup Guide](docs/kubernetes/intermediate-setup.md) - StatefulSet migration guide
- [🚶 Complete Walkthrough](docs/kubernetes/complete-walkthrough.md) - End-to-end learning path

### Operations & Maintenance  
- [🛠️ Troubleshooting Guide](docs/kubernetes/troubleshooting.md) - Common issues and solutions
- [📊 Best Practices](docs/kubernetes/best-practices.md) - Production-ready configurations
- [🎓 Learning Path](docs/kubernetes/learning-path.md) - Next steps and advanced topics

## What You'll Learn

### Core Kubernetes Concepts
- **Workloads**: Pods, Deployments, StatefulSets
- **Networking**: Services, Ingress, DNS
- **Configuration**: ConfigMaps, Secrets
- **Storage**: PersistentVolumes, StorageClasses
- **Security**: RBAC, Pod Security, Network Policies

### Practical Skills
- **Deployment strategies** (rolling updates, blue-green)
- **Scaling and performance** optimization
- **Monitoring and logging** best practices  
- **Backup and disaster recovery**
- **Troubleshooting** with kubectl

### Production Readiness
- **Health checks** and probes configuration
- **Resource management** and limits
- **Security hardening** practices
- **High availability** patterns
- **Operational procedures**

## Resource Requirements

### Minimum (Basic Setup)
- **CPU**: 2 cores
- **Memory**: 4GB RAM  
- **Storage**: 10GB available
- **Time**: 30 minutes

### Recommended (Intermediate Setup)
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 20GB available  
- **Time**: 1-2 hours

## Troubleshooting

### Common Issues

**Pods stuck in Pending:**
```bash
kubectl describe pod <pod-name> -n hackystack
# Check: Resource availability, image pull, PVC binding
```

**Cannot access https://hackystack.local:**
```bash
# Check DNS configuration
grep hackystack /etc/hosts

# Verify ingress controller
kubectl get pods -n ingress-nginx

# Alternative access via port forwarding
kubectl port-forward svc/hackystack-service 3000:3000 -n hackystack
```

**Database connection errors:**
```bash
# Check service connectivity  
kubectl exec <app-pod> -n hackystack -- nc -zv postgresql-service 5432

# Verify secret configuration
kubectl get secret hackystack-secrets -n hackystack -o yaml
```

## Testing

### Manual Testing
```bash
# Test application health
curl -k https://hackystack.local/api/health

# Load testing with hey
hey -n 1000 -c 10 -k https://hackystack.local/

# Database connectivity
kubectl exec postgresql-0 -n hackystack -- pg_isready -U hackystack -d hackystack
```

### Automated Testing
```bash
# Run full test suite
./scripts/k8s-test-suite.sh --full

# Run specific test categories
./scripts/k8s-test-suite.sh --interactive

# CI/CD integration
./scripts/k8s-test-suite.sh --basic --intermediate --performance
```

## Monitoring

### Built-in Monitoring
```bash
# Resource usage
kubectl top nodes
kubectl top pods -n hackystack

# Application metrics
kubectl get hpa -n hackystack
kubectl describe deployment hackystack-app -n hackystack
```

### Advanced Monitoring (Optional)
```bash
# Install Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana dashboard
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```

## Security

### Implemented Security Features
- ✅ **Non-root containers** with security contexts
- ✅ **TLS encryption** for all external traffic
- ✅ **Secrets management** for sensitive data
- ✅ **Network policies** ready for implementation
- ✅ **Resource limits** to prevent resource exhaustion
- ✅ **Health checks** for application reliability

### Security Hardening Checklist
- [ ] Enable Pod Security Standards
- [ ] Implement Network Policies
- [ ] Set up RBAC policies
- [ ] Enable audit logging
- [ ] Scan container images
- [ ] Implement secret rotation

## Migration Paths

### From Docker Compose
1. Use existing Dockerfile ✅
2. Convert docker-compose services to Kubernetes manifests ✅
3. Migrate environment variables to ConfigMaps/Secrets ✅
4. Set up ingress for external access ✅
5. Configure persistent storage ✅

### To Production
1. **Multi-environment setup** (dev/staging/prod namespaces)
2. **External secrets management** (AWS Secrets Manager, HashiCorp Vault)
3. **Managed Kubernetes** (EKS, GKE, AKS)
4. **GitOps deployment** (ArgoCD, Flux)
5. **Observability stack** (Prometheus, Grafana, Jaeger)

## Contributing

### Adding Features
1. Create feature branch
2. Update Kubernetes manifests
3. Add documentation
4. Update test suite
5. Test in clean environment

### Reporting Issues
- Include kubectl version and cluster info
- Provide logs from failing pods
- Share steps to reproduce
- Use issue templates in GitHub

## Examples and Use Cases

### Development Teams
- **Local development** that mirrors production
- **Integration testing** with real Kubernetes
- **Learning environment** for team training
- **Prototype deployment** patterns

### Educational Purposes
- **Kubernetes workshops** and training
- **University courses** on cloud-native development
- **Certification preparation** (CKAD, CKA)
- **Technology evaluation** and proof-of-concepts

### Small Production Deployments
- **Startup applications** with growth potential
- **Internal tools** and dashboards
- **Development/staging** environments
- **Edge deployments** with Kubernetes

## License

This Kubernetes implementation is part of the Hacky Stack project. See the main [LICENSE](LICENSE) file for details.

## Support and Community

- **Documentation**: Start with [docs/kubernetes/](docs/kubernetes/)
- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join community discussions
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Acknowledgments

Built with:
- [Kubernetes](https://kubernetes.io/) - Container orchestration
- [Minikube](https://minikube.sigs.k8s.io/) - Local Kubernetes
- [NGINX Ingress](https://kubernetes.github.io/ingress-nginx/) - Ingress controller
- [PostgreSQL](https://www.postgresql.org/) - Database

---

**Ready to start your Kubernetes journey?** Begin with the [Basic Setup Guide](docs/kubernetes/basic-setup.md) and work your way through the complete learning path. 🚀