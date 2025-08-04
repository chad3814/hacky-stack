#!/bin/bash

# Hacky Stack Kubernetes Management Script
# Interactive menu for ongoing Kubernetes operations

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
APP_NAME="hackystack-app"

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

# Check if kubectl can connect
check_cluster_connection() {
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please ensure Minikube is running: ./scripts/k8s-setup.sh"
        exit 1
    fi
}

# Check if namespace exists
check_namespace() {
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace '$NAMESPACE' not found"
        log_error "Please deploy the application first: ./scripts/k8s-deploy.sh"
        exit 1
    fi
}

# Show main menu
show_menu() {
    clear
    echo "=================================================="
    echo "      Hacky Stack Kubernetes Management"
    echo "=================================================="
    echo ""
    echo "1.  Status Overview"
    echo "2.  View Logs"
    echo "3.  Scale Application"
    echo "4.  Update Application"
    echo "5.  Restart Application"
    echo "6.  Update Configuration"
    echo "7.  Test Connectivity"
    echo "8.  Port Forward"
    echo "9.  Resource Usage"
    echo "10. Debug Information"
    echo "11. Cleanup Resources"
    echo "12. Minikube Dashboard"
    echo ""
    echo "0.  Exit"
    echo ""
    echo -n "Select an option: "
}

# Status overview
show_status() {
    log_header "=== STATUS OVERVIEW ==="
    
    echo ""
    log_info "Namespace Resources:"
    kubectl get all -n "$NAMESPACE" || log_error "Failed to get resources"
    
    echo ""
    log_info "ConfigMaps and Secrets:"
    kubectl get configmap,secret -n "$NAMESPACE" || log_error "Failed to get configmaps/secrets"
    
    echo ""
    log_info "Ingress Information:"
    kubectl get ingress -n "$NAMESPACE" -o wide || log_error "Failed to get ingress"
    
    echo ""
    log_info "Pod Details:"
    kubectl get pods -n "$NAMESPACE" -o wide || log_error "Failed to get pods"
    
    # Check pod health
    echo ""
    log_info "Pod Health Status:"
    local running_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    local total_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$running_pods" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
        log_success "All $total_pods pods are running"
    elif [ "$total_pods" -eq 0 ]; then
        log_warning "No pods found"
    else
        log_warning "$running_pods out of $total_pods pods are running"
    fi
    
    # Check external access
    echo ""
    log_info "External Access Test:"
    if curl -k -s -o /dev/null -w "%{http_code}" https://hackystack.local/api/health 2>/dev/null | grep -q "200"; then
        log_success "Application is accessible at https://hackystack.local"
    else
        log_warning "Application is not accessible externally"
    fi
}

# View logs
view_logs() {
    log_header "=== APPLICATION LOGS ==="
    
    echo ""
    echo "1. Current logs (last 50 lines)"
    echo "2. Follow logs in real-time"
    echo "3. Previous pod logs (if pod restarted)"
    echo "4. Logs from specific pod"
    echo ""
    echo -n "Select log option: "
    read -r log_option
    
    case $log_option in
        1)
            log_info "Showing current logs (last 50 lines):"
            kubectl logs -l app=hackystack -n "$NAMESPACE" --tail=50
            ;;
        2)
            log_info "Following logs in real-time (Ctrl+C to stop):"
            kubectl logs -l app=hackystack -n "$NAMESPACE" -f
            ;;
        3)
            log_info "Showing previous pod logs:"
            kubectl logs -l app=hackystack -n "$NAMESPACE" --previous
            ;;
        4)
            echo ""
            log_info "Available pods:"
            kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | awk '{print NR ". " $1}'
            echo ""
            echo -n "Enter pod number: "
            read -r pod_num
            local pod_name=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | sed -n "${pod_num}p" | awk '{print $1}')
            if [ -n "$pod_name" ]; then
                log_info "Showing logs for pod: $pod_name"
                kubectl logs "$pod_name" -n "$NAMESPACE" --tail=100
            else
                log_error "Invalid pod number"
            fi
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
}

