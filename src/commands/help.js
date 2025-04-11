module.exports = {
    name: 'help',
    description: 'Mostra a lista de comandos disponíveis',
    usage: '!help [comando]',
    async execute(sock, message, args) {
        const prefix = require('../../config/config').bot.prefix;
        const commands = Array.from(sock.commands.values());

        if (args.length > 0) {
            // Mostrar ajuda específica do comando
            const command = sock.commands.get(args[0]);
            if (command) {
                const helpText = `*${prefix}${command.name}*\n` +
                               `📝 Descrição: ${command.description}\n` +
                               `🔧 Uso: ${command.usage}`;
                
                await sock.sendMessage(message.key.remoteJid, { text: helpText });
                return;
            }
        }

        // Mostrar lista de comandos
        let helpText = '📜 *Lista de Comandos*\n\n';
        
        const categories = {
            '👑 Admin': commands.filter(cmd => cmd.adminOnly),
            '👥 Grupo': commands.filter(cmd => cmd.groupOnly),
            '🛒 Vendas': commands.filter(cmd => cmd.category === 'sales'),
            '🔧 Geral': commands.filter(cmd => !cmd.adminOnly && !cmd.groupOnly && cmd.category !== 'sales')
        };

        for (const [category, cmds] of Object.entries(categories)) {
            if (cmds.length > 0) {
                helpText += `${category}:\n`;
                cmds.forEach(cmd => {
                    helpText += `${prefix}${cmd.name} - ${cmd.description}\n`;
                });
                helpText += '\n';
            }
        }

        helpText += `\nUse ${prefix}help [comando] para mais informações sobre um comando específico.`;

        await sock.sendMessage(message.key.remoteJid, { text: helpText });
    }
};
