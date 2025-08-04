#!/bin/bash

# Hacky Stack Kubernetes Upgrade to Intermediate Setup Script
# This script migrates from basic (external DB) to intermediate (StatefulSet DB) setup

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
INTERMEDIATE_CONFIG_DIR="k8s/intermediate"
BACKUP_DIR="/tmp/hackystack-migration"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running from project root
    if [ ! -f "package.json" ] || [ ! -d "$INTERMEDIATE_CONFIG_DIR" ]; then
        log_error "This script must be run from the project root directory"
        exit 1
    fi
    
    # Check if kubectl is available
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if basic setup exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Basic setup not found. Please deploy basic setup first with ./scripts/k8s-deploy.sh"
        exit 1
    fi
    
    # Check for pg_dump availability (for backup)
    if ! command -v pg_dump >/dev/null 2>&1; then
        log_warning "pg_dump not found. Database backup will be skipped."
        log_warning "Install PostgreSQL client tools for backup support."
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup directory
setup_backup_directory() {
    log_info "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    log_success "Backup directory created: $BACKUP_DIR"
}

# Extract database URL from current secret
get_current_database_url() {
    log_info "Extracting current database configuration..."
    
    local db_url_b64=$(kubectl get secret hackystack-secrets -n "$NAMESPACE" -o jsonpath='{.data.DATABASE_URL}' 2>/dev/null || echo "")
    
    if [ -z "$db_url_b64" ]; then
        log_error "Cannot find DATABASE_URL in current secrets"
        exit 1
    fi
    
    local db_url=$(echo "$db_url_b64" | base64 -d)
    echo "$db_url"
}

# Backup existing database
backup_database() {
    log_info "Creating database backup..."
    
    local database_url="$1"
    local backup_file="$BACKUP_DIR/hackystack-backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        log_info "Creating SQL dump..."
        
        # Extract connection details from DATABASE_URL
        # Format: postgresql://user:password@host:port/database
        if pg_dump "$database_url" > "$backup_file" 2>/dev/null; then
            log_success "Database backup created: $backup_file"
            
            # Create a compressed version
            gzip -c "$backup_file" > "$backup_file.gz"
            log_success "Compressed backup created: $backup_file.gz"
            
            return 0
        else
            log_warning "pg_dump failed. Backup not created."
            log_warning "Please ensure the external database is accessible"
            return 1
        fi
    else
        log_warning "pg_dump not available. Skipping database backup."
        return 1
    fi
}

# Generate PostgreSQL passwords
generate_postgres_passwords() {
    log_info "Generating PostgreSQL passwords..."
    
    # Generate strong passwords
    POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -base64 32)
    POSTGRES_APP_PASSWORD=$(openssl rand -base64 32)
    
    log_success "PostgreSQL passwords generated"
}

# Base64 encode function
base64_encode() {
    echo -n "$1" | base64
}

# Create PostgreSQL secret
create_postgresql_secret() {
    log_info "Creating PostgreSQL secret..."
    
    # Create DATABASE_URL for the new PostgreSQL service
    local new_database_url="postgresql://hackystack:$POSTGRES_APP_PASSWORD@postgresql-service:5432/hackystack"
    
    # Base64 encode all values
    local postgres_password_b64=$(base64_encode "$POSTGRES_SUPERUSER_PASSWORD")
    local postgres_app_password_b64=$(base64_encode "$POSTGRES_APP_PASSWORD")
    local database_url_b64=$(base64_encode "$new_database_url")
    
    # Create temporary secret file with actual values
    local temp_secret="$BACKUP_DIR/postgresql-secret.yaml"
    sed -e "s|POSTGRES_PASSWORD: \"\"|POSTGRES_PASSWORD: \"$postgres_password_b64\"|g" \
        -e "s|POSTGRES_APP_PASSWORD: \"\"|POSTGRES_APP_PASSWORD: \"$postgres_app_password_b64\"|g" \
        -e "s|DATABASE_URL: \"\"|DATABASE_URL: \"$database_url_b64\"|g" \
        "$INTERMEDIATE_CONFIG_DIR/postgresql-secret.yaml" > "$temp_secret"
    
    kubectl apply -f "$temp_secret" || {
        log_error "Failed to create PostgreSQL secret"
        exit 1
    }
    
    # Securely remove temporary file
    rm -f "$temp_secret"
    log_success "PostgreSQL secret created"
}

