const config = require('../../config/config');
const DatabaseManager = require('../database/manager');
const Logger = require('../utils/logger');

module.exports = {
    name: 'admin',
    description: 'Comandos administrativos',
    usage: '!admin <stats/config/reset/broadcast> [parâmetros]',
    category: 'admin',
    ownerOnly: true,

    async execute(sock, message, args) {
        const action = args[0]?.toLowerCase();
        const logger = new Logger();
        const db = DatabaseManager.getInstance();

        switch (action) {
            case 'stats':
                await this.showStats(sock, message, db);
                break;
            case 'config':
                await this.handleConfig(sock, message, args.slice(1));
                break;
            case 'reset':
                await this.resetSystem(sock, message, db);
                break;
            case 'broadcast':
                await this.broadcast(sock, message, args.slice(1));
                break;
            default:
                await sock.sendMessage(message.key.remoteJid, {
                    text: 'Uso: !admin <stats/config/reset/broadcast> [parâmetros]'
                });
        }
    },

    async showStats(sock, message, db) {
        try {
            const [users, products, orders] = await Promise.all([
                db.all('SELECT COUNT(*) as count FROM users'),
                db.all('SELECT COUNT(*) as count FROM products'),
                db.all('SELECT COUNT(*) as count FROM orders')
            ]);

            const text = `📊 *Estatísticas do Sistema*\n\n` +
                        `👥 Usuários: ${users[0].count}\n` +
                        `📦 Produtos: ${products[0].count}\n` +
                        `🛍️ Pedidos: ${orders[0].count}\n`;

            await sock.sendMessage(message.key.remoteJid, { text });
        } catch (err) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Erro ao obter estatísticas!'
            });
        }
    },

    async broadcast(sock, message, args) {
        if (!args.length) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Forneça uma mensagem para transmitir!'
            });
            return;
        }

        const broadcastMessage = args.join(' ');
        const groups = await sock.groupFetchAllParticipating();

        for (const group of Object.values(groups)) {
            try {
                await sock.sendMessage(group.id, {
                    text: `📢 *Comunicado Oficial*\n\n${broadcastMessage}`
                });
                // Delay para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                continue;
            }
        }

        await sock.sendMessage(message.key.remoteJid, {
            text: '✅ Mensagem transmitida para todos os grupos!'
        });
    }
};
