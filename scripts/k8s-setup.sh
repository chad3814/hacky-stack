#!/bin/bash

# Hacky Stack Kubernetes Setup Script
# This script validates prerequisites and initializes Minikube with ingress controller

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MINIKUBE_CPU="2"
MINIKUBE_MEMORY="4096"
MINIKUBE_DRIVER="docker"

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

# Progress indicator
show_progress() {
    local pid=$1
    local delay=0.5
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    if ! command_exists minikube; then
        missing_tools+=("minikube")
    fi
    
    if ! command_exists kubectl; then
        missing_tools+=("kubectl")
    fi
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists openssl; then
        missing_tools+=("openssl")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                minikube)
                    echo "  - minikube: https://minikube.sigs.k8s.io/docs/start/"
                    ;;
                kubectl)
                    echo "  - kubectl: https://kubernetes.io/docs/tasks/tools/"
                    ;;
                docker)
                    echo "  - docker: https://docs.docker.com/get-docker/"
                    ;;
                openssl)
                    echo "  - openssl: Usually pre-installed on macOS/Linux"
                    ;;
            esac
        done
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Check tool versions
check_versions() {
    log_info "Checking tool versions..."
    
    echo "  Minikube: $(minikube version --short)"
    echo "  kubectl: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
    echo "  Docker: $(docker --version)"
    echo "  OpenSSL: $(openssl version)"
}

# Prompt for Minikube configuration
configure_minikube() {
    echo ""
    log_info "Configuring Minikube resources..."
    
    echo "Current defaults:"
    echo "  CPU cores: $MINIKUBE_CPU"
    echo "  Memory: ${MINIKUBE_MEMORY}MB"
    echo "  Driver: $MINIKUBE_DRIVER"
    echo ""
    
    read -p "Do you want to customize these settings? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "CPU cores (2-8): " cpu_input
        if [[ $cpu_input =~ ^[2-8]$ ]]; then
            MINIKUBE_CPU=$cpu_input
        fi
        
        read -p "Memory in MB (2048-8192): " memory_input
        if [[ $memory_input =~ ^[0-9]{4,5}$ ]] && [ $memory_input -ge 2048 ] && [ $memory_input -le 8192 ]; then
            MINIKUBE_MEMORY=$memory_input
        fi
        
        echo "Available drivers: docker, hyperkit, virtualbox"
        read -p "Driver (default: docker): " driver_input
        if [[ $driver_input =~ ^(docker|hyperkit|virtualbox)$ ]]; then
            MINIKUBE_DRIVER=$driver_input
        fi
    fi
    
    log_info "Using: $MINIKUBE_CPU CPU, ${MINIKUBE_MEMORY}MB memory, $MINIKUBE_DRIVER driver"
}

# Start Minikube
start_minikube() {
    log_info "Starting Minikube..."
    
    # Check if Minikube is already running
    if minikube status >/dev/null 2>&1; then
        log_warning "Minikube is already running"
        read -p "Do you want to restart it with new configuration? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Stopping existing Minikube cluster..."
            minikube stop
            minikube delete
        else
            log_info "Using existing Minikube cluster"
            return 0
        fi
    fi
    
    # Start Minikube with specified configuration
    log_info "Starting new Minikube cluster (this may take a few minutes)..."
    minikube start \
        --cpus=$MINIKUBE_CPU \
        --memory=$MINIKUBE_MEMORY \
        --driver=$MINIKUBE_DRIVER \
        --kubernetes-version=stable
    
    if [ $? -eq 0 ]; then
        log_success "Minikube started successfully"
    else
        log_error "Failed to start Minikube"
        exit 1
    fi
}

# Enable ingress addon
enable_ingress() {
    log_info "Enabling ingress addon..."
    
    minikube addons enable ingress
    
    if [ $? -eq 0 ]; then
        log_success "Ingress addon enabled"
    else
        log_error "Failed to enable ingress addon"
        exit 1
    fi
    
    # Wait for ingress controller to be ready
    log_info "Waiting for ingress controller to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log_success "Ingress controller is ready"
}

