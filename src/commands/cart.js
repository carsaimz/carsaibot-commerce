const SalesSystem = require('../modules/salesSystem');
const Formatter = require('../utils/formatter');

module.exports = {
    name: 'cart',
    description: 'Gerencia o carrinho de compras',
    usage: '!cart <add/remove/list/clear/checkout> [parâmetros]',
    category: 'sales',

    async execute(sock, message, args) {
        const sales = new SalesSystem();
        const action = args[0]?.toLowerCase();
        const userId = message.key.participant || message.key.remoteJid;

        switch (action) {
            case 'add':
                await this.addToCart(sock, message, args.slice(1), sales, userId);
                break;
            case 'remove':
                await this.removeFromCart(sock, message, args.slice(1), sales, userId);
                break;
            case 'list':
                await this.listCart(sock, message, sales, userId);
                break;
            case 'clear':
                await this.clearCart(sock, message, sales, userId);
                break;
            case 'checkout':
                await this.checkout(sock, message, sales, userId);
                break;
            default:
                await sock.sendMessage(message.key.remoteJid, {
                    text: 'Uso: !cart <add/remove/list/clear/checkout> [parâmetros]'
                });
        }
    },

    async addToCart(sock, message, args, sales, userId) {
        if (args.length < 1) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Uso: !cart add <produto_id> [quantidade]'
            });
            return;
        }

        const [productId, quantity = "1"] = args;
        const qty = parseInt(quantity);

        if (isNaN(qty) || qty < 1) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Quantidade inválida!'
            });
            return;
        }

        const product = await sales.getProduct(productId);
        if (!product) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Produto não encontrado!'
            });
            return;
        }

        if (product.stock < qty) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Quantidade indisponível em estoque!'
            });
            return;
        }

        sales.addToCart(userId, productId, qty);
        await sock.sendMessage(message.key.remoteJid, {
            text: '✅ Produto adicionado ao carrinho!'
        });
    },

    async listCart(sock, message, sales, userId) {
        const items = await sales.getCart(userId);

        if (items.length === 0) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🛒 Seu carrinho está vazio!'
            });
            return;
        }

        let text = '🛒 *Seu Carrinho*\n\n';
        let total = 0;

        for (const item of items) {
            text += `*${item.name}*\n`;
            text += `Quantidade: ${item.quantity}\n`;
            text += `Preço: ${Formatter.currency(item.price)}\n`;
            text += `Subtotal: ${Formatter.currency(item.total)}\n\n`;
            total += item.total;
        }

        text += `*Total: ${Formatter.currency(total)}*`;

        await sock.sendMessage(message.key.remoteJid, { text });
    },

    async checkout(sock, message, sales, userId) {
        try {
            const order = await sales.checkout(userId);
            if (!order) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Carrinho vazio!'
                });
                return;
            }

            const summary = sales.formatOrderSummary(order);
            await sock.sendMessage(message.key.remoteJid, { text: summary });

        } catch (err) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ Erro no checkout: ${err.message}`
            });
        }
    }
};
