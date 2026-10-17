@echo off
chcp 65001 >nul
title LinguasIA - Reiniciar
cd /d "%~dp0"
echo.
echo Reiniciando o LinguasIA...
echo.
node scripts\app-restart.js %*
if errorlevel 1 (
  echo.
  echo Falha ao reiniciar. Veja os detalhes em .app.log
  echo.
  pause
)
