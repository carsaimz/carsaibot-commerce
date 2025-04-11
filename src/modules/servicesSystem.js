const config = require('../../config/config');
const DatabaseManager = require('../database/manager');
const Logger = require('../utils/logger');
const Formatter = require('../utils/formatter');

class ServiceSystem {
    constructor() {
        this.logger = new Logger();
        this.db = DatabaseManager.getInstance();
    }

    async addService(service) {
        try {
            const sql = `INSERT INTO services (
                id, name, description, price, duration,
                category, availability, max_bookings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            await this.db.run(sql, [
                service.id || Date.now().toString(),
                service.name,
                service.description,
                service.price,
                service.duration,
                service.category,
                service.availability,
                service.max_bookings
            ]);

            return true;
        } catch (err) {
            this.logger.error('Erro ao adicionar serviço:', err);
            return false;
        }
    }

    async getService(serviceId) {
        try {
            return await this.db.get(
                'SELECT * FROM services WHERE id = ?',
                [serviceId]
            );
        } catch (err) {
            this.logger.error('Erro ao buscar serviço:', err);
            return null;
        }
    }

    async listServices(category = null) {
        try {
            const sql = category
                ? 'SELECT * FROM services WHERE category = ?'
                : 'SELECT * FROM services';
            
            return await this.db.all(sql, category ? [category] : []);
        } catch (err) {
            this.logger.error('Erro ao listar serviços:', err);
            return [];
        }
    }

    async updateService(serviceId, updates) {
        try {
            const entries = Object.entries(updates);
            const sql = `UPDATE services SET ${
                entries.map(([k]) => `${k} = ?`).join(', ')
            } WHERE id = ?`;

            await this.db.run(sql, [...entries.map(([_, v]) => v), serviceId]);
            return true;
        } catch (err) {
            this.logger.error('Erro ao atualizar serviço:', err);
            return false;
        }
    }

    async deleteService(serviceId) {
        try {
            await this.db.run(
                'DELETE FROM services WHERE id = ?',
                [serviceId]
            );
            return true;
        } catch (err) {
            this.logger.error('Erro ao deletar serviço:', err);
            return false;
        }
    }

    async bookService(booking) {
        try {
            // Verificar disponibilidade
            const service = await this.getService(booking.service_id);
            if (!service) throw new Error('Serviço não encontrado');

            // Verificar se há vagas disponíveis
            const existingBookings = await this.db.get(
                'SELECT COUNT(*) as count FROM bookings WHERE service_id = ? AND date = ?',
                [booking.service_id, booking.date]
            );

            if (existingBookings.count >= service.max_bookings) {
                throw new Error('Não há vagas disponíveis para esta data');
            }

            // Inserir agendamento
            const sql = `INSERT INTO bookings (
                id, user_id, service_id, date, time,
                status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

            await this.db.run(sql, [
                booking.id || Date.now().toString(),
                booking.user_id,
                booking.service_id,
                booking.date,
                booking.time,
                'pending',
                booking.notes
            ]);

            return await this.getBooking(booking.id);
        } catch (err) {
            this.logger.error('Erro ao agendar serviço:', err);
            throw err;
        }
    }

    async getBooking(bookingId) {
        try {
            return await this.db.get(`
                SELECT b.*, s.name as service_name, s.price, s.duration
                FROM bookings b
                JOIN services s ON s.id = b.service_id
                WHERE b.id = ?
            `, [bookingId]);
        } catch (err) {
            this.logger.error('Erro ao buscar agendamento:', err);
            return null;
        }
    }

    async listUserBookings(userId) {
        try {
            return await this.db.all(`
                SELECT b.*, s.name as service_name, s.price, s.duration
                FROM bookings b
                JOIN services s ON s.id = b.service_id
                WHERE b.user_id = ?
                ORDER BY b.date DESC, b.time DESC
            `, [userId]);
        } catch (err) {
            this.logger.error('Erro ao listar agendamentos:', err);
            return [];
        }
    }

    async updateBooking(bookingId, updates) {
        try {
            const entries = Object.entries(updates);
            const sql = `UPDATE bookings SET ${
                entries.map(([k]) => `${k} = ?`).join(', ')
            } WHERE id = ?`;

            await this.db.run(sql, [...entries.map(([_, v]) => v), bookingId]);
            return await this.getBooking(bookingId);
        } catch (err) {
            this.logger.error('Erro ao atualizar agendamento:', err);
            return null;
        }
    }

    async cancelBooking(bookingId) {
        try {
            await this.db.run(
                "UPDATE bookings SET status = 'cancelled' WHERE id = ?",
                [bookingId]
            );
            return true;
        } catch (err) {
            this.logger.error('Erro ao cancelar agendamento:', err);
            return false;
        }
    }

    formatBookingSummary(booking) {
        let summary = '📅 *Detalhes do Agendamento*\n\n';
        
        summary += `*Serviço:* ${booking.service_name}\n`;
        summary += `*Data:* ${Formatter.date(booking.date)}\n`;
        summary += `*Horário:* ${booking.time}\n`;
        summary += `*Duração:* ${booking.duration} minutos\n`;
        summary += `*Valor:* ${Formatter.currency(booking.price)}\n`;
        summary += `*Status:* ${this.formatStatus(booking.status)}\n`;
        
        if (booking.notes) {
            summary += `\n*Observações:* ${booking.notes}\n`;
        }

        return summary;
    }

    formatStatus(status) {
        const statusMap = {
            pending: '⏳ Pendente',
            confirmed: '✅ Confirmado',
            cancelled: '❌ Cancelado',
            completed: '🎉 Concluído'
        };
        return statusMap[status] || status;
    }

    async getAvailableSlots(serviceId, date) {
        try {
            const service = await this.getService(serviceId);
            if (!service) throw new Error('Serviço não encontrado');

            // Horários disponíveis (exemplo: 9h às 18h)
            const slots = [];
            const startHour = 9;
            const endHour = 18;
            
            // Duração do serviço em minutos
            const duration = service.duration;
            
            // Buscar agendamentos existentes
            const existingBookings = await this.db.all(`
                SELECT time
                FROM bookings
                WHERE service_id = ? AND date = ? AND status != 'cancelled'
            `, [serviceId, date]);

            const bookedTimes = new Set(existingBookings.map(b => b.time));

            // Gerar slots disponíveis
            for (let hour = startHour; hour < endHour; hour++) {
                for (let minute = 0; minute < 60; minute += duration) {
                    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    
                    if (!bookedTimes.has(time)) {
                        slots.push(time);
                    }
                }
            }

            return slots;
        } catch (err) {
            this.logger.error('Erro ao buscar horários disponíveis:', err);
            return [];
        }
    }
}

module.exports = ServiceSystem;