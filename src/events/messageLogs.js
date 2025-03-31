// src/events/messageLogs.js
const { Events, AuditLogEvent } = require('discord.js');
const logEvents = require('../modules/log-events');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('Mesaj log dinleyicileri başlatılıyor...');
        
        // Mesaj silme
        client.on(Events.MessageDelete, async message => {
            // Geçersiz veya bot mesajlarını kontrol et
            if (!message.guild || message.author?.bot) return;
            
            try {
                // Ek bilgileri topla
                const attachments = message.attachments.size > 0 
                    ? message.attachments.map(a => `[${a.name || 'Dosya'}](${a.proxyURL})`).join(', ')
                    : null;
                
                // Mesaj içeriğini formatla
                let content = message.content || 'İçerik yok';
                
                // Uzun mesajları kısalt
                if (content.length > 1024) {
                    content = content.slice(0, 1021) + '...';
                }
                
                // Fields oluştur
                const fields = [
                    { name: 'Yazar', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Bilinmiyor', inline: true },
                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Mesaj ID', value: message.id, inline: true }
                ];
                
                if (content) {
                    fields.push({ name: 'İçerik', value: content });
                }
                
                if (attachments) {
                    fields.push({ name: 'Dosyalar', value: attachments });
                }
                
                // Düzeltildi: message.guild ekledik (guild değişkeni yerine)
                await logEvents.sendLog(message.guild, 'message', 'Bir mesaj silindi.', {
                    color: '#ff0000',
                    title: '🗑️ Mesaj Silindi',
                    fields: fields,
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Mesaj silme log hatası:', error);
            }
        });
        
        // Mesaj güncelleme
        client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            // Geçersiz veya bot mesajlarını kontrol et
            if (!oldMessage.guild || oldMessage.author?.bot) return;
            
            // İçerik değişmediyse loglama
            if (oldMessage.content === newMessage.content) return;
            
            try {
                // Eski ve yeni içeriği formatla
                let oldContent = oldMessage.content || 'İçerik yok';
                let newContent = newMessage.content || 'İçerik yok';
                
                // Uzun mesajları kısalt
                if (oldContent.length > 1024) {
                    oldContent = oldContent.slice(0, 1021) + '...';
                }
                
                if (newContent.length > 1024) {
                    newContent = newContent.slice(0, 1021) + '...';
                }
                
                // Düzeltildi: Eksik description parametresi eklendi
                await logEvents.sendLog(newMessage.guild, 'message', 'Bir mesaj düzenlendi.', {
                    color: '#ffaa00',
                    title: '✏️ Mesaj Düzenlendi',
                    fields: [
                        { name: 'Yazar', value: newMessage.author ? `<@${newMessage.author.id}> (${newMessage.author.tag})` : 'Bilinmiyor', inline: true },
                        { name: 'Kanal', value: `<#${newMessage.channel.id}>`, inline: true },
                        { name: 'Mesaj Linki', value: `[Mesaja Git](${newMessage.url})`, inline: true },
                        { name: 'Önceki İçerik', value: oldContent },
                        { name: 'Yeni İçerik', value: newContent }
                    ],
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Mesaj güncelleme log hatası:', error);
            }
        });
        
        // Toplu mesaj silme
        /*
        client.on(Events.MessageBulkDelete, async messages => {
            if (messages.size === 0) return;
            const firstMessage = messages.first();
            if (!firstMessage.guild) return;
            
            try {
                const channel = firstMessage.channel;
                
                // Düzeltildi: firstMessage.guild kullanıldı ve count yerine messages.size eklendi
                await logEvents.sendLog(firstMessage.guild, 'message', `**${messages.size}** mesaj <#${channel.id}> kanalında silindi.`, {
                    color: '#ff0000',
                    title: '🗑️ Toplu Mesaj Silindi',
                    fields: [
                        { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
                        { name: 'Mesaj Sayısı', value: messages.size.toString(), inline: true }
                    ],
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Toplu mesaj silme log hatası:', error);
            }
        });
        */
        
        console.log('Mesaj log dinleyicileri başlatıldı!');
    }
};