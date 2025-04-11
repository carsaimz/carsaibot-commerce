const config = require('../../config/config');
const DatabaseManager = require('../database/manager');
const Logger = require('../utils/logger');

class ModerationSystem {
    constructor(sock) {
        this.sock = sock;
        this.logger = new Logger();
        this.db = DatabaseManager.getInstance();
        this.warnings = new Map();
        this.spamDetector = new Map();
    }

    async checkMessage(message) {
        try {
            const sender = message.key.participant || message.key.remoteJid;
            const groupId = message.key.remoteJid;
            const isGroup = groupId.endsWith('@g.us');

            // Ignorar mensagens privadas se não configurado
            if (!isGroup) return false;

            // Verificar se usuário está banido
            if (await this.isUserBanned(sender)) {
                await this.removeUser(groupId, sender);
                return true;
            }

            // Verificar diferentes tipos de violações
            const violations = await Promise.all([
                this.checkSpam(message),
                this.checkLinks(message),
                this.checkToxic(message),
                this.checkFake(message),
                this.checkVirtex(message)
            ]);

            if (violations.some(v => v)) {
                await this.handleViolation(message);
                return true;
            }

            return false;

        } catch (err) {
            this.logger.error('Erro na verificação de moderação:', err);
            return false;
        }
    }

    async handleViolation(message, type = 'violation') {
        const sender = message.key.participant || message.key.remoteJid;
        const groupId = message.key.remoteJid;

        // Incrementar avisos
        const warnings = (this.warnings.get(sender) || 0) + 1;
        this.warnings.set(sender, warnings);

        // Enviar mensagem de aviso
        const warningMsg = config.messages.warn
            .replace('{count}', warnings)
            .replace('{max}', config.moderation.maxWarnings)
            .replace('{reason}', type);

        await this.sock.sendMessage(groupId, { text: warningMsg });

        // Verificar máximo de avisos
        if (warnings >= config.moderation.maxWarnings) {
            if (config.moderation.autoKick) {
                await this.removeUser(groupId, sender);
                await this.banUser(sender);
            }
            this.warnings.delete(sender);
        }

        // Deletar mensagem se possível
        try {
            await this.sock.sendMessage(groupId, { delete: message.key });
        } catch (err) {
            this.logger.warn('Não foi possível deletar a mensagem:', err);
        }
    }

    async checkSpam(message) {
        if (!config.moderation.antiSpam) return false;

        const sender = message.key.participant || message.key.remoteJid;
        const now = Date.now();

        if (!this.spamDetector.has(sender)) {
            this.spamDetector.set(sender, {
                count: 1,
                firstMessage: now
            });
            return false;
        }

        const userData = this.spamDetector.get(sender);
        const timeDiff = now - userData.firstMessage;

        if (timeDiff < 3000) { // 3 segundos
            userData.count++;
            if (userData.count > 5) { // 5 mensagens em 3 segundos
                this.spamDetector.delete(sender);
                return true;
            }
        } else {
            userData.count = 1;
            userData.firstMessage = now;
        }

        return false;
    }

    async checkLinks(message) {
        if (!config.moderation.antiLink) return false;

        const content = message.message?.conversation ||
                       message.message?.extendedTextMessage?.text || '';

        const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
        return linkRegex.test(content);
    }

    async checkToxic(message) {
        if (!config.moderation.antiToxic) return false;
        // Implementar verificação de conteúdo tóxico
        return false;
    }

    async checkFake(message) {
        if (!config.moderation.antiFake) return false;
        
        const sender = message.key.participant || message.key.remoteJid;
        const number = sender.split('@')[0];

        // Verificar números fake (exemplo simples)
        return number.startsWith('1') || number.length !== 12;
    }

    async checkVirtex(message) {
        if (!config.moderation.antiVirtex) return false;

        const content = message.message?.conversation ||
                       message.message?.extendedTextMessage?.text || '';

        // Verificar mensagens muito longas ou com padrões suspeitos
        return content.length > 10000;
    }

    async handleWelcome(groupId, participants) {
        if (!config.moderation.welcome) return;

        for (const participant of participants) {
            const welcomeMsg = config.messages.welcome
                .replace('{group}', groupId)
                .replace('{member}', `@${participant.split('@')[0]}`);

            await this.sock.sendMessage(groupId, {
                text: welcomeMsg,
                mentions: [participant]
            });
        }
    }

    async handleGoodbye(groupId, participants) {
        if (!config.moderation.goodbye) return;

        for (const participant of participants) {
            const goodbyeMsg = config.messages.goodbye
                .replace('{member}', `@${participant.split('@')[0]}`);

            await this.sock.sendMessage(groupId, {
                text: goodbyeMsg,
                mentions: [participant]
            });
        }
    }

    async removeUser(groupId, userId) {
        try {
            await this.sock.groupParticipantsUpdate(groupId, [userId], "remove");
            return true;
        } catch (err) {
            this.logger.error('Erro ao remover usuário:', err);
            return false;
        }
    }

    async banUser(userId) {
        try {
            await this.db.addToBanList(userId);
            return true;
        } catch (err) {
            this.logger.error('Erro ao banir usuário:', err);
            return false;
        }
    }

    async isUserBanned(userId) {
        try {
            return await this.db.isUserBanned(userId);
        } catch (err) {
            this.logger.error('Erro ao verificar ban:', err);
            return false;
        }
    }
}

module.exports = ModerationSystem;
