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
        
        // Rol silme olayı
client.on(Events.GuildRoleDelete, async (role) => {
    try {
        // 1. Sunucu kontrolü ekleyin
        if (!role.guild || !role.guild.available) {
            console.log('Rol silme log hatası: Sunucu bulunamadı veya kullanılamıyor');
            return;
        }
        
        // 2. Log kanalını kontrol et - eğer yoksa erken çık
        const logChannelId = await database.logs.getLogChannel(role.guild.id, 'server');
        if (!logChannelId) return;
        
        const logChannel = await role.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // 3. Bot'un sunucuya erişimi var mı kontrol edin
        const botMember = await role.guild.members.fetchMe().catch(() => null);
        if (!botMember) {
            console.log(`Rol silme log hatası: Bot artık ${role.guild.id} ID'li sunucuda değil`);
            return;
        }
        
        // 4. Audit log görüntüleme yetkisi kontrolü
        if (!botMember.permissions.has('ViewAuditLog')) {
            console.log(`Rol silme log hatası: Bot'un denetim günlüklerini görüntüleme yetkisi yok (Sunucu: ${role.guild.id})`);
            
            // Yetkisiz durumda basit log gönder
            const simpleEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🗑️ Rol Silindi')
                .setDescription(`Bir rol silindi, ancak detaylar alınamadı.`)
                .addFields(
                    { name: 'Rol Adı', value: role.name },
                    { name: 'Rol ID', value: role.id },
                    { name: 'Rol Rengi', value: role.hexColor }
                )
                .setTimestamp();
                
            await logChannel.send({ embeds: [simpleEmbed] }).catch(console.error);
            return;
        }
        
        // 5. Audit log erişiminde hata yakalama ekleyin
        const fetchedLogs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: 32 // ROLE_DELETE
        }).catch(err => {
            console.error(`Denetim günlüklerine erişim hatası (Sunucu: ${role.guild.id}):`, err);
            
            // Hata durumunda basit log gönder
            const simpleEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🗑️ Rol Silindi')
                .setDescription(`Bir rol silindi, ancak silinen kişi bilgisi alınamadı.`)
                .addFields(
                    { name: 'Rol Adı', value: role.name },
                    { name: 'Rol ID', value: role.id },
                    { name: 'Rol Rengi', value: role.hexColor }
                )
                .setTimestamp();
                
            logChannel.send({ embeds: [simpleEmbed] }).catch(console.error);
            return null;
        });
        
        if (!fetchedLogs) return; // Loglar alınamadıysa ve basit log gönderildiyse işlemi durdur
        
        // Denetim günlüğünden silinen kişiyi bul
        const deletionLog = fetchedLogs.entries.first();
        
        // Detaylı embed oluştur
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🗑️ Rol Silindi')
            .addFields(
                { name: 'Rol Adı', value: role.name, inline: true },
                { name: 'Rol ID', value: role.id, inline: true },
                { name: 'Rol Rengi', value: role.hexColor, inline: true }
            )
            .setTimestamp();
        
        // Eğer denetim günlüğünden bilgi alınabildiyse, silen kişiyi ekle
        if (deletionLog) {
            const { executor } = deletionLog;
            
            if (executor) {
                embed.addFields(
                    { name: 'Silen Kullanıcı', value: `${executor.tag} (${executor.id})`, inline: true }
                );
                embed.setFooter({ text: `Silinen kişi: ${executor.tag}`, iconURL: executor.displayAvatarURL() });
            }
        }

        // Log kanalına gönder
        await logChannel.send({ embeds: [embed] });

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