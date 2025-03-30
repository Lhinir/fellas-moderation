// src/events/logEvents.js (düzeltilmiş)

const { EmbedBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        try {
            // Direkt mesaj içeriğini loglayalım
            console.log('Mesaj silindi:', message.content || '[içerik yok]');
            
            // Bot mesajlarını loglama
            if (message.author?.bot) return;
            
            // DM mesajlarını loglama
            if (!message.guild) return;
            
            // Mesaj içeriği yoksa loglama (eski mesajlar vb.)
            if (!message.content && !message.attachments.size) return;
            
            // Veritabanından log kanalını al
            const logChannelId = await database.logs.getLogChannel(message.guild.id, 'message').catch(() => null);
            
            if (!logChannelId) {
                console.log('Bu sunucu için mesaj log kanalı ayarlanmamış.');
                return;
            }
            
            // Log kanalını bul
            const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
            if (!logChannel) {
                console.log('Mesaj log kanalı bulunamadı!');
                return;
            }
            
            // Log embed'ini oluştur
            const logEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🗑️ Mesaj Silindi')
                .setTimestamp();
            
            // Mesaj içeriği
            if (message.content) {
                // Uzun mesajları kısalt
                const content = message.content.length > 1024 
                    ? message.content.slice(0, 1021) + '...'
                    : message.content;
                
                logEmbed.addFields({ name: 'Mesaj İçeriği', value: content });
            }
            
            // Mesaj bilgileri
            logEmbed.addFields(
                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Kullanıcı', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Bilinmiyor', inline: true }
            );
            
            // Dosya varsa ekle
            if (message.attachments.size > 0) {
                const attachmentList = message.attachments.map(a => `[${a.name || 'Dosya'}](${a.proxyURL})`).join(', ');
                logEmbed.addFields({ name: 'Dosyalar', value: attachmentList });
            }
            
            // Footer
            if (message.author) {
                logEmbed.setFooter({ 
                    text: `Kullanıcı ID: ${message.author.id} • Mesaj ID: ${message.id}` 
                });
            }
            
            // Log mesajını gönder
            await logChannel.send({ embeds: [logEmbed] });
            
        } catch (error) {
            console.error('Mesaj silme logu oluşturulurken hata:', error);
        }
    }
};