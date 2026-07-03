@echo off
REM === Gesture Particles launcher ===
REM Double-click to install dependencies (first run only) and start the dev
REM server. It opens the app in your default browser automatically.

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   npm was not found. Install Node.js LTS from https://nodejs.org
  echo   then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   First run - installing dependencies. This may take a minute...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   npm install failed. See the messages above.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   Starting Gesture Particles...
echo   The app will open in your browser. Close this window to stop the server.
echo.

start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:5173/"

call npm run dev
