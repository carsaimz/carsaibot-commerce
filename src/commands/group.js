module.exports = {
    name: 'group',
    description: 'Gerencia configurações do grupo',
    usage: '!group <open/close/link/revoke>',
    groupOnly: true,
    adminOnly: true,
    async execute(sock, message, args) {
        if (!args.length) return;

        const groupId = message.key.remoteJid;
        const action = args[0].toLowerCase();

        switch (action) {
            case 'open':
                await sock.groupSettingUpdate(groupId, 'not_announcement');
                await sock.sendMessage(groupId, { text: '🔓 Grupo aberto!' });
                break;

            case 'close':
                await sock.groupSettingUpdate(groupId, 'announcement');
                await sock.sendMessage(groupId, { text: '🔒 Grupo fechado!' });
                break;

            case 'link':
                const code = await sock.groupInviteCode(groupId);
                await sock.sendMessage(groupId, {
                    text: `🔗 Link do grupo:\nhttps://chat.whatsapp.com/${code}`
                });
                break;

            case 'revoke':
                await sock.groupRevokeInvite(groupId);
                await sock.sendMessage(groupId, {
                    text: '🔄 Link do grupo revogado!'
                });
                break;

            default:
                await sock.sendMessage(groupId, {
                    text: '❌ Ação inválida! Use: open, close, link ou revoke'
                });
        }
    }
};
