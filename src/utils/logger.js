const fs = require('fs');
const path = require('path');
const config = require('../../config/config');

class Logger {
    constructor() {
        this.logDir = config.logs.path;
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFile() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${date}.log`);
    }

    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const logData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${message}${logData}\n`;
    }

    write(level, message, data) {
        const logMessage = this.formatMessage(level, message, data);
        
        // Escrever no arquivo
        fs.appendFileSync(this.getLogFile(), logMessage);

        // Exibir no console com cores
        const colors = {
            ERROR: '\x1b[31m', // Vermelho
            WARN: '\x1b[33m',  // Amarelo
            INFO: '\x1b[36m',  // Ciano
            DEBUG: '\x1b[90m'  // Cinza
        };

        console.log(`${colors[level]}${logMessage}\x1b[0m`);
    }

    error(message, data) {
        this.write('ERROR', message, data);
    }

    warn(message, data) {
        this.write('WARN', message, data);
    }

    info(message, data) {
        this.write('INFO', message, data);
    }

    debug(message, data) {
        if (config.logs.level === 'debug') {
            this.write('DEBUG', message, data);
        }
    }
}

module.exports = Logger;
