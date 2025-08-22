# Axie Studio Docker Hub Deployment Guide

## 🚀 Quick Start

### Using Pre-built Images from Docker Hub

```bash
# Run Axie Studio with SQLite (simplest)
docker run -p 7860:7860 axiestudio/axiestudiov1:latest

# Run with PostgreSQL (production-ready)
docker-compose -f docker-compose.production.yml up
```

## 🏗️ Building and Pushing to Docker Hub

### Prerequisites

1. **Docker Desktop** installed and running
2. **Docker Hub account** with access to `axiestudio/axiestudiov1` repository
3. **Access Token**: Set `DOCKER_HUB_TOKEN` environment variable

### Login to Docker Hub

```bash
docker login -u axiestudio
# Password: [Use your Docker Hub access token from environment variable]
```

### Build and Deploy (Windows PowerShell)

```powershell
# Navigate to project root
cd axiestudio

# Run deployment script
.\scripts\docker-hub-deploy.ps1 -AccessToken $env:DOCKER_HUB_TOKEN

# Or build only (no push)
.\scripts\docker-hub-deploy.ps1 -BuildOnly
```

### Build and Deploy (Linux/Mac)

```bash
# Navigate to project root
cd axiestudio

# Make script executable
chmod +x scripts/docker-hub-deploy.sh

# Run deployment script
DOCKER_HUB_USERNAME=axiestudio ./scripts/docker-hub-deploy.sh
```

### Manual Build Commands

```bash
# Build frontend
cd src/frontend
npm ci && npm run build
cd ../..

# Copy frontend to backend
rm -rf src/backend/base/axiestudio/frontend
cp -r src/frontend/build src/backend/base/axiestudio/frontend

# Build multi-platform images
docker buildx create --name axiestudio-builder --use
docker buildx inspect --bootstrap

# Build and push main image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file docker/build_and_push.Dockerfile \
  --tag axiestudio/axiestudiov1:latest \
  --tag axiestudio/axiestudiov1:$(grep "^version" pyproject.toml | sed 's/.*"\(.*\)"$/\1/') \
  --push \
  .

# Build and push backend-only image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file docker/build_and_push_backend.Dockerfile \
  --build-arg AXIESTUDIO_IMAGE=axiestudio/axiestudiov1:latest \
  --tag axiestudio/axiestudiov1-backend:latest \
  --push \
  .
```

## 📦 Available Images

### Main Images
- `axiestudio/axiestudiov1:latest` - Full Axie Studio with frontend and backend
- `axiestudio/axiestudiov1:1.5.0` - Specific version tag
- `axiestudio/axiestudiov1-backend:latest` - Backend-only (no frontend)

### Supported Platforms
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple Silicon, etc.)

## 🐳 Docker Compose Configurations

### Development (Local Build)
```bash
docker-compose up
```

### Production (Docker Hub Images)
```bash
docker-compose -f docker-compose.production.yml up
```

### With PostgreSQL
```bash
docker-compose -f docker-compose.production.yml up
```

### With Redis (Optional)
```bash
docker-compose -f docker-compose.production.yml --profile redis up
```

## 🔧 Environment Variables

### Core Configuration
- `AXIESTUDIO_SECRET_KEY` - Secret key for sessions (change in production!)
- `DATABASE_URL` - Database connection string
- `AXIESTUDIO_HOST` - Host to bind to (default: 0.0.0.0)
- `AXIESTUDIO_PORT` - Port to bind to (default: 7860)
- `AXIESTUDIO_AUTO_LOGIN` - Enable auto-login (default: false)

### Database Options
```bash
# SQLite (default)
DATABASE_URL=sqlite:////app/data/axiestudio.db

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database

# MySQL
DATABASE_URL=mysql://user:password@host:3306/database
```

## 🚀 Deployment Examples

### Simple Single Container
```bash
docker run -d \
  --name axiestudio \
  -p 7860:7860 \
  -v axiestudio_data:/app/data \
  -e AXIESTUDIO_SECRET_KEY=your-secret-key \
  axiestudio/axiestudio:latest
```

### Production with PostgreSQL
```bash
# Create network
docker network create axiestudio_network

# Start PostgreSQL
docker run -d \
  --name axiestudio_postgres \
  --network axiestudio_network \
  -e POSTGRES_DB=axiestudio \
  -e POSTGRES_USER=axiestudio \
  -e POSTGRES_PASSWORD=secure_password \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Start Axie Studio
docker run -d \
  --name axiestudio \
  --network axiestudio_network \
  -p 7860:7860 \
  -e AXIESTUDIO_SECRET_KEY=your-secret-key \
  -e DATABASE_URL=postgresql://axiestudio:secure_password@axiestudio_postgres:5432/axiestudio \
  -e AXIESTUDIO_AUTO_LOGIN=false \
  -v axiestudio_data:/app/data \
  axiestudio/axiestudiov1:latest
```

## 🔍 Troubleshooting

### Check Container Logs
```bash
docker logs axiestudio
```

### Health Check
```bash
curl http://localhost:7860/health_check
```

### Container Shell Access
```bash
docker exec -it axiestudio /bin/bash
```

### Rebuild Images
```bash
# Remove old images
docker rmi axiestudio/axiestudiov1:latest

# Pull latest
docker pull axiestudio/axiestudiov1:latest
```

## 📊 Comparison with Langflow

| Feature | Langflow | Axie Studio |
|---------|----------|-------------|
| Docker Hub | `langflowai/langflow` | `axiestudio/axiestudio` |
| Base Image | Python 3.12 + UV | Python 3.12 + UV |
| Frontend | React + Vite | React + Vite (Enhanced UI) |
| Database | PostgreSQL/SQLite | PostgreSQL/SQLite |
| Multi-platform | ✅ | ✅ |
| Backend-only | ✅ | ✅ |
| Auto-login | ✅ | ✅ (Configurable) |

## 🔐 Security Notes

1. **Change default secrets** in production
2. **Use strong passwords** for database
3. **Enable HTTPS** with reverse proxy
4. **Limit network exposure** appropriately
5. **Regular updates** of base images
