#!/bin/bash

echo "Instalando dependências para Android..."

# Criar diretórios necessários
mkdir -p database logs temp

# Verificar e instalar node_modules
if [ ! -d "node_modules" ]; then
    npm install
fi

# Verificar permissões
chmod -R 755 .

echo "Instalação concluída!"

chmod +x install.sh