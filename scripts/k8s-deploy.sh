#!/bin/bash

# Hacky Stack Kubernetes Deployment Script
# This script handles ConfigMaps, Secrets, and application deployment with validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="hackystack"
APP_NAME="hackystack-app"
CONFIG_DIR="k8s/basic"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from project root
check_project_root() {
    if [ ! -f "package.json" ] || [ ! -d "$CONFIG_DIR" ]; then
        log_error "This script must be run from the project root directory"
        log_error "Please run: cd /path/to/hacky-stack && ./scripts/k8s-deploy.sh"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please run the setup script first: ./scripts/k8s-setup.sh"
        exit 1
    fi
    
    # Check if Minikube is running
    if ! minikube status >/dev/null 2>&1; then
        log_error "Minikube is not running"
        log_error "Please run the setup script first: ./scripts/k8s-setup.sh"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build and load Docker image
build_and_load_image() {
    log_info "Building and loading Docker image..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found in current directory"
        exit 1
    fi
    
    # Build the image
    log_info "Building Docker image (this may take a few minutes)..."
    docker build -t hackystack:latest . || {
        log_error "Failed to build Docker image"
        exit 1
    }
    
    # Load image into Minikube
    log_info "Loading image into Minikube..."
    minikube image load hackystack:latest || {
        log_error "Failed to load image into Minikube"
        exit 1
    }
    
    log_success "Docker image built and loaded successfully"
}

# Generate random secret if not provided
generate_nextauth_secret() {
    openssl rand -base64 32
}

# Encode string to base64
base64_encode() {
    echo -n "$1" | base64
}

# Collect environment variables
collect_environment_variables() {
    log_info "Collecting environment variables..."
    echo ""
    echo "Please provide the following configuration values:"
    echo "=============================================="
    
    # NEXTAUTH_SECRET
    echo ""
    read -p "NextAuth.js secret (leave empty to generate): " -r NEXTAUTH_SECRET
    if [ -z "$NEXTAUTH_SECRET" ]; then
        NEXTAUTH_SECRET=$(generate_nextauth_secret)
        log_info "Generated NextAuth.js secret"
    fi
    
    # NEXTAUTH_URL (with default)
    echo ""
    read -p "NextAuth.js URL [https://hackystack.local]: " -r NEXTAUTH_URL
    NEXTAUTH_URL=${NEXTAUTH_URL:-"https://hackystack.local"}
    
    # GitHub OAuth credentials
    echo ""
    log_info "GitHub OAuth Setup:"
    echo "  1. Go to https://github.com/settings/applications/new"
    echo "  2. Set Application name: Hacky Stack Local"
    echo "  3. Set Homepage URL: $NEXTAUTH_URL"
    echo "  4. Set Authorization callback URL: $NEXTAUTH_URL/api/auth/callback/github"
    echo ""
    
    read -p "GitHub Client ID: " -r GITHUB_CLIENT_ID
    if [ -z "$GITHUB_CLIENT_ID" ]; then
        log_error "GitHub Client ID is required"
        exit 1
    fi
    
    echo ""
    read -s -p "GitHub Client Secret: " GITHUB_CLIENT_SECRET
    echo ""
    if [ -z "$GITHUB_CLIENT_SECRET" ]; then
        log_error "GitHub Client Secret is required"
        exit 1
    fi
    
    # Database URL
    echo ""
    log_info "Database Configuration:"
    echo "  For basic setup, you need an external PostgreSQL database."
    echo "  You can use:"
    echo "    - Local PostgreSQL: postgresql://user:password@host.docker.internal:5432/hackystack"
    echo "    - Docker PostgreSQL: postgresql://user:password@$(minikube ip):5432/hackystack"
    echo "    - Cloud database service"
    echo ""
    
    read -p "Database URL: " -r DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        log_error "Database URL is required"
        exit 1
    fi
    
    # Validate database URL format
    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        log_warning "Database URL should start with 'postgresql://'"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Environment variables collected"
}

# Create or update namespace
create_namespace() {
    log_info "Creating namespace..."
    
    kubectl apply -f "$CONFIG_DIR/namespace.yaml" || {
        log_error "Failed to create namespace"
        exit 1
    }
    
    log_success "Namespace created/updated"
}

# Create or update ConfigMap
create_configmap() {
    log_info "Creating ConfigMap..."
    
    # Update the ConfigMap with the collected NEXTAUTH_URL
    local temp_configmap="/tmp/hackystack-configmap.yaml"
    sed "s|NEXTAUTH_URL: \"https://hackystack.local\"|NEXTAUTH_URL: \"$NEXTAUTH_URL\"|g" \
        "$CONFIG_DIR/configmap.yaml" > "$temp_configmap"
    
    kubectl apply -f "$temp_configmap" || {
        log_error "Failed to create ConfigMap"
        exit 1
    }
    
    rm -f "$temp_configmap"
    log_success "ConfigMap created/updated"
}

# Create or update Secret
create_secret() {
    log_info "Creating Secret..."
    
    # Base64 encode all secret values
    local nextauth_secret_b64=$(base64_encode "$NEXTAUTH_SECRET")
    local github_client_id_b64=$(base64_encode "$GITHUB_CLIENT_ID")
    local github_client_secret_b64=$(base64_encode "$GITHUB_CLIENT_SECRET")
    local database_url_b64=$(base64_encode "$DATABASE_URL")
    
    # Create temporary secret file with actual values
    local temp_secret="/tmp/hackystack-secret.yaml"
    sed -e "s|NEXTAUTH_SECRET: \"\"|NEXTAUTH_SECRET: \"$nextauth_secret_b64\"|g" \
        -e "s|GITHUB_CLIENT_ID: \"\"|GITHUB_CLIENT_ID: \"$github_client_id_b64\"|g" \
        -e "s|GITHUB_CLIENT_SECRET: \"\"|GITHUB_CLIENT_SECRET: \"$github_client_secret_b64\"|g" \
        -e "s|DATABASE_URL: \"\"|DATABASE_URL: \"$database_url_b64\"|g" \
        "$CONFIG_DIR/secret.yaml" > "$temp_secret"
    
    kubectl apply -f "$temp_secret" || {
        log_error "Failed to create Secret"
        exit 1
    }
    
    # Securely remove temporary file
    rm -f "$temp_secret"
    log_success "Secret created/updated"
}

# Create TLS certificate secret
create_tls_secret() {
    log_info "Creating TLS certificate..."
    
    local cert_dir="/tmp/hackystack-certs"
    
    # Check if certificates exist from setup script
    if [ ! -f "$cert_dir/tls.crt" ] || [ ! -f "$cert_dir/tls.key" ]; then
        log_warning "TLS certificates not found, generating new ones..."
        mkdir -p "$cert_dir"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$cert_dir/tls.key" \
            -out "$cert_dir/tls.crt" \
            -subj "/CN=hackystack.local/O=hackystack/C=US" \
            -addext "subjectAltName=DNS:hackystack.local" || {
            log_error "Failed to generate TLS certificate"
            exit 1
        }
    fi
    
    # Create TLS secret
    kubectl create secret tls hackystack-tls \
        --cert="$cert_dir/tls.crt" \
        --key="$cert_dir/tls.key" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f - || {
        log_error "Failed to create TLS secret"
        exit 1
    }
    
    log_success "TLS certificate created/updated"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    # Apply service first (dependencies)
    kubectl apply -f "$CONFIG_DIR/service.yaml" || {
        log_error "Failed to create service"
        exit 1
    }
    
    # Apply deployment
    kubectl apply -f "$CONFIG_DIR/deployment.yaml" || {
        log_error "Failed to create deployment"
        exit 1
    }
    
    # Apply ingress
    kubectl apply -f "$CONFIG_DIR/ingress.yaml" || {
        log_error "Failed to create ingress"
        exit 1
    }
    
    log_success "Application deployed"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s \
        deployment/$APP_NAME -n $NAMESPACE || {
        log_error "Deployment failed to become ready within 5 minutes"
        log_info "Check deployment status with: kubectl get pods -n $NAMESPACE"
        log_info "Check logs with: kubectl logs -l app=hackystack -n $NAMESPACE"
        exit 1
    }
    
    log_success "Deployment is ready"
}

