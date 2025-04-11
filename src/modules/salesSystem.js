const config = require('../../config/config');
const DatabaseManager = require('../database/manager');
const Logger = require('../utils/logger');

class SalesSystem {
    constructor() {
        this.logger = new Logger();
        this.db = DatabaseManager.getInstance();
        this.carts = new Map();
    }

    async addProduct(product) {
        try {
            return await this.db.addProduct(product);
        } catch (err) {
            this.logger.error('Erro ao adicionar produto:', err);
            return null;
        }
    }

    async getProduct(productId) {
        try {
            return await this.db.getProduct(productId);
        } catch (err) {
            this.logger.error('Erro ao buscar produto:', err);
            return null;
        }
    }

    async listProducts(category = null) {
        try {
            const products = await this.db.listProducts(category);
            return products.filter(p => p.stock > 0);
        } catch (err) {
            this.logger.error('Erro ao listar produtos:', err);
            return [];
        }
    }

    async updateProduct(productId, updates) {
        try {
            return await this.db.updateProduct(productId, updates);
        } catch (err) {
            this.logger.error('Erro ao atualizar produto:', err);
            return false;
        }
    }

    async deleteProduct(productId) {
        try {
            return await this.db.deleteProduct(productId);
        } catch (err) {
            this.logger.error('Erro ao deletar produto:', err);
            return false;
        }
    }

    // Gerenciamento de carrinho
    addToCart(userId, productId, quantity = 1) {
        if (!this.carts.has(userId)) {
            this.carts.set(userId, new Map());
        }
        const cart = this.carts.get(userId);
        cart.set(productId, (cart.get(productId) || 0) + quantity);
    }

    removeFromCart(userId, productId) {
        if (!this.carts.has(userId)) return false;
        return this.carts.get(userId).delete(productId);
    }

    async getCart(userId) {
        if (!this.carts.has(userId)) return [];

        const cart = this.carts.get(userId);
        const items = [];

        for (const [productId, quantity] of cart.entries()) {
            const product = await this.getProduct(productId);
            if (product && product.stock >= quantity) {
                items.push({
                    ...product,
                    quantity,
                    total: product.price * quantity
                });
            }
        }

        return items;
    }

    async checkout(userId) {
        try {
            const items = await this.getCart(userId);
            if (items.length === 0) return null;

            // Calcular total
            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            const tax = subtotal * config.sales.taxRate;
            const total = subtotal + tax + config.sales.deliveryFee;

            // Verificar valor mínimo
            if (total < config.sales.minOrderValue) {
                throw new Error(`Pedido mínimo: ${config.sales.currency} ${config.sales.minOrderValue}`);
            }

            // Verificar valor máximo
            if (total > config.sales.maxOrderValue) {
                throw new Error(`Pedido máximo: ${config.sales.currency} ${config.sales.maxOrderValue}`);
            }

            // Criar pedido
            const order = {
                userId,
                items,
                subtotal,
                tax,
                deliveryFee: config.sales.deliveryFee,
                total,
                status: 'pending',
                createdAt: new Date()
            };

            // Salvar pedido e atualizar estoque
            const savedOrder = await this.db.createOrder(order);
            if (savedOrder) {
                for (const item of items) {
                    await this.updateProduct(item.id, {
                        stock: item.stock - item.quantity
                    });
                }
                this.carts.delete(userId);
            }

            return savedOrder;

        } catch (err) {
            this.logger.error('Erro no checkout:', err);
            throw err;
        }
    }

    formatCurrency(value) {
        return `${config.sales.currency} ${value.toFixed(2)}`;
    }

    formatOrderSummary(order) {
        let summary = '🛍️ *Resumo do Pedido*\n\n';

        // Itens
        order.items.forEach(item => {
            summary += `📦 ${item.name}\n`;
            summary += `   Quantidade: ${item.quantity}\n`;
            summary += `   Preço: ${this.formatCurrency(item.price)}\n`;
            summary += `   Total: ${this.formatCurrency(item.total)}\n\n`;
        });

        // Totais
        summary += `📋 *Subtotal:* ${this.formatCurrency(order.subtotal)}\n`;
        summary += `💰 *Taxa:* ${this.formatCurrency(order.tax)}\n`;
        summary += `🚚 *Entrega:* ${this.formatCurrency(order.deliveryFee)}\n`;
        summary += `💵 *Total:* ${this.formatCurrency(order.total)}\n\n`;
        summary += `📊 *Status:* ${order.status}`;

        return summary;
    }
}

module.exports = SalesSystem;