# Scale application
scale_application() {
    log_header "=== SCALE APPLICATION ==="
    
    local current_replicas=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    log_info "Current replicas: $current_replicas"
    
    echo ""
    echo -n "Enter new replica count (1-10): "
    read -r new_replicas
    
    if [[ ! "$new_replicas" =~ ^[1-9]$|^10$ ]]; then
        log_error "Invalid replica count. Must be between 1 and 10."
        return 1
    fi
    
    log_info "Scaling application to $new_replicas replicas..."
    kubectl scale deployment "$APP_NAME" --replicas="$new_replicas" -n "$NAMESPACE"
    
    if [ $? -eq 0 ]; then
        log_success "Scaling initiated"
        log_info "Waiting for rollout to complete..."
        kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=300s
        log_success "Application scaled successfully"
    else
        log_error "Failed to scale application"
    fi
}

# Update application
update_application() {
    log_header "=== UPDATE APPLICATION ==="
    
    echo ""
    echo "Available update options:"
    echo "1. Update to new image tag"
    echo "2. Restart with same image (rolling restart)"
    echo ""
    echo -n "Select update option: "
    read -r update_option
    
    case $update_option in
        1)
            echo ""
            echo -n "Enter new image tag (e.g., hackystack:v2): "
            read -r new_image
            
            if [ -z "$new_image" ]; then
                log_error "Image tag cannot be empty"
                return 1
            fi
            
            log_info "Updating deployment to use image: $new_image"
            log_warning "Make sure the image is loaded in Minikube: minikube image load $new_image"
            
            echo ""
            echo -n "Continue with update? (y/n): "
            read -r confirm
            if [[ ! $confirm =~ ^[Yy]$ ]]; then
                log_info "Update cancelled"
                return 0
            fi
            
            kubectl set image deployment/"$APP_NAME" hackystack-app="$new_image" -n "$NAMESPACE"
            ;;
        2)
            log_info "Performing rolling restart..."
            kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE"
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Update initiated"
        log_info "Watching rollout progress..."
        kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=300s
        log_success "Application updated successfully"
    else
        log_error "Failed to update application"
    fi
}

# Update configuration
update_configuration() {
    log_header "=== UPDATE CONFIGURATION ==="
    
    echo ""
    echo "Configuration update options:"
    echo "1. Edit ConfigMap (non-sensitive config)"
    echo "2. Update Secret (sensitive config)"
    echo "3. View current configuration"
    echo ""
    echo -n "Select option: "
    read -r config_option
    
    case $config_option in
        1)
            log_info "Opening ConfigMap for editing..."
            kubectl edit configmap hackystack-config -n "$NAMESPACE"
            
            echo ""
            echo -n "Restart pods to apply changes? (y/n): "
            read -r restart_confirm
            if [[ $restart_confirm =~ ^[Yy]$ ]]; then
                kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE"
                log_success "Configuration updated and pods restarted"
            fi
            ;;
        2)
            log_warning "Editing secrets directly is not recommended for security reasons"
            log_info "Consider redeploying with updated secrets using k8s-deploy.sh"
            
            echo ""
            echo -n "Continue editing secret anyway? (y/n): "
            read -r secret_confirm
            if [[ $secret_confirm =~ ^[Yy]$ ]]; then
                kubectl edit secret hackystack-secrets -n "$NAMESPACE"
                
                echo ""
                echo -n "Restart pods to apply changes? (y/n): "
                read -r restart_confirm
                if [[ $restart_confirm =~ ^[Yy]$ ]]; then
                    kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE"
                    log_success "Configuration updated and pods restarted"
                fi
            fi
            ;;
        3)
            echo ""
            log_info "Current ConfigMap:"
            kubectl get configmap hackystack-config -n "$NAMESPACE" -o yaml
            
            echo ""
            log_info "Current Secret (keys only):"
            kubectl get secret hackystack-secrets -n "$NAMESPACE" -o jsonpath='{.data}' | jq -r 'keys[]' 2>/dev/null || echo "Unable to display secret keys"
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
}

