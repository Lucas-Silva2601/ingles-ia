@echo off
chcp 65001 >nul
title LinguasIA - Iniciar
cd /d "%~dp0"
echo.
echo Iniciando o LinguasIA...
echo.
node scripts\app-start.js %*
if errorlevel 1 (
  echo.
  echo Falha ao iniciar. Veja os detalhes em .app.log
  echo.
  pause
)
