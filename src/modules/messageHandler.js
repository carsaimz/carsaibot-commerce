const config = require('../../config/config');
const ModerationSystem = require('./moderationSystem');
const CommandHandler = require('./commandHandler');
const Logger = require('../utils/logger');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.logger = new Logger();
        this.moderation = new ModerationSystem(sock);
        this.commandHandler = new CommandHandler(sock);
    }

    async handleMessage(msg) {
        try {
            const message = msg.messages[0];
            if (!message) return;

            // Ignorar mensagens de status
            if (message.key.remoteJid === 'status@broadcast') return;

            // Verificar moderação primeiro
            const isViolation = await this.moderation.checkMessage(message);
            if (isViolation) return;

            // Processar comandos
            const content = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || '';

            if (content.startsWith(config.bot.prefix)) {
                await this.commandHandler.handle(message);
                return;
            }

            // Processar mensagens normais
            await this.handleNormalMessage(message);

        } catch (err) {
            this.logger.error('Erro ao processar mensagem:', err);
        }
    }

    async handleGroupParticipant(event) {
        try {
            if (!config.moderation.welcome && !config.moderation.goodbye) return;

            const groupId = event.id;
            const participants = event.participants;
            const action = event.action;

            switch (action) {
                case 'add':
                    await this.moderation.handleWelcome(groupId, participants);
                    break;
                case 'remove':
                    await this.moderation.handleGoodbye(groupId, participants);
                    break;
                case 'promote':
                case 'demote':
                    await this.moderation.handleRoleChange(groupId, participants, action);
                    break;
            }
        } catch (err) {
            this.logger.error('Erro ao processar evento de grupo:', err);
        }
    }

    async handleNormalMessage(message) {
        // Implementar processamento de mensagens normais
        // Ex: Auto-responder, detecção de palavras-chave, etc.
    }
}

module.exports = MessageHandler;
