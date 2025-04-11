const ModerationSystem = require('../modules/moderationSystem');
const { isAdmin } = require('../utils/permissions');

module.exports = {
    name: 'ban',
    description: 'Bane um usuário do grupo',
    usage: '!ban @usuário [motivo]',
    category: 'moderation',
    groupOnly: true,
    adminOnly: true,

    async execute(sock, message, args) {
        const moderation = new ModerationSystem(sock);
        
        if (!args.length || !message.message.extendedTextMessage?.contextInfo?.mentionedJid) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Mencione o usuário que deseja banir!'
            });
            return;
        }

        const target = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

        try {
            await moderation.banUser(target);
            await moderation.removeUser(message.key.remoteJid, target);
            
            await sock.sendMessage(message.key.remoteJid, {
                text: `⛔ Usuário @${target.split('@')[0]} foi banido!\nMotivo: ${reason}`,
                mentions: [target]
            });
        } catch (err) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Erro ao banir usuário!'
            });
        }
    }
};
