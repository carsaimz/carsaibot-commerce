const SalesSystem = require('../modules/salesSystem');
const { isAdmin } = require('../utils/permissions');
const Formatter = require('../utils/formatter');

module.exports = {
    name: 'product',
    description: 'Gerencia produtos',
    usage: '!product <add/list/update/delete> [parâmetros]',
    category: 'sales',
    adminOnly: true,
    
    async execute(sock, message, args) {
        const sales = new SalesSystem();
        const action = args[0]?.toLowerCase();

        switch (action) {
            case 'add':
                await this.addProduct(sock, message, args.slice(1), sales);
                break;
            case 'list':
                await this.listProducts(sock, message, args.slice(1), sales);
                break;
            case 'update':
                await this.updateProduct(sock, message, args.slice(1), sales);
                break;
            case 'delete':
                await this.deleteProduct(sock, message, args.slice(1), sales);
                break;
            default:
                await sock.sendMessage(message.key.remoteJid, {
                    text: 'Uso: !product <add/list/update/delete> [parâmetros]'
                });
        }
    },

    async addProduct(sock, message, args, sales) {
        if (args.length < 3) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Uso: !product add <nome> <preço> <estoque> [descrição] [categoria]'
            });
            return;
        }

        const [name, price, stock, ...rest] = args;
        const description = rest.join(' ').split('|')[0]?.trim();
        const category = rest.join(' ').split('|')[1]?.trim();

        const product = {
            id: Date.now().toString(),
            name,
            price: parseFloat(price),
            stock: parseInt(stock),
            description,
            category
        };

        await sales.addProduct(product);
        await sock.sendMessage(message.key.remoteJid, {
            text: '✅ Produto adicionado com sucesso!'
        });
    },

    async listProducts(sock, message, args, sales) {
        const category = args[0];
        const products = await sales.listProducts(category);

        if (products.length === 0) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Nenhum produto encontrado.'
            });
            return;
        }

        let text = '📦 *Lista de Produtos*\n\n';
        for (const product of products) {
            text += `*ID:* ${product.id}\n`;
            text += `*Nome:* ${product.name}\n`;
            text += `*Preço:* ${Formatter.currency(product.price)}\n`;
            text += `*Estoque:* ${product.stock}\n`;
            if (product.description) text += `*Descrição:* ${product.description}\n`;
            if (product.category) text += `*Categoria:* ${product.category}\n`;
            text += '\n';
        }

        await sock.sendMessage(message.key.remoteJid, { text });
    }
};
