@echo off
echo 🚀 Starting AxieStudio Documentation Development Server...

REM Set Node.js path
set NODE_PATH=C:\Users\mist24lk\Downloads\node-v22.18.0-win-x64\node-v22.18.0-win-x64

REM Add Node.js to PATH for this session
set PATH=%NODE_PATH%;%PATH%

echo ✅ Node.js path configured: %NODE_PATH%

echo 🔧 Starting Docusaurus development server...

REM Start the development server
"%NODE_PATH%\npm.cmd" start

echo 🎯 Development server should be running at: http://localhost:3000
pause