# Create storage resources
create_storage_resources() {
    log_info "Creating storage resources..."
    
    # Create storage directory on Minikube node
    log_info "Creating storage directory on Minikube node..."
    minikube ssh 'sudo mkdir -p /mnt/data/postgresql && sudo chmod 777 /mnt/data/postgresql' || {
        log_error "Failed to create storage directory"
        exit 1
    }
    
    # Apply storage resources
    kubectl apply -f "$INTERMEDIATE_CONFIG_DIR/persistent-volume.yaml" || {
        log_error "Failed to create storage resources"
        exit 1
    }
    
    log_success "Storage resources created"
}

# Deploy PostgreSQL
deploy_postgresql() {
    log_info "Deploying PostgreSQL StatefulSet..."
    
    # Apply ConfigMap
    kubectl apply -f "$INTERMEDIATE_CONFIG_DIR/postgresql-configmap.yaml" || {
        log_error "Failed to create PostgreSQL ConfigMap"
        exit 1
    }
    
    # Apply Services
    kubectl apply -f "$INTERMEDIATE_CONFIG_DIR/postgresql-service.yaml" || {
        log_error "Failed to create PostgreSQL services"
        exit 1
    }
    
    # Apply StatefulSet
    kubectl apply -f "$INTERMEDIATE_CONFIG_DIR/postgresql-statefulset.yaml" || {
        log_error "Failed to create PostgreSQL StatefulSet"
        exit 1
    }
    
    log_success "PostgreSQL resources deployed"
}

# Wait for PostgreSQL to be ready
wait_for_postgresql() {
    log_info "Waiting for PostgreSQL to be ready..."
    
    # Wait for StatefulSet to be ready
    kubectl wait --for=condition=ready --timeout=300s \
        pod/postgresql-0 -n "$NAMESPACE" || {
        log_error "PostgreSQL failed to become ready within 5 minutes"
        log_info "Check PostgreSQL status with: kubectl get pods -n $NAMESPACE"
        log_info "Check PostgreSQL logs with: kubectl logs postgresql-0 -n $NAMESPACE"
        exit 1
    }
    
    # Additional readiness check
    log_info "Verifying PostgreSQL connectivity..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if kubectl exec postgresql-0 -n "$NAMESPACE" -- pg_isready -U hackystack -d hackystack >/dev/null 2>&1; then
            log_success "PostgreSQL is ready and accepting connections"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: PostgreSQL not ready yet..."
        sleep 10
        ((attempt++))
    done
    
    log_error "PostgreSQL failed to accept connections after $max_attempts attempts"
    exit 1
}

# Restore database data
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_warning "No backup file found. Skipping data restoration."
        log_info "You may need to run database migrations manually."
        return 0
    fi
    
    log_info "Restoring database data..."
    
    # Copy backup file to PostgreSQL pod
    local pod_backup_path="/tmp/backup.sql"
    kubectl cp "$backup_file" "$NAMESPACE/postgresql-0:$pod_backup_path" || {
        log_error "Failed to copy backup file to PostgreSQL pod"
        exit 1
    }
    
    # Restore database
    kubectl exec postgresql-0 -n "$NAMESPACE" -- \
        psql -U hackystack -d hackystack -f "$pod_backup_path" || {
        log_warning "Database restoration encountered issues"
        log_warning "You may need to restore data manually or run migrations"
    }
    
    # Clean up backup file from pod
    kubectl exec postgresql-0 -n "$NAMESPACE" -- rm -f "$pod_backup_path" || true
    
    log_success "Database restoration completed"
}

