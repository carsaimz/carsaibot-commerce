const ServiceSystem = require('../modules/serviceSystem');
const Formatter = require('../utils/formatter');

module.exports = {
    name: 'service',
    description: 'Gerencia serviços',
    usage: '!service <add/list/book/cancel/schedule> [parâmetros]',
    category: 'services',

    async execute(sock, message, args) {
        const services = new ServiceSystem();
        const action = args[0]?.toLowerCase();
        const userId = message.key.participant || message.key.remoteJid;

        switch (action) {
            case 'add':
                if (message.isAdmin) {
                    await this.addService(sock, message, args.slice(1), services);
                }
                break;
            case 'list':
                await this.listServices(sock, message, args.slice(1), services);
                break;
            case 'book':
                await this.bookService(sock, message, args.slice(1), services, userId);
                break;
            case 'cancel':
                await this.cancelBooking(sock, message, args.slice(1), services, userId);
                break;
            case 'schedule':
                await this.showSchedule(sock, message, args.slice(1), services, userId);
                break;
            default:
                await sock.sendMessage(message.key.remoteJid, {
                    text: 'Uso: !service <add/list/book/cancel/schedule> [parâmetros]'
                });
        }
    },

    async addService(sock, message, args, services) {
        if (args.length < 3) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Uso: !service add <nome> <preço> <duração> [descrição] [categoria]'
            });
            return;
        }

        const [name, price, duration, ...rest] = args;
        const description = rest.join(' ').split('|')[0]?.trim();
        const category = rest.join(' ').split('|')[1]?.trim();

        const service = {
            name,
            price: parseFloat(price),
            duration: parseInt(duration),
            description,
            category,
            max_bookings: 1
        };

        if (await services.addService(service)) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '✅ Serviço adicionado com sucesso!'
            });
        } else {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Erro ao adicionar serviço!'
            });
        }
    },

    async listServices(sock, message, args, services) {
        const category = args[0];
        const serviceList = await services.listServices(category);

        if (serviceList.length === 0) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Nenhum serviço encontrado.'
            });
            return;
        }

        let text = '📋 *Lista de Serviços*\n\n';
        for (const service of serviceList) {
            text += `*${service.name}*\n`;
            text += `💰 Preço: ${Formatter.currency(service.price)}\n`;
            text += `⏱️ Duração: ${service.duration} minutos\n`;
            if (service.description) {
                text += `📝 ${service.description}\n`;
            }
            if (service.category) {
                text += `🏷️ Categoria: ${service.category}\n`;
            }
            text += '\n';
        }

        await sock.sendMessage(message.key.remoteJid, { text });
    },

    async bookService(sock, message, args, services, userId) {
        if (args.length < 3) {
            await sock.sendMessage(message.key.remoteJid, {
                text: 'Uso: !service book <id_serviço> <data> <horário> [observações]'
            });
            return;
        }

        const [serviceId, date, time, ...notes] = args;

        try {
            const booking = await services.bookService({
                user_id: userId,
                service_id: serviceId,
                date,
                time,
                notes: notes.join(' ')
            });

            const summary = services.formatBookingSummary(booking);
            await sock.sendMessage(message.key.remoteJid, { text: summary });

        } catch (err) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ Erro ao agendar: ${err.message}`
            });
        }
    },

    async showSchedule(sock, message, args, services, userId) {
        if (!args.length) {
            // Mostrar agendamentos do usuário
            const bookings = await services.listUserBookings(userId);
            
            if (bookings.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '📅 Você não possui agendamentos.'
                });
                return;
            }

            let text = '📅 *Seus Agendamentos*\n\n';
            for (const booking of bookings) {
                text += services.formatBookingSummary(booking) + '\n';
            }

            await sock.sendMessage(message.key.remoteJid, { text });
        } else {
            // Mostrar horários disponíveis
            const [serviceId, date] = args;
            const slots = await services.getAvailableSlots(serviceId, date);

            if (slots.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Não há horários disponíveis para esta data.'
                });
                return;
            }

            let text = '🕒 *Horários Disponíveis*\n\n';
            text += slots.join('\n');

            await sock.sendMessage(message.key.remoteJid, { text });
        }
    }
};