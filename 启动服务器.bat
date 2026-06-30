@echo off
chcp 65001 >nul
title 路面损伤检测智能体

echo.
echo ============================================================
echo   路面损伤检测智能体 - Road Damage Detection Agent
echo ============================================================
echo.
echo   正在启动服务器...
echo.

cd /d "%~dp0"
set PYTHONUTF8=1
python app.py

pause
