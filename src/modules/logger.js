// src/modules/logger.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(client) {
        this.client = client;
        this.logFolderPath = path.join(__dirname, '../../logs');
        this.ensureLogFolder();
    }

    ensureLogFolder() {
        if (!fs.existsSync(this.logFolderPath)) {
            fs.mkdirSync(this.logFolderPath, { recursive: true });
        }
    }

    async log(guildId, type, content) {
        try {
            console.log(`[LOGGER] Log oluşturuluyor - Guild: ${guildId}, Type: ${type}`);
            
            // Log dosyasına kaydet
            const logFilePath = path.join(this.logFolderPath, `${guildId}_${type}_log.txt`);
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${JSON.stringify(content)}\n`;
            
            fs.appendFileSync(logFilePath, logEntry);
            console.log(`[LOGGER] Dosya kaydedildi: ${logFilePath}`);
            
            // Discord kanalına gönder (eğer ayarlanmışsa)
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                console.log(`[LOGGER] Guild bulunamadı: ${guildId}`);
                return;
            }
            
            // ÖNEMLİ DEĞİŞİKLİK: Veritabanından log_channel_id alınıyor
            console.log(`[LOGGER] Guild config sorgulanıyor...`);
            const guildSettings = await this.client.database.get(
                'SELECT log_channel_id FROM guild_config WHERE guild_id = ?', 
                [guildId]
            );
            
            console.log(`[LOGGER] Guild config sonucu:`, guildSettings);
            
            if (!guildSettings || !guildSettings.log_channel_id) {
                console.log(`[LOGGER] Log kanalı ayarlanmamış`);
                return;
            }
            
            const logChannelId = guildSettings.log_channel_id;
            const logChannel = guild.channels.cache.get(logChannelId);
            
            if (!logChannel) {
                console.log(`[LOGGER] Log kanalı bulunamadı: ${logChannelId}`);
                return;
            }
            
            console.log(`[LOGGER] Log kanalı bulundu: ${logChannel.name}`);
            
            // Log embedi oluştur - daha basit bir çözüm
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${type.toUpperCase()} Log`)
                .setDescription(`${content.description || 'Log kaydı oluşturuldu.'}`)
                .setTimestamp();
            
            // İçeriğe bağlı olarak embed'e farklı alanlar ekle
            if (content.user) {
                embed.addFields({ name: 'Kullanıcı', value: `<@${content.user.id}>`, inline: true });
            }
            if (content.channel) {
                embed.addFields({ name: 'Kanal', value: `<#${content.channel.id}>`, inline: true });
            }
            if (content.reason) {
                embed.addFields({ name: 'Sebep', value: content.reason });
            }
            
            // Embed'i gönder
            await logChannel.send({ embeds: [embed] })
                .then(() => console.log(`[LOGGER] Log mesajı gönderildi`))
                .catch(err => console.error(`[LOGGER] Log mesajı gönderme hatası:`, err));
            
        } catch (error) {
            console.error('Log kaydı oluşturulurken hata:', error);
        }
    }
}

module.exports = Logger;