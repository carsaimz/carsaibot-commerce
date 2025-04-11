module.exports = {
    // Configurações básicas
    bot: {
        prefix: '!',
        password: 'sua_senha_aqui',
        ownerNumber: 'dono_aqui',
        admins: ['admin1_aqui', 'admin2_aqui'], //adicionar mais admins, é só colocar vírgulas e número entre aspas, ex: '258xxxxxxxx', '258xxxxxxxx', etc
        groupLimit: 100, //limite de grupos
        memberLimit: 500, //limite de membros no grupo
    },

    // Configurações de moderação
    moderation: {
        antiLink: true,
        antiSpam: true,
        antiFlood: true,
        antiPorn: true,
        antiFake: true,
        antiToxic: true,
        antiVirtex: true,
        welcome: true,
        goodbye: true,
        autoKick: true,
        maxWarnings: 3,
    },

    // Configurações de vendas
    sales: {
        currency: 'MZN', //Sua moeda aqui
        taxRate: 0.1,
        minOrderValue: 10,
        maxOrderValue: 1000,
        deliveryFee: 5,
    },

    // Configurações de serviços
    services: {
        maxBookingsPerDay: 10,
        minAdvanceHours: 24,
        maxAdvanceDays: 30,
        workingHours: {
            start: '09:00',
            end: '18:00'
        },
        categories: [
            'Consultoria',
            'Manutenção',
            'Instalação',
            'Suporte',
            'Treinamento'
        ],
        autoConfirm: false,
        reminderHours: 2,
    },
    
    // Mensagens do sistema
    messages: {
        welcome: 'Bem-vindo(a) ao grupo {group}!\n{member}',
        goodbye: 'Até mais, {member}!',
        banned: '⛔ Usuário banido por violar as regras.',
        unbanned: '✅ Usuário desbanido.',
        warn: '⚠️ Aviso {count}/{max}: {reason}',
        maxWarnings: '⛔ Máximo de avisos atingido. Usuário removido.',
        groupOnly: '⚠️ Este comando só pode ser usado em grupos.',
        adminOnly: '⚠️ Este comando é apenas para administradores.',
        ownerOnly: '⚠️ Este comando é apenas para o dono do bot.',
    },

    // Configurações de banco de dados
    database: {
        path: process.env.DATA_PATH 
            ? process.env.DATA_PATH + '/database/bot.db'
            : './database/bot.db',
        options: {
            verbose: console.log,
            timeout: 5000,
            fileMustExist: false
        }
    },

    // Configurações de log
    logs: {
        level: 'info',
        path: './logs'
    }
};