# Generate TLS certificate
generate_tls_cert() {
    log_info "Generating self-signed TLS certificate for hackystack.local..."
    
    local cert_dir="/tmp/hackystack-certs"
    mkdir -p "$cert_dir"
    
    # Generate private key and certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$cert_dir/tls.key" \
        -out "$cert_dir/tls.crt" \
        -subj "/CN=hackystack.local/O=hackystack/C=US" \
        -addext "subjectAltName=DNS:hackystack.local"
    
    if [ $? -eq 0 ]; then
        log_success "TLS certificate generated"
        echo "  Certificate: $cert_dir/tls.crt"
        echo "  Private key: $cert_dir/tls.key"
    else
        log_error "Failed to generate TLS certificate"
        exit 1
    fi
}

# Configure local DNS
configure_dns() {
    log_info "Configuring local DNS for hackystack.local..."
    
    # Get Minikube IP
    local minikube_ip=$(minikube ip)
    log_info "Minikube IP: $minikube_ip"
    
    # Check if entry already exists in /etc/hosts
    if grep -q "hackystack.local" /etc/hosts; then
        log_warning "hackystack.local already exists in /etc/hosts"
        read -p "Do you want to update it? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo sed -i.bak "/hackystack.local/d" /etc/hosts
        else
            log_info "Skipping DNS configuration"
            return 0
        fi
    fi
    
    # Add entry to /etc/hosts
    echo "Adding hackystack.local to /etc/hosts (requires sudo)..."
    echo "$minikube_ip hackystack.local" | sudo tee -a /etc/hosts > /dev/null
    
    if [ $? -eq 0 ]; then
        log_success "DNS configured - hackystack.local points to $minikube_ip"
    else
        log_error "Failed to configure DNS"
        exit 1
    fi
}

# Verify cluster functionality
verify_cluster() {
    log_info "Verifying cluster functionality..."
    
    # Check kubectl connectivity
    kubectl cluster-info > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "kubectl can connect to cluster"
    else
        log_error "kubectl cannot connect to cluster"
        exit 1
    fi
    
    # Check nodes
    local node_count=$(kubectl get nodes --no-headers | wc -l | tr -d ' ')
    log_success "Cluster has $node_count node(s)"
    
    # Check ingress controller
    local ingress_pods=$(kubectl get pods -n ingress-nginx --no-headers | grep -c "Running")
    if [ $ingress_pods -gt 0 ]; then
        log_success "Ingress controller is running ($ingress_pods pod(s))"
    else
        log_warning "Ingress controller pods not found or not running"
    fi
    
    # Test DNS resolution
    if nslookup hackystack.local > /dev/null 2>&1; then
        log_success "DNS resolution for hackystack.local works"
    else
        log_warning "DNS resolution test failed (this is normal if no application is deployed yet)"
    fi
}

# Cleanup function
cleanup_on_error() {
    log_error "Setup failed. Cleaning up..."
    
    read -p "Do you want to clean up the failed setup? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping and deleting Minikube cluster..."
        minikube stop 2>/dev/null || true
        minikube delete 2>/dev/null || true
        
        log_info "Removing hackystack.local from /etc/hosts..."
        sudo sed -i.bak "/hackystack.local/d" /etc/hosts 2>/dev/null || true
        
        log_info "Cleanup completed"
    fi
}

# Main execution
main() {
    echo "=================================================="
    echo "    Hacky Stack Kubernetes Setup Script"
    echo "=================================================="
    echo ""
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Run setup steps
    check_prerequisites
    check_versions
    configure_minikube
    start_minikube
    enable_ingress
    generate_tls_cert
    configure_dns
    verify_cluster
    
    echo ""
    log_success "Kubernetes setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Build and tag your Docker image: docker build -t hackystack:latest ."
    echo "  2. Load image into Minikube: minikube image load hackystack:latest"
    echo "  3. Run the deployment script: ./scripts/k8s-deploy.sh"
    echo ""
    echo "Useful commands:"
    echo "  - Check cluster status: kubectl cluster-info"
    echo "  - View all resources: kubectl get all -A"
    echo "  - Access Minikube dashboard: minikube dashboard"
    echo ""
}

# Execute main function
main "$@"