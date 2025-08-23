#!/bin/bash

# AxieStudio with Embedded Ollama Startup Script
# This script starts both Ollama and AxieStudio services

set -e

echo "🚀 Starting AxieStudio with Embedded Ollama..."

# Function to check if Ollama is running
check_ollama() {
    curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1
}

# Function to wait for Ollama to be ready
wait_for_ollama() {
    echo "⏳ Waiting for Ollama to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_ollama; then
            echo "✅ Ollama is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - Ollama not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Ollama failed to start within timeout"
    return 1
}

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$OLLAMA_PID" ]; then
        kill $OLLAMA_PID 2>/dev/null || true
        wait $OLLAMA_PID 2>/dev/null || true
    fi
    if [ ! -z "$AXIESTUDIO_PID" ]; then
        kill $AXIESTUDIO_PID 2>/dev/null || true
        wait $AXIESTUDIO_PID 2>/dev/null || true
    fi
    echo "✅ Cleanup completed"
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start Ollama in background
echo "🔧 Starting Ollama service..."
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_HOME=/app/ollama-data
export OLLAMA_MODELS=/app/ollama-data
export OLLAMA_LOGS=1

# Create necessary directories
mkdir -p /app/ollama-data
mkdir -p /app/data/logs

ollama serve > /app/data/logs/ollama.log 2>&1 &
OLLAMA_PID=$!

echo "📝 Ollama PID: $OLLAMA_PID"

# Wait for Ollama to be ready
if ! wait_for_ollama; then
    echo "❌ Failed to start Ollama service"
    cleanup
    exit 1
fi

# Verify Gemma2 2B model is available
echo "🔍 Checking for Gemma2 2B model..."
if ! ollama list | grep -q "gemma2:2b"; then
    echo "📥 Downloading Gemma2 2B model (this may take a few minutes)..."
    echo "📊 Model size: ~1.6GB"

    # Download with progress indication
    if ollama pull gemma2:2b; then
        echo "✅ Gemma2 2B model downloaded successfully"
        echo "📊 Available models:"
        ollama list
    else
        echo "❌ Failed to download Gemma2 2B model"
        echo "⚠️ Continuing without pre-installed model..."
        echo "💡 You can download models later through the AxieStudio UI"
    fi
else
    echo "✅ Gemma2 2B model is available"
    echo "📊 Available models:"
    ollama list
fi

# Start AxieStudio
echo "🚀 Starting AxieStudio..."
axiestudio run --host $AXIESTUDIO_HOST --port $AXIESTUDIO_PORT &
AXIESTUDIO_PID=$!

echo "📝 AxieStudio PID: $AXIESTUDIO_PID"
echo "🌐 AxieStudio will be available at http://$AXIESTUDIO_HOST:$AXIESTUDIO_PORT"
echo "🤖 Embedded Ollama available at http://127.0.0.1:11434"

# Wait for either process to exit
wait $AXIESTUDIO_PID
AXIESTUDIO_EXIT_CODE=$?

echo "🛑 AxieStudio exited with code: $AXIESTUDIO_EXIT_CODE"
cleanup
exit $AXIESTUDIO_EXIT_CODE
