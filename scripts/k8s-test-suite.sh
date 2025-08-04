#!/bin/bash

# Hacky Stack Kubernetes Test Suite
# Comprehensive testing of basic and intermediate setups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="hackystack"
TEST_TIMEOUT=300
BACKUP_DIR="/tmp/hackystack-test-backup"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

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

log_header() {
    echo -e "${CYAN}$1${NC}"
}

log_test_start() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_test_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_test_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

# Test runner function
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log_test_start "$test_name"
    
    if $test_function; then
        log_test_pass "$test_name"
        return 0
    else
        log_test_fail "$test_name"
        return 1
    fi
}

# Utility functions
wait_for_condition() {
    local condition="$1"
    local timeout="${2:-60}"
    local interval="${3:-5}"
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if eval "$condition" >/dev/null 2>&1; then
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    return 1
}

# Test functions

# Prerequisites tests
test_prerequisites() {
    # Check if required tools are available
    command -v kubectl >/dev/null 2>&1 || return 1
    command -v minikube >/dev/null 2>&1 || return 1
    command -v docker >/dev/null 2>&1 || return 1
    command -v curl >/dev/null 2>&1 || return 1
    
    # Check if cluster is accessible
    kubectl cluster-info >/dev/null 2>&1 || return 1
    
    # Check if Minikube is running
    minikube status >/dev/null 2>&1 || return 1
    
    return 0
}

test_directory_structure() {
    # Check if all required directories exist
    [ -d "k8s/basic" ] || return 1
    [ -d "k8s/intermediate" ] || return 1
    [ -d "docs/kubernetes" ] || return 1
    [ -d "scripts" ] || return 1
    
    # Check if all basic manifests exist
    [ -f "k8s/basic/namespace.yaml" ] || return 1
    [ -f "k8s/basic/deployment.yaml" ] || return 1
    [ -f "k8s/basic/service.yaml" ] || return 1
    [ -f "k8s/basic/configmap.yaml" ] || return 1
    [ -f "k8s/basic/secret.yaml" ] || return 1
    [ -f "k8s/basic/ingress.yaml" ] || return 1
    
    # Check if all intermediate manifests exist
    [ -f "k8s/intermediate/postgresql-statefulset.yaml" ] || return 1
    [ -f "k8s/intermediate/postgresql-service.yaml" ] || return 1
    [ -f "k8s/intermediate/postgresql-configmap.yaml" ] || return 1
    [ -f "k8s/intermediate/postgresql-secret.yaml" ] || return 1
    [ -f "k8s/intermediate/persistent-volume.yaml" ] || return 1
    
    # Check if all scripts exist and are executable
    [ -x "scripts/k8s-setup.sh" ] || return 1
    [ -x "scripts/k8s-deploy.sh" ] || return 1
    [ -x "scripts/k8s-manage.sh" ] || return 1
    [ -x "scripts/k8s-upgrade-to-intermediate.sh" ] || return 1
    
    # Check if all documentation exists
    [ -f "docs/kubernetes/basic-setup.md" ] || return 1
    [ -f "docs/kubernetes/intermediate-setup.md" ] || return 1
    [ -f "docs/kubernetes/troubleshooting.md" ] || return 1
    [ -f "docs/kubernetes/learning-path.md" ] || return 1
    [ -f "docs/kubernetes/best-practices.md" ] || return 1
    
    return 0
}

