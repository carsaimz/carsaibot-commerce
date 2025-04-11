const config = require('../../config/config');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class CommandHandler {
    constructor(sock) {
        this.sock = sock;
        this.logger = new Logger();
        this.commands = new Map();
        this.loadCommands();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            this.commands.set(command.name, command);
        }
    }

    async handle(message) {
        try {
            const [commandName, ...args] = message.message?.conversation
                .slice(config.bot.prefix.length)
                .trim()
                .split(' ');

            const command = this.commands.get(commandName);
            if (!command) return;

            // Verificar permissões
            if (!await this.checkPermissions(message, command)) return;

            // Executar comando
            await command.execute(this.sock, message, args);

        } catch (err) {
            this.logger.error('Erro ao executar comando:', err);
            await this.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Erro ao executar comando.'
            });
        }
    }

    async checkPermissions(message, command) {
        const sender = message.key.participant || message.key.remoteJid;
        const isGroup = message.key.remoteJid.endsWith('@g.us');

        // Verificar comando apenas para grupos
        if (command.groupOnly && !isGroup) {
            await this.sock.sendMessage(message.key.remoteJid, {
                text: config.messages.groupOnly
            });
            return false;
        }

        // Verificar comando apenas para admin
        if (command.adminOnly && !await this.isAdmin(message)) {
            await this.sock.sendMessage(message.key.remoteJid, {
                text: config.messages.adminOnly
            });
            return false;
        }

        // Verificar comando apenas para dono
        if (command.ownerOnly && !this.isOwner(sender)) {
            await this.sock.sendMessage(message.key.remoteJid, {
                text: config.messages.ownerOnly
            });
            return false;
        }

        return true;
    }

    async isAdmin(message) {
        if (!message.key.remoteJid.endsWith('@g.us')) return false;

        const groupMetadata = await this.sock.groupMetadata(message.key.remoteJid);
        const participant = message.key.participant || message.key.remoteJid;
        
        return groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(participant);
    }

    isOwner(sender) {
        return sender.includes(config.bot.ownerNumber);
    }
}

module.exports = CommandHandler;
