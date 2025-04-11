#!/bin/bash

echo -e "\033[1;32m"
echo "╔═══════════════════════════════════════╗"
echo "║     🤖 CarsaiBot Commerce v1.0.0      ║"
echo "╚═══════════════════════════════════════╝"
echo -e "\033[0m"

# Verificar dependências
#echo "📦 Verificando dependências..."
#yarn install

# Verificar diretórios necessários
echo "📁 Verificando diretórios..."
mkdir -p logs temp database

# Iniciar o bot
echo "🚀 Iniciando o bot..."
while true; do
    node src/index.js
    
    if [ $? -eq 0 ]; then
        echo "✅ Bot encerrado normalmente"
        break
    else
        echo "⚠️ Bot crashou, reiniciando em 5 segundos..."
        sleep 5
    fi
done
