const os = require('os');
const Logger = require('./logger');

class Environment {
    static check() {
        const logger = new Logger();
        const platform = os.platform();
        const arch = os.arch();

        logger.info(`Platform: ${platform}, Architecture: ${arch}`);

        // Verificar se está rodando em Android
        if (platform === 'android') {
            // Configurações específicas para Android
            process.env.ANDROID = 'true';
            
            // Ajustar paths para Android
            const androidDataPath = '/storage/emulated/0/Bots/CarsaiBot Commerce/';
            process.env.DATA_PATH = androidDataPath;
            
            logger.info('Rodando em ambiente Android');
        }

        // Verificar memória disponível
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;

        logger.info(`Memória: ${memUsage.toFixed(2)}% em uso`);

        // Retornar configurações do ambiente
        return {
            platform,
            arch,
            isAndroid: platform === 'android',
            memoryUsage: memUsage,
            dataPath: process.env.DATA_PATH || process.cwd()
        };
    }
}

module.exports = Environment;