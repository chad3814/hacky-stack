#!/bin/bash

# Health check script for Docker and Kubernetes
# Usage: ./health-check.sh [live|ready|health] [port] [timeout]

set -euo pipefail

# Default values
CHECK_TYPE="${1:-health}"
PORT="${2:-3000}"
TIMEOUT="${3:-10}"
HOST="${HOST:-localhost}"

# Health check endpoints
case "$CHECK_TYPE" in
  "live"|"liveness")
    ENDPOINT="/api/health/live"
    ;;
  "ready"|"readiness")
    ENDPOINT="/api/health/ready"
    ;;
  "health"|"healthz")
    ENDPOINT="/api/health"
    ;;
  *)
    echo "ERROR: Invalid check type '$CHECK_TYPE'. Use: live, ready, or health"
    exit 1
    ;;
esac

URL="http://${HOST}:${PORT}${ENDPOINT}"

# Function to check health
check_health() {
  local response
  local http_code

  # Use curl with timeout and capture both response and HTTP code
  if command -v curl >/dev/null 2>&1; then
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "HTTPSTATUS:000")
  else
    echo "ERROR: curl is not available"
    exit 1
  fi

  # Extract HTTP code
  http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

  # Extract response body
  body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

  # Check HTTP status code
  case "$http_code" in
    "200")
      echo "✓ Health check passed ($CHECK_TYPE)"
      if [ -n "$body" ] && command -v jq >/dev/null 2>&1; then
        echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "Status: healthy"
      fi
      exit 0
      ;;
    "503")
      echo "✗ Health check failed ($CHECK_TYPE) - Service Unavailable"
      if [ -n "$body" ] && command -v jq >/dev/null 2>&1; then
        echo "$body" | jq -r '.error // "Service unavailable"' 2>/dev/null || echo "Service unavailable"
      fi
      exit 1
      ;;
    "000")
      echo "✗ Health check failed ($CHECK_TYPE) - Connection failed or timeout"
      exit 1
      ;;
    *)
      echo "✗ Health check failed ($CHECK_TYPE) - HTTP $http_code"
      exit 1
      ;;
  esac
}

# Function to show usage
show_usage() {
  cat << EOF
Health Check Script for HackyStack

Usage: $0 [CHECK_TYPE] [PORT] [TIMEOUT]

Arguments:
  CHECK_TYPE    Type of health check (live, ready, health) [default: health]
  PORT          Port number [default: 3000]
  TIMEOUT       Timeout in seconds [default: 10]

Environment Variables:
  HOST          Host to check [default: localhost]

Examples:
  $0                          # Basic health check
  $0 live                     # Liveness check
  $0 ready                    # Readiness check
  $0 health 3000 5           # Health check on port 3000 with 5s timeout
  HOST=app-service $0 ready   # Check readiness of remote service

Exit Codes:
  0 - Health check passed
  1 - Health check failed
EOF
}

# Show help if requested
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  show_usage
  exit 0
fi

# Validate port number
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "ERROR: Invalid port number '$PORT'"
  exit 1
fi

# Validate timeout
if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [ "$TIMEOUT" -lt 1 ]; then
  echo "ERROR: Invalid timeout '$TIMEOUT'"
  exit 1
fi

# Perform the health check
echo "Performing $CHECK_TYPE check on $URL (timeout: ${TIMEOUT}s)"
check_health
