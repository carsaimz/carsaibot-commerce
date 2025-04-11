const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const pino = require('pino');
const config = require('../config/config');
const Logger = require('./utils/logger');
const MessageHandler = require('./modules/messageHandler');
const DatabaseManager = require('./database/manager');
const Environment = require('./utils/environment');
const env = Environment.check();

const logger = new Logger();

// Função auxiliar para entrada de dados
const question = (string) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(`\x1b[1m${string}\x1b[0m`, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

// Função principal do bot
const startBot = async () => {
    try {
        // Verificação de senha
        const senhaDigitada = await question("\x1b[1;34m🔐 DIGITE A SENHA PARA INICIAR: \x1b[0m");
        if (senhaDigitada !== config.bot.password) {
            console.error("\x1b[1;31m❌ SENHA INCORRETA! ENCERRANDO...\x1b[0m");
            process.exit(1);
        }

        console.log("\x1b[1;32m✔️ SENHA CORRETA! INICIANDO CONEXÃO...\x1b[0m");

        // Inicializar banco de dados
        await DatabaseManager.initialize();

        // Configurar estado de autenticação
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version } = await fetchLatestBaileysVersion();

        // Criar socket de conexão
        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            defaultQueryTimeoutMs: undefined,
        });

        // Verificar registro
        if (!state.creds.registered) {
            let phoneNumber = await question("\x1b[1;36m📞 INFORME SEU NÚMERO DE TELEFONE: \x1b[0m");
            phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

            if (!phoneNumber) {
                console.error("\x1b[1;31m🚨 NÚMERO DE TELEFONE INVÁLIDO!\x1b[0m");
                process.exit(1);
            }

            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\x1b[1;33m➡️ CÓDIGO DE PAREAMENTO: ${code}\x1b[0m`);
        }

        // Configurar handlers de eventos
        const messageHandler = new MessageHandler(sock);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info('Conexão fechada devido a ' + lastDisconnect?.error?.message);
                
                if (shouldReconnect) {
                    startBot();
                }
            } else if (connection === 'open') {
                logger.info('Bot conectado com sucesso!');
            }
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async (m) => await messageHandler.handleMessage(m));
        sock.ev.on('group-participants.update', async (m) => await messageHandler.handleGroupParticipant(m));

    } catch (err) {
        logger.error('Erro ao iniciar o bot:', err);
        process.exit(1);
    }
};

// Iniciar bot
startBot().catch(err => {
    logger.error('Erro fatal:', err);
    process.exit(1);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    logger.error('Exceção não capturada:', err);
});

process.on('unhandledRejection', (err) => {
    logger.error('Rejeição não tratada:', err);
});

// Observador de arquivo para atualização automática
const file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    logger.info('Arquivo atualizado:', file);
    delete require.cache[file];
    require(file);
});
