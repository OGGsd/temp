# 🤖 AxieStudio Embedded Ollama Integration

AxieStudio now includes **embedded Ollama** functionality, allowing users to run local LLMs directly within the application without needing to manage external Ollama installations.

## 🎯 **Key Features**

### ✅ **Built-in Ollama**
- Ollama runs inside the AxieStudio Docker container
- No need for users to install or manage separate Ollama instances
- Automatic startup and lifecycle management

### ✅ **Pre-installed Model**
- **Gemma2 2B** model comes pre-downloaded (1.6GB)
- Optimized for speed and efficiency
- Perfect balance of performance and resource usage

### ✅ **Settings Management**
- New **"Local LLMs"** section in Settings
- Download and manage models through the UI
- View model status and resource usage
- Recommended models with size and use case information

### ✅ **Auto-Detection**
- Ollama components automatically detect embedded instance
- Seamless fallback to external Ollama if needed
- Zero configuration required for basic usage

## 🚀 **Quick Start**

### **1. Build and Run**
```bash
# Build the Docker image with embedded Ollama
docker-compose build

# Start AxieStudio with embedded Ollama
docker-compose up -d

# Check logs to see Ollama startup
docker-compose logs -f axiestudio
```

### **2. Access Local LLMs Settings**
1. Open AxieStudio at `http://localhost:7860`
2. Go to **Settings** → **Local LLMs**
3. View Ollama status and manage models

### **3. Use in Flows**
1. Add an **Ollama** component to your flow
2. Leave **Base URL** empty (auto-detects embedded instance)
3. Select **gemma2:2b** from the Model Name dropdown
4. Your flow now uses the embedded local LLM!

## 📊 **Resource Requirements**

### **Minimum System Requirements**
- **RAM**: 8GB total (4GB reserved for AxieStudio + Ollama)
- **CPU**: 4 cores recommended
- **Disk**: 10GB free space for models
- **Docker**: Version 20.10+ with Compose V2

### **Resource Allocation**
```yaml
deploy:
  resources:
    limits:
      memory: 8G      # Total container limit
      cpus: '4'       # CPU cores
    reservations:
      memory: 4G      # Guaranteed minimum
      cpus: '2'       # Reserved cores
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Enable embedded Ollama (default: true)
AXIESTUDIO_EMBEDDED_OLLAMA=true

# Ollama host and port (default: 127.0.0.1:11434)
OLLAMA_HOST=127.0.0.1:11434

# Model storage directory (default: /app/ollama-data)
OLLAMA_DATA_DIR=/app/ollama-data

# Default model (default: gemma2:2b)
AXIESTUDIO_OLLAMA_DEFAULT_MODEL=gemma2:2b
```

### **Docker Volumes**
```yaml
volumes:
  - axiestudio_data:/app/data        # AxieStudio data
  - ollama_data:/app/ollama-data     # Ollama models (persistent)
```

## 📋 **Available Models**

### **Pre-installed**
- **gemma2:2b** (1.6GB) - Google's efficient 2B parameter model

### **Recommended for Download**
| Model | Size | Description | Use Case |
|-------|------|-------------|----------|
| **llama3.2:3b** | 2.0GB | Meta's latest 3B model | Balanced performance |
| **phi3:mini** | 2.3GB | Microsoft's reasoning model | Code generation |
| **qwen2.5:3b** | 2.0GB | Alibaba's multilingual model | Multilingual tasks |
| **tinyllama:1.1b** | 0.7GB | Ultra-lightweight model | Resource-constrained |

## 🛠️ **API Endpoints**

### **Status and Health**
```bash
# Get Ollama service status
GET /api/v1/local-llms/status

# Response
{
  "status": "healthy",
  "is_running": true,
  "is_embedded": true,
  "base_url": "http://127.0.0.1:11434",
  "models_count": 1,
  "models": ["gemma2:2b"]
}
```

### **Model Management**
```bash
# List installed models
GET /api/v1/local-llms/models

# Download a model
POST /api/v1/local-llms/models/pull
{
  "model_name": "llama3.2:3b"
}

# Delete a model
DELETE /api/v1/local-llms/models/{model_name}

# Get recommended models
GET /api/v1/local-llms/recommended-models
```

## 🧪 **Testing**

### **Run Test Suite**
```bash
# Install test dependencies
pip install httpx

# Run the test suite
python scripts/test-embedded-ollama.py

# Expected output:
# ✅ PASS AxieStudio Health Check
# ✅ PASS Ollama Direct Access
# ✅ PASS Ollama API Status
# ✅ PASS Ollama API Models
# ✅ PASS Gemma2 Model Availability
# ✅ PASS Recommended Models Endpoint
# 🎉 All tests passed!
```

### **Manual Testing**
```bash
# Test Ollama directly
curl http://localhost:11434/api/tags

# Test through AxieStudio API
curl http://localhost:7860/api/v1/local-llms/status
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Ollama Not Starting**
```bash
# Check container logs
docker-compose logs axiestudio | grep -i ollama

# Common causes:
# - Insufficient memory (need 8GB+)
# - Port 11434 already in use
# - Model download failed
```

#### **Model Download Fails**
```bash
# Check disk space
docker exec axiestudio df -h /app/ollama-data

# Manually pull model
docker exec axiestudio ollama pull gemma2:2b
```

#### **Component Not Auto-Detecting**
```bash
# Verify environment variables
docker exec axiestudio env | grep OLLAMA

# Should show:
# AXIESTUDIO_EMBEDDED_OLLAMA=true
# OLLAMA_HOST=127.0.0.1:11434
```

### **Performance Optimization**

#### **Memory Usage**
- Monitor with: `docker stats axiestudio`
- Gemma2 2B uses ~2-3GB RAM during inference
- Keep total usage under container limit (8GB)

#### **CPU Usage**
- Ollama uses CPU for inference (no GPU required)
- 4+ cores recommended for good performance
- Response times: 50-2000ms depending on query complexity

## 🎯 **Enterprise Considerations**

### **Production Deployment**
- Increase memory limits for larger models
- Use persistent volumes for model storage
- Monitor resource usage and scaling needs
- Consider GPU support for larger deployments

### **Security**
- Ollama runs on localhost only (not exposed externally)
- All model data stays within the container
- No external API calls for inference

### **Compliance**
- Data never leaves your infrastructure
- GDPR/HIPAA compliant (data stays local)
- No telemetry or usage tracking

## 📈 **Benefits**

### **For Users**
- ✅ Zero setup - works out of the box
- ✅ No API costs - completely free to use
- ✅ Fast responses - no network latency
- ✅ Privacy - data never leaves your system
- ✅ Offline capable - works without internet

### **For Enterprises**
- ✅ Cost savings - no per-token charges
- ✅ Data sovereignty - complete control
- ✅ Predictable performance - dedicated resources
- ✅ Simplified deployment - single container
- ✅ Compliance ready - local processing only

---

**🎉 Enjoy your embedded local LLMs in AxieStudio!**