# Test connectivity
test_connectivity() {
    log_header "=== CONNECTIVITY TESTS ==="
    
    echo ""
    log_info "Testing internal service connectivity..."
    
    local test_pod=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | head -1 | awk '{print $1}')
    
    if [ -n "$test_pod" ]; then
        if kubectl exec -n "$NAMESPACE" "$test_pod" -- curl -s -o /dev/null -w "%{http_code}" http://hackystack-service:3000/api/health 2>/dev/null | grep -q "200"; then
            log_success "Internal service connectivity: OK"
        else
            log_error "Internal service connectivity: FAILED"
        fi
    else
        log_warning "No pods available for internal connectivity test"
    fi
    
    echo ""
    log_info "Testing external connectivity via ingress..."
    local response_code=$(curl -k -s -o /dev/null -w "%{http_code}" https://hackystack.local/api/health 2>/dev/null || echo "000")
    
    if [ "$response_code" = "200" ]; then
        log_success "External connectivity: OK (HTTP $response_code)"
    else
        log_error "External connectivity: FAILED (HTTP $response_code)"
        
        echo ""
        log_info "Debugging external connectivity:"
        
        # Check ingress
        local ingress_ready=$(kubectl get ingress hackystack-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [ -n "$ingress_ready" ]; then
            log_info "Ingress has IP: $ingress_ready"
        else
            log_warning "Ingress IP not assigned"
        fi
        
        # Check DNS
        if grep -q "hackystack.local" /etc/hosts; then
            log_success "DNS entry exists in /etc/hosts"
        else
            log_error "DNS entry missing from /etc/hosts"
        fi
    fi
    
    echo ""
    log_info "Testing database connectivity..."
    if [ -n "$test_pod" ]; then
        # Try to connect to database (this will fail if DB is not accessible, but that's expected for external DB)
        local db_test_result=$(kubectl exec -n "$NAMESPACE" "$test_pod" -- timeout 5 nc -z \$(echo \$DATABASE_URL | sed 's/.*@//;s/:.*//' | head -1) 5432 2>/dev/null && echo "OK" || echo "FAILED")
        if [ "$db_test_result" = "OK" ]; then
            log_success "Database port is reachable"
        else
            log_warning "Database connectivity test inconclusive (expected for external databases)"
        fi
    fi
}

# Port forward
port_forward() {
    log_header "=== PORT FORWARDING ==="
    
    echo ""
    log_info "This will forward local port 3000 to the application service"
    log_info "You can then access the app at: http://localhost:3000"
    log_warning "Press Ctrl+C to stop port forwarding"
    
    echo ""
    echo -n "Start port forwarding? (y/n): "
    read -r pf_confirm
    
    if [[ $pf_confirm =~ ^[Yy]$ ]]; then
        log_info "Starting port forward (Ctrl+C to stop)..."
        kubectl port-forward svc/hackystack-service 3000:3000 -n "$NAMESPACE"
    fi
}

# Resource usage
show_resource_usage() {
    log_header "=== RESOURCE USAGE ==="
    
    echo ""
    log_info "Node Resources:"
    kubectl top nodes 2>/dev/null || log_warning "Metrics server not available"
    
    echo ""
    log_info "Pod Resources:"
    kubectl top pods -n "$NAMESPACE" 2>/dev/null || log_warning "Metrics server not available"
    
    echo ""
    log_info "Pod Resource Requests and Limits:"
    kubectl describe pods -l app=hackystack -n "$NAMESPACE" | grep -A 5 "Requests:"
    
    echo ""
    log_info "Persistent Volumes:"
    kubectl get pv 2>/dev/null || log_info "No persistent volumes"
    
    echo ""
    log_info "Storage Usage:"
    kubectl get pvc -n "$NAMESPACE" 2>/dev/null || log_info "No persistent volume claims"
}

# Debug information
show_debug_info() {
    log_header "=== DEBUG INFORMATION ==="
    
    echo ""
    log_info "Cluster Information:"
    kubectl cluster-info
    
    echo ""
    log_info "Node Status:"
    kubectl get nodes -o wide
    
    echo ""
    log_info "Namespace Events:"
    kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp
    
    echo ""
    log_info "Pod Details:"
    kubectl describe pods -l app=hackystack -n "$NAMESPACE"
    
    echo ""
    log_info "Service Details:"
    kubectl describe service hackystack-service -n "$NAMESPACE"
    
    echo ""
    log_info "Ingress Details:"
    kubectl describe ingress hackystack-ingress -n "$NAMESPACE"
    
    echo ""
    log_info "Ingress Controller Status:"
    kubectl get pods -n ingress-nginx
}

# Cleanup resources
cleanup_resources() {
    log_header "=== CLEANUP RESOURCES ==="
    
    echo ""
    log_warning "This will delete all Hacky Stack resources from Kubernetes"
    log_warning "This action cannot be undone!"
    
    echo ""
    echo "Cleanup options:"
    echo "1. Remove application only (keep namespace and configs)"
    echo "2. Remove entire namespace (complete cleanup)"
    echo "3. Cancel"
    echo ""
    echo -n "Select cleanup option: "
    read -r cleanup_option
    
    case $cleanup_option in
        1)
            echo ""
            echo -n "Remove application deployment and service? (y/n): "
            read -r confirm1
            if [[ $confirm1 =~ ^[Yy]$ ]]; then
                log_info "Removing application deployment and service..."
                kubectl delete deployment "$APP_NAME" -n "$NAMESPACE" || true
                kubectl delete service hackystack-service -n "$NAMESPACE" || true
                kubectl delete ingress hackystack-ingress -n "$NAMESPACE" || true
                log_success "Application removed"
            fi
            ;;
        2)
            echo ""
            echo -n "Remove entire namespace and all resources? (y/n): "
            read -r confirm2
            if [[ $confirm2 =~ ^[Yy]$ ]]; then
                log_info "Removing entire namespace..."
                kubectl delete namespace "$NAMESPACE"
                log_success "Namespace and all resources removed"
            fi
            ;;
        3)
            log_info "Cleanup cancelled"
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
}

