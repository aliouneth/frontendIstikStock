@echo off
rem Supervisor for the Next.js frontend on port 3001.
rem The server gets killed from outside the process repeatedly, so restart it
rem whenever it exits and log the fact instead of silently losing the site.
setlocal
cd /d "%~dp0"
rem Explicit so the API proxy targets the Laravel backend even if .env is
rem missing. next.config.ts reads BACKEND_URL at server start.
set BACKEND_URL=http://127.0.0.1:8081
:loop
echo [%date% %time%] starting next start on port 3001 >> start.log
npm run start -- -p 3001 >> start.log 2>> start.err
echo [%date% %time%] next start exited with code %errorlevel% - restarting in 2s >> start.log
timeout /t 2 /nobreak > nul
goto loop
