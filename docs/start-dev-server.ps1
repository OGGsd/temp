# AxieStudio Documentation Development Server Startup Script
# This script sets up the Node.js environment and starts the Docusaurus development server

Write-Host "🚀 Starting AxieStudio Documentation Development Server..." -ForegroundColor Green

# Set Node.js path
$NODE_PATH = "C:\Users\mist24lk\Downloads\node-v22.18.0-win-x64\node-v22.18.0-win-x64"

# Add Node.js to PATH for this session
$env:PATH = "$NODE_PATH;$env:PATH"

Write-Host "✅ Node.js path configured: $NODE_PATH" -ForegroundColor Yellow

# Start the development server
Write-Host "🔧 Starting Docusaurus development server..." -ForegroundColor Blue

& "$NODE_PATH\npm.cmd" start

Write-Host "🎯 Development server should be running at: http://localhost:3000" -ForegroundColor Green
