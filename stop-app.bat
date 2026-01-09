@echo off
chcp 65001 >nul
title LinguasIA - Parar
cd /d "%~dp0"
echo.
echo Parando o LinguasIA...
echo.
node scripts\app-stop.js %*
echo.
pause
