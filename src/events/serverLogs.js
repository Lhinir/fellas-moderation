// src/events/serverLogs.js

const { Events, AuditLogEvent } = require('discord.js');
const logEvents = require('../modules/log-events');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('Sunucu log dinleyicileri başlatılıyor...');
        
        // Kanal oluşturma
        client.on(Events.ChannelCreate, async channel => {
            if (!channel.guild) return;
            
            try {
                // Denetim kaydından kimin oluşturduğunu bul
                const auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.ChannelCreate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(channel.guild, 'server', {
                    color: '#00ff00',
                    title: '📝 Kanal Oluşturuldu',
                    description: `**${channel.name}** kanalı oluşturuldu`,
                    fields: [
                        { name: 'Kanal', value: `<#${channel.id}> (${channel.id})`, inline: true },
                        { name: 'Tür', value: channelTypeString(channel.type), inline: true },
                        { name: 'Oluşturan', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Kanal oluşturma log hatası:', error);
            }
        });
        
        // Kanal silme
        client.on(Events.ChannelDelete, async channel => {
            if (!channel.guild) return;
            
            try {
                // Denetim kaydından kimin sildiğini bul
                const auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.ChannelDelete
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(channel.guild, 'server', {
                    color: '#ff0000',
                    title: '🗑️ Kanal Silindi',
                    description: `**${channel.name}** kanalı silindi`,
                    fields: [
                        { name: 'Kanal Adı', value: channel.name, inline: true },
                        { name: 'Kanal ID', value: channel.id, inline: true },
                        { name: 'Tür', value: channelTypeString(channel.type), inline: true },
                        { name: 'Silen', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Kanal silme log hatası:', error);
            }
        });
        
        // Kanal güncelleme
        client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
            if (!newChannel.guild) return;
            
            try {
                // Değişiklikleri tespit et
                const changes = [];
                
                if (oldChannel.name !== newChannel.name) {
                    changes.push(`**İsim:** ${oldChannel.name} → ${newChannel.name}`);
                }
                
                if (oldChannel.topic !== newChannel.topic) {
                    changes.push(`**Konu:** ${oldChannel.topic || 'Yok'} → ${newChannel.topic || 'Yok'}`);
                }
                
                if (oldChannel.parentId !== newChannel.parentId) {
                    const oldCategory = oldChannel.parent ? oldChannel.parent.name : 'Yok';
                    const newCategory = newChannel.parent ? newChannel.parent.name : 'Yok';
                    changes.push(`**Kategori:** ${oldCategory} → ${newCategory}`);
                }
                
                if (!oldChannel.nsfw !== !newChannel.nsfw) {
                    changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
                }
                
                // Değişiklik yoksa çık
                if (changes.length === 0) return;
                
                // Denetim kaydından kimin değiştirdiğini bul
                const auditLogs = await newChannel.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.ChannelUpdate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(newChannel.guild, 'server', {
                    color: '#ffaa00',
                    title: '✏️ Kanal Güncellendi',
                    description: `**${newChannel.name}** kanalı güncellendi`,
                    fields: [
                        { name: 'Kanal', value: `<#${newChannel.id}> (${newChannel.id})`, inline: true },
                        { name: 'Güncelleyen', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Değişiklikler', value: changes.join('\n') }
                    ]
                });
            } catch (error) {
                console.error('Kanal güncelleme log hatası:', error);
            }
        });
        
        // Rol oluşturma
        client.on(Events.GuildRoleCreate, async role => {
            try {
                // Denetim kaydından kimin oluşturduğunu bul
                const auditLogs = await role.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.RoleCreate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(role.guild, 'server', {
                    color: '#00ff00',
                    title: '🏷️ Rol Oluşturuldu',
                    description: `**${role.name}** rolü oluşturuldu`,
                    fields: [
                        { name: 'Rol', value: `<@&${role.id}> (${role.id})`, inline: true },
                        { name: 'Renk', value: role.hexColor, inline: true },
                        { name: 'Oluşturan', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Rol oluşturma log hatası:', error);
            }
        });
        
        // Rol silme
        client.on(Events.GuildRoleDelete, async role => {
            try {
                // Denetim kaydından kimin sildiğini bul
                const auditLogs = await role.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.RoleDelete
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(role.guild, 'server', {
                    color: '#ff0000',
                    title: '🗑️ Rol Silindi',
                    description: `**${role.name}** rolü silindi`,
                    fields: [
                        { name: 'Rol Adı', value: role.name, inline: true },
                        { name: 'Rol ID', value: role.id, inline: true },
                        { name: 'Renk', value: role.hexColor, inline: true },
                        { name: 'Silen', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Rol silme log hatası:', error);
            }
        });
        
        // Rol güncelleme
        client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
            try {
                // Değişiklikleri tespit et
                const changes = [];
                
                if (oldRole.name !== newRole.name) {
                    changes.push(`**İsim:** ${oldRole.name} → ${newRole.name}`);
                }
                
                if (oldRole.hexColor !== newRole.hexColor) {
                    changes.push(`**Renk:** ${oldRole.hexColor} → ${newRole.hexColor}`);
                }
                
                if (oldRole.hoist !== newRole.hoist) {
                    changes.push(`**Ayrı Göster:** ${oldRole.hoist ? 'Evet' : 'Hayır'} → ${newRole.hoist ? 'Evet' : 'Hayır'}`);
                }
                
                if (oldRole.mentionable !== newRole.mentionable) {
                    changes.push(`**Bahsedilebilir:** ${oldRole.mentionable ? 'Evet' : 'Hayır'} → ${newRole.mentionable ? 'Evet' : 'Hayır'}`);
                }
                
                // İzin değişiklikleri
                if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                    changes.push(`**İzinler:** Rol izinleri değiştirildi`);
                }
                
                // Değişiklik yoksa çık
                if (changes.length === 0) return;
                
                // Denetim kaydından kimin değiştirdiğini bul
                const auditLogs = await newRole.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.RoleUpdate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(newRole.guild, 'server', {
                    color: '#ffaa00',
                    title: '✏️ Rol Güncellendi',
                    description: `**${newRole.name}** rolü güncellendi`,
                    fields: [
                        { name: 'Rol', value: `<@&${newRole.id}> (${newRole.id})`, inline: true },
                        { name: 'Güncelleyen', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Değişiklikler', value: changes.join('\n') }
                    ]
                });
            } catch (error) {
                console.error('Rol güncelleme log hatası:', error);
            }
        });
        
        // Emoji oluşturma
        client.on(Events.GuildEmojiCreate, async emoji => {
            try {
                // Denetim kaydından kimin oluşturduğunu bul
                const auditLogs = await emoji.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.EmojiCreate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(emoji.guild, 'server', {
                    color: '#00ff00',
                    title: '😄 Emoji Oluşturuldu',
                    description: `**${emoji.name}** emojisi oluşturuldu`,
                    thumbnail: emoji.url,
                    fields: [
                        { name: 'Emoji', value: `<:${emoji.name}:${emoji.id}>`, inline: true },
                        { name: 'Emoji ID', value: emoji.id, inline: true },
                        { name: 'Oluşturan', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Emoji oluşturma log hatası:', error);
            }
        });
        
        // Emoji silme
        client.on(Events.GuildEmojiDelete, async emoji => {
            try {
                // Denetim kaydından kimin sildiğini bul
                const auditLogs = await emoji.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.EmojiDelete
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(emoji.guild, 'server', {
                    color: '#ff0000',
                    title: '🗑️ Emoji Silindi',
                    description: `**${emoji.name}** emojisi silindi`,
                    thumbnail: emoji.url,
                    fields: [
                        { name: 'Emoji Adı', value: emoji.name, inline: true },
                        { name: 'Emoji ID', value: emoji.id, inline: true },
                        { name: 'Silen', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Emoji silme log hatası:', error);
            }
        });
        
        // Emoji güncelleme
        client.on(Events.GuildEmojiUpdate, async (oldEmoji, newEmoji) => {
            try {
                // Değişiklikleri tespit et
                const changes = [];
                
                if (oldEmoji.name !== newEmoji.name) {
                    changes.push(`**İsim:** ${oldEmoji.name} → ${newEmoji.name}`);
                }
                
                // Değişiklik yoksa çık
                if (changes.length === 0) return;
                
                // Denetim kaydından kimin değiştirdiğini bul
                const auditLogs = await newEmoji.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.EmojiUpdate
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(newEmoji.guild, 'server', {
                    color: '#ffaa00',
                    title: '✏️ Emoji Güncellendi',
                    description: `**${newEmoji.name}** emojisi güncellendi`,
                    thumbnail: newEmoji.url,
                    fields: [
                        { name: 'Emoji', value: `<:${newEmoji.name}:${newEmoji.id}>`, inline: true },
                        { name: 'Emoji ID', value: newEmoji.id, inline: true },
                        { name: 'Güncelleyen', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Değişiklikler', value: changes.join('\n') }
                    ]
                });
            } catch (error) {
                console.error('Emoji güncelleme log hatası:', error);
            }
        });
        
        console.log('Sunucu log dinleyicileri başlatıldı!');
    }
};

// Yardımcı fonksiyonlar
function channelTypeString(type) {
    const types = {
        0: 'Metin Kanalı',
        2: 'Ses Kanalı',
        4: 'Kategori',
        5: 'Duyuru Kanalı',
        10: 'Duyuru Thread',
        11: 'Genel Thread',
        12: 'Özel Thread',
        13: 'Sahne Kanalı',
        14: 'Rehber Kanalı',
        15: 'Forum Kanalı'
    };
    
    return types[type] || `Bilinmeyen (${type})`;
}