# Verify deployment health
verify_deployment() {
    log_info "Verifying deployment health..."
    
    # Check pod status
    local pod_count=$(kubectl get pods -n $NAMESPACE -l app=hackystack --no-headers | grep -c "Running" || echo "0")
    if [ $pod_count -gt 0 ]; then
        log_success "$pod_count pod(s) are running"
    else
        log_error "No pods are running"
        kubectl get pods -n $NAMESPACE -l app=hackystack
        exit 1
    fi
    
    # Check service endpoints
    local endpoint_count=$(kubectl get endpoints -n $NAMESPACE hackystack-service -o jsonpath='{.subsets[0].addresses}' | jq length 2>/dev/null || echo "0")
    if [ $endpoint_count -gt 0 ]; then
        log_success "Service has $endpoint_count endpoint(s)"
    else
        log_warning "Service has no endpoints (pods may not be ready)"
    fi
    
    # Check ingress
    local ingress_ip=$(kubectl get ingress -n $NAMESPACE hackystack-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$ingress_ip" ]; then
        log_success "Ingress has IP: $ingress_ip"
    else
        log_info "Ingress IP not yet assigned (this is normal for local development)"
    fi
}

# Test connectivity
test_connectivity() {
    log_info "Testing connectivity..."
    
    # Wait a moment for ingress to be ready
    sleep 10
    
    # Test internal connectivity (pod to service)
    log_info "Testing internal service connectivity..."
    local test_pod=$(kubectl get pods -n $NAMESPACE -l app=hackystack -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$test_pod" ]; then
        if kubectl exec -n $NAMESPACE "$test_pod" -- curl -s -o /dev/null -w "%{http_code}" http://hackystack-service:3000/api/health | grep -q "200"; then
            log_success "Internal service connectivity works"
        else
            log_warning "Internal service connectivity test failed"
        fi
    fi
    
    # Test external connectivity (via ingress)
    log_info "Testing external connectivity via https://hackystack.local..."
    if curl -k -s -o /dev/null -w "%{http_code}" https://hackystack.local/api/health | grep -q "200"; then
        log_success "External connectivity works - application is accessible!"
        echo ""
        echo "🎉 Application is ready!"
        echo "   Visit: https://hackystack.local"
        echo "   (Accept the self-signed certificate warning)"
    else
        log_warning "External connectivity test failed"
        echo ""
        echo "The application may still be starting up or there might be a configuration issue."
        echo "Try accessing https://hackystack.local in a few minutes."
        echo ""
        echo "If problems persist, check:"
        echo "  - Pod logs: kubectl logs -l app=hackystack -n $NAMESPACE"
        echo "  - Pod status: kubectl get pods -n $NAMESPACE"
        echo "  - Service status: kubectl get svc -n $NAMESPACE"
        echo "  - Ingress status: kubectl get ingress -n $NAMESPACE"
    fi
}

# Show deployment summary
show_summary() {
    echo ""
    echo "=================================================="
    echo "           Deployment Summary"
    echo "=================================================="
    echo ""
    
    # Show resource status
    echo "Resources created:"
    kubectl get all -n $NAMESPACE
    echo ""
    
    echo "Ingress:"
    kubectl get ingress -n $NAMESPACE
    echo ""
    
    echo "ConfigMap and Secrets:"
    kubectl get configmap,secret -n $NAMESPACE
    echo ""
    
    echo "Access Information:"
    echo "  Application URL: https://hackystack.local"
    echo "  Namespace: $NAMESPACE"
    echo ""
    
    echo "Useful Commands:"
    echo "  - View pods: kubectl get pods -n $NAMESPACE"
    echo "  - View logs: kubectl logs -l app=hackystack -n $NAMESPACE -f"
    echo "  - Scale deployment: kubectl scale deployment $APP_NAME --replicas=3 -n $NAMESPACE"
    echo "  - Port forward (alternative access): kubectl port-forward svc/hackystack-service 3000:3000 -n $NAMESPACE"
    echo "  - Delete deployment: kubectl delete namespace $NAMESPACE"
    echo ""
}

# Cleanup function for errors
cleanup_on_error() {
    log_error "Deployment failed!"
    
    echo ""
    read -p "Do you want to see the deployment logs for debugging? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        log_info "Pod status:"
        kubectl get pods -n $NAMESPACE -l app=hackystack || true
        
        echo ""
        log_info "Recent pod logs:"
        kubectl logs -l app=hackystack -n $NAMESPACE --tail=20 || true
        
        echo ""
        log_info "Pod events:"
        kubectl get events -n $NAMESPACE --sort-by=.lastTimestamp || true
    fi
    
    echo ""
    read -p "Do you want to clean up the failed deployment? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up resources..."
        kubectl delete namespace $NAMESPACE 2>/dev/null || true
        log_info "Cleanup completed"
    fi
}

# Main execution
main() {
    echo "=================================================="
    echo "    Hacky Stack Kubernetes Deployment Script"
    echo "=================================================="
    echo ""
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Run deployment steps
    check_project_root
    check_prerequisites
    build_and_load_image
    collect_environment_variables
    
    echo ""
    log_info "Starting deployment process..."
    
    create_namespace
    create_configmap
    create_secret
    create_tls_secret
    deploy_application
    wait_for_deployment
    verify_deployment
    test_connectivity
    show_summary
    
    log_success "Deployment completed successfully!"
}

# Execute main function
main "$@"