# Open Minikube dashboard
open_dashboard() {
    log_header "=== MINIKUBE DASHBOARD ==="
    
    echo ""
    log_info "Opening Minikube dashboard in your browser..."
    log_info "This provides a web UI for managing your Kubernetes cluster"
    log_warning "Press Ctrl+C in the terminal to stop the dashboard when done"
    
    echo ""
    echo -n "Open dashboard? (y/n): "
    read -r dashboard_confirm
    
    if [[ $dashboard_confirm =~ ^[Yy]$ ]]; then
        minikube dashboard
    fi
}

# Main menu loop
main() {
    # Check prerequisites
    check_cluster_connection
    check_namespace
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1) show_status ;;
            2) view_logs ;;
            3) scale_application ;;
            4) update_application ;;
            5) 
                log_info "Restarting application..."
                kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE"
                kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE"
                log_success "Application restarted"
                ;;
            6) update_configuration ;;
            7) test_connectivity ;;
            8) port_forward ;;
            9) show_resource_usage ;;
            10) show_debug_info ;;
            11) cleanup_resources ;;
            12) open_dashboard ;;
            0) 
                log_info "Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please try again."
                ;;
        esac
        
        if [ "$choice" != "8" ] && [ "$choice" != "12" ]; then
            echo ""
            echo -n "Press Enter to continue..."
            read -r
        fi
    done
}

# Execute main function
main "$@"