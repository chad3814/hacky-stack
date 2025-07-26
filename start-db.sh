#!/bin/bash

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Find an available port starting from 5432
find_available_port() {
    local port=5432
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt 5532 ]; then
            echo "Error: Could not find an available port between 5432-5532"
            exit 1
        fi
    done
    echo $port
}

# Get available port
DB_PORT=$(find_available_port)
echo "Using port: $DB_PORT"

# Update .env file with the correct DATABASE_URL
DATABASE_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/HackyStack"

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Update DATABASE_URL in .env file
if grep -q "^DATABASE_URL=" .env; then
    # Replace existing DATABASE_URL
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
else
    # Add DATABASE_URL if it doesn't exist
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
fi

echo "Updated DATABASE_URL in .env to: $DATABASE_URL"

# Export DB_PORT for docker-compose
export DB_PORT=$DB_PORT

# Start docker-compose
echo "Starting PostgreSQL database on port $DB_PORT..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    counter=$((counter + 1))
    sleep 1
done

if [ $counter -eq $timeout ]; then
    echo "Error: Database failed to start within $timeout seconds"
    exit 1
fi

echo "PostgreSQL is running on port $DB_PORT"
echo "Connection string: $DATABASE_URL"