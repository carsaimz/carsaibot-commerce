module.exports = {
    name: 'ping',
    description: 'Verifica se o bot está online',
    usage: '!ping',
    async execute(sock, message, args) {
        const start = Date.now();
        await sock.sendMessage(message.key.remoteJid, { text: '🏓 Pong!. O bot está online...' });
        const end = Date.now();
        await sock.sendMessage(message.key.remoteJid, {
            text: `Latência: ${end - start}ms`
        });
    }
};