test_yaml_syntax() {
    # Test YAML syntax of all manifests
    for yaml_file in k8s/basic/*.yaml k8s/intermediate/*.yaml; do
        kubectl apply --dry-run=client -f "$yaml_file" >/dev/null 2>&1 || return 1
    done
    return 0
}

# Basic setup tests
test_basic_namespace_creation() {
    # Clean up any existing namespace
    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true >/dev/null 2>&1
    
    # Apply namespace
    kubectl apply -f k8s/basic/namespace.yaml >/dev/null 2>&1 || return 1
    
    # Verify namespace exists
    kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    return 0
}

test_basic_configmap_secret() {
    # Apply ConfigMap
    kubectl apply -f k8s/basic/configmap.yaml >/dev/null 2>&1 || return 1
    
    # Verify ConfigMap exists
    kubectl get configmap hackystack-config -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Create a test secret (since the template has empty values)
    kubectl create secret generic hackystack-secrets \
        --from-literal=NEXTAUTH_SECRET="test-secret" \
        --from-literal=GITHUB_CLIENT_ID="test-client-id" \
        --from-literal=GITHUB_CLIENT_SECRET="test-client-secret" \
        --from-literal=DATABASE_URL="postgresql://test:test@localhost:5432/test" \
        -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Verify Secret exists
    kubectl get secret hackystack-secrets -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    return 0
}

test_basic_service() {
    # Apply Service
    kubectl apply -f k8s/basic/service.yaml >/dev/null 2>&1 || return 1
    
    # Verify Service exists
    kubectl get service hackystack-service -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Verify Service has correct ports
    local port=$(kubectl get service hackystack-service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
    [ "$port" = "3000" ] || return 1
    
    return 0
}

test_docker_image_build() {
    # Check if Dockerfile exists
    [ -f "Dockerfile" ] || return 1
    
    # Build the Docker image
    docker build -t hackystack:test . >/dev/null 2>&1 || return 1
    
    # Load image into Minikube (if not already loaded)
    minikube image load hackystack:test >/dev/null 2>&1 || return 1
    
    return 0
}

test_basic_deployment() {
    # Update deployment to use test image
    sed 's|hackystack:latest|hackystack:test|g' k8s/basic/deployment.yaml | kubectl apply -f - >/dev/null 2>&1 || return 1
    
    # Wait for deployment to be ready
    wait_for_condition "kubectl get deployment hackystack-app -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q '^2$'" 120 || return 1
    
    # Verify pods are running
    local running_pods=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | grep -c "Running" || echo "0")
    [ "$running_pods" -gt 0 ] || return 1
    
    return 0
}

test_ingress_setup() {
    # Check if ingress addon is enabled
    minikube addons list | grep -q "ingress.*enabled" || return 1
    
    # Apply ingress
    kubectl apply -f k8s/basic/ingress.yaml >/dev/null 2>&1 || return 1
    
    # Verify ingress exists
    kubectl get ingress hackystack-ingress -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    return 0
}

test_basic_connectivity() {
    # Wait for ingress to get an address (may take time in test environments)
    sleep 30
    
    # Test internal service connectivity
    local test_pod=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | head -1 | awk '{print $1}')
    
    if [ -n "$test_pod" ]; then
        # Test internal service
        kubectl exec "$test_pod" -n "$NAMESPACE" -- timeout 10 nc -zv hackystack-service 3000 >/dev/null 2>&1 || return 1
    else
        return 1
    fi
    
    return 0
}

# Intermediate setup tests
test_storage_resources() {
    # Create storage directory on Minikube
    minikube ssh 'sudo mkdir -p /mnt/data/postgresql && sudo chmod 777 /mnt/data/postgresql' >/dev/null 2>&1 || return 1
    
    # Apply storage resources
    kubectl apply -f k8s/intermediate/persistent-volume.yaml >/dev/null 2>&1 || return 1
    
    # Verify PV exists
    kubectl get pv postgresql-pv >/dev/null 2>&1 || return 1
    
    # Verify StorageClass exists
    kubectl get storageclass local-storage >/dev/null 2>&1 || return 1
    
    return 0
}

test_postgresql_setup() {
    # Create PostgreSQL secret with test values
    kubectl create secret generic postgresql-secret \
        --from-literal=POSTGRES_PASSWORD="test-postgres-password" \
        --from-literal=POSTGRES_DB="hackystack" \
        --from-literal=POSTGRES_USER="hackystack" \
        --from-literal=POSTGRES_APP_PASSWORD="test-app-password" \
        --from-literal=DATABASE_URL="postgresql://hackystack:test-app-password@postgresql-service:5432/hackystack" \
        -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Apply PostgreSQL resources
    kubectl apply -f k8s/intermediate/postgresql-configmap.yaml >/dev/null 2>&1 || return 1
    kubectl apply -f k8s/intermediate/postgresql-service.yaml >/dev/null 2>&1 || return 1
    kubectl apply -f k8s/intermediate/postgresql-statefulset.yaml >/dev/null 2>&1 || return 1
    
    # Wait for PostgreSQL to be ready
    wait_for_condition "kubectl get pod postgresql-0 -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type==\"Ready\")].status}' | grep -q True" 180 || return 1
    
    return 0
}

test_postgresql_connectivity() {
    # Test PostgreSQL connectivity
    kubectl exec postgresql-0 -n "$NAMESPACE" -- pg_isready -U hackystack -d hackystack >/dev/null 2>&1 || return 1
    
    # Test database query
    kubectl exec postgresql-0 -n "$NAMESPACE" -- psql -U hackystack -d hackystack -c "SELECT version();" >/dev/null 2>&1 || return 1
    
    return 0
}

test_intermediate_app_connectivity() {
    # Update application to use PostgreSQL service
    kubectl patch secret hackystack-secrets -n "$NAMESPACE" \
        -p '{"data":{"DATABASE_URL":"cG9zdGdyZXNxbDovL2hhY2t5c3RhY2s6dGVzdC1hcHAtcGFzc3dvcmRAcG9zdGdyZXNxbC1zZXJ2aWNlOjU0MzIvaGFja3lzdGFjaw=="}}' >/dev/null 2>&1 || return 1
    
    # Restart deployment
    kubectl rollout restart deployment/hackystack-app -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Wait for rollout to complete
    kubectl rollout status deployment/hackystack-app -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || return 1
    
    # Test connectivity from app to PostgreSQL
    local app_pod=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | head -1 | awk '{print $1}')
    if [ -n "$app_pod" ]; then
        kubectl exec "$app_pod" -n "$NAMESPACE" -- timeout 10 nc -zv postgresql-service 5432 >/dev/null 2>&1 || return 1
    else
        return 1
    fi
    
    return 0
}

# Performance and scale tests
test_scaling() {
    # Test scale up
    kubectl scale deployment hackystack-app --replicas=3 -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Wait for scale up
    wait_for_condition "kubectl get deployment hackystack-app -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q '^3$'" 60 || return 1
    
    # Test scale down
    kubectl scale deployment hackystack-app --replicas=2 -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Wait for scale down
    wait_for_condition "kubectl get deployment hackystack-app -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q '^2$'" 60 || return 1
    
    return 0
}

test_rolling_update() {
    # Create a new test image
    docker build -t hackystack:test-v2 . >/dev/null 2>&1 || return 1
    minikube image load hackystack:test-v2 >/dev/null 2>&1 || return 1
    
    # Perform rolling update
    kubectl set image deployment/hackystack-app hackystack-app=hackystack:test-v2 -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Wait for rollout
    kubectl rollout status deployment/hackystack-app -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || return 1
    
    # Verify new image is used
    local current_image=$(kubectl get deployment hackystack-app -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    [ "$current_image" = "hackystack:test-v2" ] || return 1
    
    return 0
}

test_resource_usage() {
    # Check if metrics server is available (may not be in test environment)
    if kubectl top nodes >/dev/null 2>&1; then
        # Test resource usage collection
        kubectl top pods -n "$NAMESPACE" >/dev/null 2>&1 || return 1
    fi
    
    # Verify resource limits are set
    local cpu_limit=$(kubectl get deployment hackystack-app -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
    [ -n "$cpu_limit" ] || return 1
    
    local memory_limit=$(kubectl get deployment hackystack-app -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')
    [ -n "$memory_limit" ] || return 1
    
    return 0
}

# Cleanup tests
test_cleanup() {
    # Test namespace deletion
    kubectl delete namespace "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || return 1
    
    # Verify namespace is gone
    ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || return 1
    
    # Clean up PV (since it has Retain policy)
    kubectl delete pv postgresql-pv --ignore-not-found=true >/dev/null 2>&1 || true
    
    # Clean up storage directory
    minikube ssh 'sudo rm -rf /mnt/data/postgresql' >/dev/null 2>&1 || true
    
    return 0
}

# Main test execution
run_test_suite() {
    log_header "=== HACKY STACK KUBERNETES TEST SUITE ==="
    echo ""
    
    log_info "Starting comprehensive test suite..."
    echo ""
    
    # Prerequisites
    log_header "Prerequisites Tests"
    run_test "Prerequisites check" test_prerequisites
    run_test "Directory structure" test_directory_structure
    run_test "YAML syntax validation" test_yaml_syntax
    run_test "Docker image build" test_docker_image_build
    
    echo ""
    
    # Basic setup tests
    log_header "Basic Setup Tests"
    run_test "Namespace creation" test_basic_namespace_creation
    run_test "ConfigMap and Secret" test_basic_configmap_secret
    run_test "Service creation" test_basic_service
    run_test "Deployment creation" test_basic_deployment
    run_test "Ingress setup" test_ingress_setup
    run_test "Basic connectivity" test_basic_connectivity
    
    echo ""
    
    # Intermediate setup tests
    log_header "Intermediate Setup Tests"
    run_test "Storage resources" test_storage_resources
    run_test "PostgreSQL setup" test_postgresql_setup
    run_test "PostgreSQL connectivity" test_postgresql_connectivity
    run_test "App to PostgreSQL connectivity" test_intermediate_app_connectivity
    
    echo ""
    
    # Performance and scaling tests
    log_header "Performance and Scaling Tests"
    run_test "Application scaling" test_scaling
    run_test "Rolling update" test_rolling_update
    run_test "Resource usage verification" test_resource_usage
    
    echo ""
    
    # Cleanup tests
    log_header "Cleanup Tests"
    run_test "Resource cleanup" test_cleanup
    
    echo ""
}

# Test results summary
show_test_results() {
    log_header "=== TEST RESULTS SUMMARY ==="
    echo ""
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    log_success "Tests passed: $TESTS_PASSED"
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Tests failed: $TESTS_FAILED"
        echo ""
        log_error "Failed tests:"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo "  - $failed_test"
        done
    else
        log_success "Tests failed: $TESTS_FAILED"
    fi
    
    echo ""
    log_info "Total tests: $total_tests"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "🎉 ALL TESTS PASSED! Hacky Stack Kubernetes setup is working correctly."
        return 0
    else
        log_error "❌ Some tests failed. Please review the failures and fix any issues."
        return 1
    fi
}

# Interactive mode
interactive_mode() {
    log_header "=== INTERACTIVE TEST MODE ==="
    echo ""
    
    echo "Test categories:"
    echo "1. Prerequisites only"
    echo "2. Basic setup only"
    echo "3. Intermediate setup only"
    echo "4. Performance tests only"
    echo "5. Full test suite"
    echo "6. Cleanup only"
    echo ""
    echo -n "Select test category (1-6): "
    read -r test_choice
    
    case $test_choice in
        1)
            run_test "Prerequisites check" test_prerequisites
            run_test "Directory structure" test_directory_structure
            run_test "YAML syntax validation" test_yaml_syntax
            ;;
        2)
            test_prerequisites || { log_error "Prerequisites failed"; exit 1; }
            test_directory_structure || { log_error "Directory structure check failed"; exit 1; }
            log_header "Basic Setup Tests"
            run_test "Namespace creation" test_basic_namespace_creation
            run_test "ConfigMap and Secret" test_basic_configmap_secret
            run_test "Service creation" test_basic_service
            run_test "Docker image build" test_docker_image_build
            run_test "Deployment creation" test_basic_deployment
            run_test "Ingress setup" test_ingress_setup
            run_test "Basic connectivity" test_basic_connectivity
            ;;
        3)
            log_header "Intermediate Setup Tests"
            run_test "Storage resources" test_storage_resources
            run_test "PostgreSQL setup" test_postgresql_setup
            run_test "PostgreSQL connectivity" test_postgresql_connectivity
            run_test "App to PostgreSQL connectivity" test_intermediate_app_connectivity
            ;;
        4)
            log_header "Performance Tests"
            run_test "Application scaling" test_scaling
            run_test "Rolling update" test_rolling_update
            run_test "Resource usage verification" test_resource_usage
            ;;
        5)
            run_test_suite
            ;;
        6)
            run_test "Resource cleanup" test_cleanup
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Usage information
show_usage() {
    echo "Hacky Stack Kubernetes Test Suite"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --full          Run full test suite (default)"
    echo "  --interactive   Interactive mode to select test categories"
    echo "  --basic         Run basic setup tests only"
    echo "  --intermediate  Run intermediate setup tests only"
    echo "  --performance   Run performance tests only"
    echo "  --cleanup       Run cleanup tests only"
    echo "  --help          Show this help message"
    echo ""
}

# Main execution
main() {
    case "${1:-}" in
        --interactive)
            interactive_mode
            ;;
        --basic)
            test_prerequisites || { log_error "Prerequisites failed"; exit 1; }
            test_directory_structure || { log_error "Directory structure check failed"; exit 1; }
            log_header "Basic Setup Tests"
            run_test "Namespace creation" test_basic_namespace_creation
            run_test "ConfigMap and Secret" test_basic_configmap_secret
            run_test "Service creation" test_basic_service
            run_test "Docker image build" test_docker_image_build
            run_test "Deployment creation" test_basic_deployment
            run_test "Ingress setup" test_ingress_setup
            run_test "Basic connectivity" test_basic_connectivity
            ;;
        --intermediate)
            log_header "Intermediate Setup Tests"
            run_test "Storage resources" test_storage_resources
            run_test "PostgreSQL setup" test_postgresql_setup
            run_test "PostgreSQL connectivity" test_postgresql_connectivity
            run_test "App to PostgreSQL connectivity" test_intermediate_app_connectivity
            ;;
        --performance)
            log_header "Performance Tests"
            run_test "Application scaling" test_scaling
            run_test "Rolling update" test_rolling_update
            run_test "Resource usage verification" test_resource_usage
            ;;
        --cleanup)
            run_test "Resource cleanup" test_cleanup
            ;;
        --help)
            show_usage
            exit 0
            ;;
        --full|"")
            run_test_suite
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    show_test_results
}

# Execute main function
main "$@"