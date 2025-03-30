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
            if (message.author?.bot) return; // Bot mesajlarını loglama
            if (!message.guild) return; // DM mesajlarını loglama
            
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
                
                await logEvents.sendLog(message.guild, 'message', {
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
            if (oldMessage.author?.bot) return; // Bot mesajlarını loglama
            if (!oldMessage.guild) return; // DM mesajlarını loglama
            if (oldMessage.content === newMessage.content) return; // İçerik değişmediyse loglama
            
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
                
                await logEvents.sendLog(newMessage.guild, 'message', {
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
        client.on(Events.MessageBulkDelete, async messages => {
            if (messages.size === 0) return;
            const firstMessage = messages.first();
            if (!firstMessage.guild) return;
            
            try {
                const channel = firstMessage.channel;
                
                await logEvents.sendLog(firstMessage.guild, 'message', {
                    color: '#ff0000',
                    title: '🗑️ Toplu Mesaj Silindi',
                    description: `**${messages.size}** mesaj <#${channel.id}> kanalında silindi.`,
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
        
        console.log('Mesaj log dinleyicileri başlatıldı!');
    }
};