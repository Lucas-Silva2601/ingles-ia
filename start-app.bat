@echo off
chcp 65001 >nul
title LinguasIA - Iniciar
cd /d "%~dp0"
echo.
echo Iniciando o LinguasIA...
echo.
node scripts\app-start.js %*
echo.
pause
