// src/events/messageCreate.js - Düzeltilmiş

const { Events } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        try {
            // Bot mesajları için işlem yapma
            if (message.author.bot) return;
            
            // Sadece guild mesajlarını işle
            if (!message.guild) return;
            
            // Bu satır hata veriyor: client.db.getGuildConfig yerine SQLite kullanın
            // Örnek:
            // const prefix = await client.db.getGuildConfig(message.guild.id, 'prefix');
            
            // Doğru yöntem - database modülünü kullanarak
            const guildConfig = await database.get(
                'SELECT * FROM guild_settings WHERE guild_id = ?',
                [message.guild.id]
            );
            
            // Varsayılan prefix
            const prefix = guildConfig ? guildConfig.prefix : '!';
            
            // Mesaj prefix ile başlamıyorsa veya bottan geliyorsa işleme
            if (!message.content.startsWith(prefix) || message.author.bot) return;
            
            // Argümanları ve komutu ayır
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Komut koleksiyonunu kontrol et
            const command = client.commands.get(commandName);
            
            // Komut yoksa
            if (!command) return;
            
            // Komutu çalıştırmayı dene
            try {
                await command.execute(message, args);
            } catch (error) {
                console.error(`Komut çalıştırma hatası: ${error}`);
                message.reply('Komutu çalıştırırken bir hata oluştu!').catch(console.error);
            }
        } catch (error) {
            console.error('MessageCreate olayı hatası:', error);
        }
    },
};