# Update application configuration
update_application_config() {
    log_info "Updating application configuration..."
    
    # Get the new DATABASE_URL from PostgreSQL secret
    local new_db_url_b64=$(kubectl get secret postgresql-secret -n "$NAMESPACE" -o jsonpath='{.data.DATABASE_URL}')
    
    # Update the application secret with the new DATABASE_URL
    kubectl patch secret hackystack-secrets -n "$NAMESPACE" \
        -p "{\"data\":{\"DATABASE_URL\":\"$new_db_url_b64\"}}" || {
        log_error "Failed to update application configuration"
        exit 1
    }
    
    log_success "Application configuration updated"
}

# Restart application
restart_application() {
    log_info "Restarting application to use new database..."
    
    kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE" || {
        log_error "Failed to restart application"
        exit 1
    }
    
    # Wait for rollout to complete
    kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=300s || {
        log_error "Application restart failed"
        exit 1
    }
    
    log_success "Application restarted successfully"
}

# Verify migration
verify_migration() {
    log_info "Verifying migration..."
    
    # Check if pods are running
    local app_pods_running=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | grep -c "Running" || echo "0")
    local pg_pods_running=$(kubectl get pods -n "$NAMESPACE" -l app=postgresql --no-headers | grep -c "Running" || echo "0")
    
    if [ "$app_pods_running" -gt 0 ] && [ "$pg_pods_running" -gt 0 ]; then
        log_success "All pods are running ($app_pods_running app pods, $pg_pods_running PostgreSQL pods)"
    else
        log_error "Some pods are not running"
        kubectl get pods -n "$NAMESPACE"
        return 1
    fi
    
    # Test application connectivity
    log_info "Testing application connectivity..."
    sleep 10  # Allow time for application to fully start
    
    if curl -k -s -o /dev/null -w "%{http_code}" https://hackystack.local/api/health | grep -q "200"; then
        log_success "Application is accessible and responding"
    else
        log_warning "Application connectivity test failed"
        log_info "The application may still be starting up"
    fi
    
    # Test database connectivity from application
    log_info "Testing database connectivity from application..."
    local app_pod=$(kubectl get pods -n "$NAMESPACE" -l app=hackystack --no-headers | head -1 | awk '{print $1}')
    
    if [ -n "$app_pod" ]; then
        if kubectl exec "$app_pod" -n "$NAMESPACE" -- timeout 5 nc -z postgresql-service 5432 >/dev/null 2>&1; then
            log_success "Application can connect to PostgreSQL"
        else
            log_warning "Application cannot connect to PostgreSQL"
        fi
    fi
    
    log_success "Migration verification completed"
}

# Show migration summary
show_migration_summary() {
    log_header "=== MIGRATION SUMMARY ==="
    
    echo ""
    log_info "Migration completed successfully!"
    
    echo ""
    echo "What changed:"
    echo "  ✓ PostgreSQL now runs as a StatefulSet in Kubernetes"
    echo "  ✓ Database data is persisted using PersistentVolumes"
    echo "  ✓ Application configuration updated to use internal PostgreSQL"
    echo "  ✓ Backup created at: $BACKUP_DIR"
    
    echo ""
    log_info "New resources:"
    kubectl get all,pv,pvc -n "$NAMESPACE" -l app=postgresql
    
    echo ""
    log_info "Database connection details:"
    echo "  Internal service: postgresql-service:5432"
    echo "  Database name: hackystack"
    echo "  Username: hackystack"
    echo "  Password: [stored in postgresql-secret]"
    
    echo ""
    log_info "Useful commands:"
    echo "  - Connect to PostgreSQL: kubectl exec -it postgresql-0 -n $NAMESPACE -- psql -U hackystack -d hackystack"
    echo "  - View PostgreSQL logs: kubectl logs postgresql-0 -n $NAMESPACE -f"
    echo "  - Backup database: kubectl exec postgresql-0 -n $NAMESPACE -- pg_dump -U hackystack hackystack > backup.sql"
    echo "  - Monitor StatefulSet: kubectl get statefulset -n $NAMESPACE"
    
    echo ""
    log_success "Your application now uses a production-like database setup!"
}

