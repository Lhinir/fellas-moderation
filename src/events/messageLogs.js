// src/events/messageLog.js

const { Events, EmbedBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        // Silinen mesaj önbelleği - Mesaj düzenlemelerini takip etmek için
        const editedMessages = new Map();
        
        // Mesaj silme olayı
        client.on(Events.MessageDelete, async (message) => {
            try {
                // Mesaj bir bottan mı geliyor kontrol et
                if (message.author && message.author.bot) return;

                // DM mesajlarını yoksay
                if (!message.guild) return;

                // Log kanalını kontrol et
                const logChannelId = await database.logs.getLogChannel(message.guild.id, 'message');
                if (!logChannelId) return;
                
                // Log kanalını bul
                const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
                if (!logChannel) return;
                
                // Embed oluştur
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Mesaj Silindi')
                    .setDescription(`<#${message.channel.id}> kanalında bir mesaj silindi.`)
                    .addFields(
                        { name: 'Yazan', value: `<@${message.author.id}> (${message.author.tag})` },
                        { name: 'Kanal', value: `<#${message.channel.id}>` }
                    )
                    .setFooter({ text: `Kullanıcı ID: ${message.author.id} • Mesaj ID: ${message.id}` })
                    .setTimestamp();
                
                // Mesaj içeriği varsa ekle
                if (message.content) {
                    embed.addFields({ name: 'İçerik', value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content });
                }
                
                // Mesajda resim varsa ekle
                if (message.attachments.size > 0) {
                    const attachmentList = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
                    embed.addFields({ name: 'Ekler', value: attachmentList });
                }
                
                // Log gönder
                await logChannel.send({ embeds: [embed] }).catch(console.error);
                
            } catch (error) {
                console.error('Mesaj silme logu gönderilirken hata:', error);
            }
        });
        
        // Mesaj düzenleme olayı
        client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            try {
                // Eğer mesaj içerikleri aynıysa yoksay
                if (oldMessage.content === newMessage.content) return;
                
                // Mesaj bir bottan mı geliyor kontrol et
                if (newMessage.author && newMessage.author.bot) return;
                
                // DM mesajlarını yoksay
                if (!newMessage.guild) return;
                
                // Aynı mesajın kısa süre içinde birden fazla kez düzenlenmesini önle
                const messageId = newMessage.id;
                const now = Date.now();
                const lastEditTime = editedMessages.get(messageId);
                
                if (lastEditTime && now - lastEditTime < 10000) { // 10 saniye içinde tekrar düzenlendi mi kontrol et
                    return; // Kısa sürede tekrar düzenlendiyse log gönderme
                }
                
                // Mesajın düzenlenme zamanını kaydet
                editedMessages.set(messageId, now);
                
                // 1 dakika sonra mesajı önbellekten temizle (bellek tasarrufu için)
                setTimeout(() => {
                    editedMessages.delete(messageId);
                }, 60000);
                
                // Log kanalını kontrol et
                const logChannelId = await database.logs.getLogChannel(newMessage.guild.id, 'message');
                if (!logChannelId) return;
                
                // Log kanalını bul
                const logChannel = await newMessage.guild.channels.fetch(logChannelId).catch(() => null);
                if (!logChannel) return;
                
                // Embed oluştur
                const embed = new EmbedBuilder()
                    .setColor('#FFCC00')
                    .setTitle('Mesaj Düzenlendi')
                    .setDescription(`<#${newMessage.channel.id}> kanalında bir mesaj düzenlendi.`)
                    .addFields(
                        { name: 'Yazan', value: `<@${newMessage.author.id}> (${newMessage.author.tag})` },
                        { name: 'Kanal', value: `<#${newMessage.channel.id}>` },
                        { name: 'Mesaja Git', value: `[Tıkla](${newMessage.url})` }
                    )
                    .setFooter({ text: `Kullanıcı ID: ${newMessage.author.id} • Mesaj ID: ${newMessage.id}` })
                    .setTimestamp();
                
                // Eski mesaj içeriği varsa ekle
                if (oldMessage.content) {
                    embed.addFields({ 
                        name: 'Eski İçerik', 
                        value: oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content 
                    });
                }
                
                // Yeni mesaj içeriği varsa ekle
                if (newMessage.content) {
                    embed.addFields({ 
                        name: 'Yeni İçerik', 
                        value: newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content 
                    });
                }
                
                // Log gönder
                await logChannel.send({ embeds: [embed] }).catch(console.error);
                
            } catch (error) {
                console.error('Mesaj düzenleme logu gönderilirken hata:', error);
            }
        });
        
        console.log('Mesaj log sistemi başlatıldı.');
    }
};