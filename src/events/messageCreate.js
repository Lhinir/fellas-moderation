// src/events/messageCreate.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Botun kendi mesajlarını ve diğer botların mesajlarını yoksay
        if (message.author.bot) return;
        
        // DM mesajlarını yoksay
        if (!message.guild) return;
        
        try {
            // Prefix komutları için kontrol (Bot hem slash hem prefix komutları destekliyorsa)
            const guildConfig = await client.database.getGuildConfig(message.guild.id);
            const prefix = guildConfig?.prefix || '!';
            
            if (message.content.startsWith(prefix)) {
                // Prefix komutları için işlemler buraya eklenebilir
                // NOT: Bot öncelikle slash komutları kullanıyor, 
                // bu kısım eski prefix komutları desteklemek için
            }
            
            // AutoMod ve diğer kontroller için zaten index.js'de event listeners var
            
        } catch (error) {
            console.error('MessageCreate olayında hata:', error);
        }
    }
};