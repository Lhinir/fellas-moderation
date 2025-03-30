// src/events/logEvents.js
const { Events } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log('Log events listeners ayarlanıyor...');
        
        // Mesaj Silme Olayı
        client.on(Events.MessageDelete, async (message) => {
            if (message.author?.bot) return;
            if (!message.guild) return;
            
            try {
                console.log(`Mesaj silindi: ${message.content}`);
                
                await client.logger.log(message.guild.id, 'moderation', {
                    description: 'Mesaj silindi',
                    user: {
                        id: message.author?.id || 'Bilinmiyor',
                        tag: message.author?.tag || 'Bilinmiyor'
                    },
                    channel: {
                        id: message.channel.id,
                        name: message.channel.name
                    },
                    content: message.content || 'İçerik alınamadı',
                    attachments: message.attachments.size || 0
                });
            } catch (error) {
                console.error('Mesaj silme logu oluşturulurken hata:', error);
            }
        });
        
        // Mesaj Düzenleme Olayı
        client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            if (oldMessage.author?.bot) return;
            if (!oldMessage.guild) return;
            if (oldMessage.content === newMessage.content) return;
            
            try {
                await client.logger.log(oldMessage.guild.id, 'moderation', {
                    description: 'Mesaj düzenlendi',
                    user: {
                        id: oldMessage.author?.id || 'Bilinmiyor',
                        tag: oldMessage.author?.tag || 'Bilinmiyor'
                    },
                    channel: {
                        id: oldMessage.channel.id,
                        name: oldMessage.channel.name
                    },
                    oldContent: oldMessage.content || 'İçerik alınamadı',
                    newContent: newMessage.content || 'İçerik alınamadı'
                });
            } catch (error) {
                console.error('Mesaj düzenleme logu oluşturulurken hata:', error);
            }
        });
        
        // Rol Değişikliği Olayı
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
            
            try {
                // Eklenen roller
                const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                
                // Kaldırılan roller
                const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                
                if (addedRoles.size > 0) {
                    await client.logger.log(newMember.guild.id, 'moderation', {
                        description: 'Kullanıcıya rol eklendi',
                        user: {
                            id: newMember.user.id,
                            tag: newMember.user.tag
                        },
                        roles: addedRoles.map(r => r.name).join(', ')
                    });
                }
                
                if (removedRoles.size > 0) {
                    await client.logger.log(newMember.guild.id, 'moderation', {
                        description: 'Kullanıcıdan rol kaldırıldı',
                        user: {
                            id: newMember.user.id,
                            tag: newMember.user.tag
                        },
                        roles: removedRoles.map(r => r.name).join(', ')
                    });
                }
            } catch (error) {
                console.error('Rol değişikliği logu oluşturulurken hata:', error);
            }
        });
        
        // Kanal Oluşturma/Silme Olayları
        client.on(Events.ChannelCreate, async (channel) => {
            if (!channel.guild) return;
            
            try {
                await client.logger.log(channel.guild.id, 'server', {
                    description: 'Kanal oluşturuldu',
                    channel: {
                        id: channel.id,
                        name: channel.name,
                        type: channel.type
                    }
                });
            } catch (error) {
                console.error('Kanal oluşturma logu oluşturulurken hata:', error);
            }
        });
        
        client.on(Events.ChannelDelete, async (channel) => {
            if (!channel.guild) return;
            
            try {
                await client.logger.log(channel.guild.id, 'server', {
                    description: 'Kanal silindi',
                    channel: {
                        id: channel.id,
                        name: channel.name,
                        type: channel.type
                    }
                });
            } catch (error) {
                console.error('Kanal silme logu oluşturulurken hata:', error);
            }
        });
        
        // Ban Olayları
        client.on(Events.GuildBanAdd, async (ban) => {
            try {
                await client.logger.log(ban.guild.id, 'moderation', {
                    description: 'Kullanıcı yasaklandı',
                    user: {
                        id: ban.user.id,
                        tag: ban.user.tag
                    },
                    reason: ban.reason || 'Sebep belirtilmedi'
                });
            } catch (error) {
                console.error('Ban logu oluşturulurken hata:', error);
            }
        });
        
        client.on(Events.GuildBanRemove, async (ban) => {
            try {
                await client.logger.log(ban.guild.id, 'moderation', {
                    description: 'Kullanıcının yasağı kaldırıldı',
                    user: {
                        id: ban.user.id,
                        tag: ban.user.tag
                    }
                });
            } catch (error) {
                console.error('Ban kaldırma logu oluşturulurken hata:', error);
            }
        });
        
        console.log('Tüm log event dinleyicileri başarıyla kuruldu!');
    }
};