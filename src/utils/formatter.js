class Formatter {
    static phone(number) {
        // Remover caracteres não numéricos
        number = number.replace(/\D/g, '');
        
        // Adicionar código do país se necessário
        if (number.length === 11) {
            number = '55' + number;
        }
        
        return number + '@s.whatsapp.net';
    }

    static currency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    static date(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(new Date(date));
    }

    static number(value) {
        return new Intl.NumberFormat('pt-BR').format(value);
    }

    static capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    static formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    static duration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        return [
            days && `${days}d`,
            hours && `${hours}h`,
            minutes && `${minutes}m`,
            seconds && `${seconds}s`
        ].filter(Boolean).join(' ');
    }

    static truncate(str, length, end = '...') {
        if (str.length <= length) return str;
        return str.slice(0, length - end.length) + end;
    }
}

module.exports = Formatter;
