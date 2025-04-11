# 🤖 WhatsApp Sales Bot

Bot de vendas automatizado para WhatsApp com sistema completo de moderação e gerenciamento.

## 📋 Características

- Sistema de vendas completo
- Gerenciamento de produtos e estoque
- Carrinho de compras
- Sistema de moderação de grupos
- Comandos administrativos
- Auto-responder
- Sistema de logs
- Blacklist
- Proteção contra spam e conteúdo inadequado

## 🚀 Instalação

1. Clone o repositório
```bash
git clone https://github.com/carsaidev/carsaibot-commerce.git
cd carsaibot-commerce
```

2. Instale as dependências
```bash
npm install
```

3. Configure o arquivo `config/config.js`

4. Inicie o bot
```bash
./start.sh
```

## 💡 Comandos

### 👑 Administrativos
- `!admin stats` - Mostra estatísticas do sistema
- `!admin broadcast` - Envia mensagem para todos os grupos
- `!admin config` - Configura o bot
- `!admin reset` - Reseta o sistema

### 🛒 Vendas
- `!product add` - Adiciona produto
- `!product list` - Lista produtos
- `!cart add` - Adiciona ao carrinho
- `!cart list` - Mostra carrinho
- `!cart checkout` - Finaliza compra

### 📅 Serviços
- `!service add` - Adiciona novo serviço
- `!service list` - Lista serviços disponíveis
- `!service book` - Agenda um serviço
- `!service cancel` - Cancela agendamento
- `!service schedule` - Mostra agenda/horários

#### Exemplo de uso:
```bash
# Adicionar serviço
!service add "Consultoria" 100.00 60 "Consultoria personalizada" | "Consultoria"

# Agendar serviço
!service book SERVICE_ID 2024-01-01 14:00 "Observações aqui"

# Ver horários disponíveis
!service schedule SERVICE_ID 2024-01-01

# Cancelar agendamento
!service cancel BOOKING_ID
```

### 👮 Moderação
- `!ban` - Bane usuário
- `!unban` - Remove ban
- `!warn` - Adverte usuário
- `!unwarn` - Remove advertência

### ℹ️ Geral
- `!help` - Mostra ajuda
- `!ping` - Verifica status
- `!info` - Informações do bot

## ⚙️ Configuração

Edite o arquivo `config/config.js` para configurar:
- Números de administradores
- Prefixo de comandos
- Configurações de moderação
- Configurações de vendas
- Sistema de logs

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