# Rollback function
rollback_migration() {
    log_warning "Rolling back migration..."
    
    echo ""
    log_info "Rollback steps:"
    echo "1. Restore original application configuration"
    echo "2. Remove PostgreSQL resources"
    echo "3. Restart application"
    
    echo ""
    echo -n "Continue with rollback? (y/n): "
    read -r rollback_confirm
    
    if [[ ! $rollback_confirm =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        return 0
    fi
    
    # Try to restore original DATABASE_URL if backup exists
    local original_secret_backup="$BACKUP_DIR/original-secret.yaml"
    if [ -f "$original_secret_backup" ]; then
        log_info "Restoring original application configuration..."
        kubectl apply -f "$original_secret_backup" || log_warning "Failed to restore original secret"
    fi
    
    # Remove PostgreSQL resources
    log_info "Removing PostgreSQL resources..."
    kubectl delete statefulset postgresql -n "$NAMESPACE" || true
    kubectl delete service postgresql-service postgresql-headless -n "$NAMESPACE" || true
    kubectl delete configmap postgresql-config -n "$NAMESPACE" || true
    kubectl delete secret postgresql-secret -n "$NAMESPACE" || true
    kubectl delete pvc postgresql-data-postgresql-0 -n "$NAMESPACE" || true
    
    # Restart application
    log_info "Restarting application..."
    kubectl rollout restart deployment/"$APP_NAME" -n "$NAMESPACE" || true
    
    log_success "Rollback completed. Please verify your application is working."
}

# Cleanup function for errors
cleanup_on_error() {
    log_error "Migration failed!"
    
    echo ""
    log_info "Error occurred during migration. You have the following options:"
    echo "1. View detailed error information"
    echo "2. Attempt automatic rollback"
    echo "3. Exit and troubleshoot manually"
    
    echo ""
    echo -n "Select option (1/2/3): "
    read -r error_option
    
    case $error_option in
        1)
            echo ""
            log_info "PostgreSQL pod status:"
            kubectl get pods -n "$NAMESPACE" -l app=postgresql || true
            
            echo ""
            log_info "PostgreSQL logs:"
            kubectl logs postgresql-0 -n "$NAMESPACE" --tail=20 || true
            
            echo ""
            log_info "Application pod status:"
            kubectl get pods -n "$NAMESPACE" -l app=hackystack || true
            
            echo ""
            log_info "Recent events:"
            kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp --tail=10 || true
            ;;
        2)
            rollback_migration
            ;;
        3)
            log_info "Manual troubleshooting required"
            log_info "Backup directory: $BACKUP_DIR"
            ;;
    esac
}

# Main execution
main() {
    echo "=================================================="
    echo "    Hacky Stack Kubernetes Upgrade Script"
    echo "      Basic → Intermediate (StatefulSet)"
    echo "=================================================="
    echo ""
    
    log_warning "This will migrate your setup to use PostgreSQL StatefulSet"
    log_warning "This process involves:"
    echo "  1. Backing up your current database"
    echo "  2. Deploying PostgreSQL StatefulSet"
    echo "  3. Migrating data to the new database"
    echo "  4. Updating application configuration"
    echo ""
    
    echo -n "Continue with migration? (y/n): "
    read -r migrate_confirm
    
    if [[ ! $migrate_confirm =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled"
        exit 0
    fi
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Create backup of current secret for rollback
    kubectl get secret hackystack-secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/original-secret.yaml" 2>/dev/null || true
    
    # Run migration steps
    check_prerequisites
    setup_backup_directory
    
    local current_database_url=$(get_current_database_url)
    backup_database "$current_database_url"
    
    generate_postgres_passwords
    create_postgresql_secret
    create_storage_resources
    deploy_postgresql
    wait_for_postgresql
    
    # Find backup file for restoration
    local backup_file=$(find "$BACKUP_DIR" -name "hackystack-backup-*.sql" | head -1)
    restore_database "$backup_file"
    
    update_application_config
    restart_application
    verify_migration
    show_migration_summary
    
    log_success "Migration to intermediate setup completed successfully!"
}

# Execute main function
main "$@"