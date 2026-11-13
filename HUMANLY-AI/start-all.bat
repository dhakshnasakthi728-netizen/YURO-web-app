@echo off
echo Starting HUMANLY AI Platform...
echo.
echo [INFO] Ensure Ollama is running with a model installed (e.g., ollama pull qwen3:8b)
echo [INFO] Backend will use OLLAMA_MODEL from backend\.env or environment
echo.
echo Starting Backend (FastAPI)...
start "HUMANLY AI Backend" cmd /k "cd backend && set OLLAMA_MODEL=qwen3:8b && set HUMANIZATION_PROVIDER=ollama && python run.py"
timeout /t 5 /nobreak > nul
echo Starting Frontend (Vite)...
start "HUMANLY AI Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Both services are starting...
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo If humanization fails, check: ollama list and ollama ps
pause
