@echo off
chcp 65001 >nul
title Bot Pequenos na Fe

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale o Node.js 20 ou superior em https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Arquivo .env criado.
)

if not exist "node_modules" (
  echo Instalando dependencias. Isso pode demorar na primeira vez...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o Bot Pequenos na Fe...
echo Para encerrar, pressione Ctrl+C.
echo.
call npm start
pause
