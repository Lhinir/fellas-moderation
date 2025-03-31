// src/events/memberLogs.js - Düzeltilmiş Audit Log sorgulaması

const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        // Sadece Üye Güncelleme Olayı (Roller ve Nickname değişimi)
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                // Botları loglama (isteğe bağlı)
                if (newMember.user.bot) return;
                
                const logChannelId = await database.logs.getLogChannel(newMember.guild.id, 'member');
                if (!logChannelId) return;
                
                const logChannel = await newMember.guild.channels.fetch(logChannelId).catch(() => null);
                if (!logChannel) return;
                
                // Rol değişikliği kontrolü
                const oldRoles = oldMember.roles.cache;
                const newRoles = newMember.roles.cache;
                
                // Eklenen roller
                const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
                
                // Çıkarılan roller
                const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
                
                // Roller değiştiyse log gönder
                if (addedRoles.size > 0 || removedRoles.size > 0) {
                    const roleUpdateEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('Üye Rolleri Güncellendi')
                        .setDescription(`${newMember.user.tag} kullanıcısının rolleri değiştirildi.`)
                        .addFields(
                            { name: 'Kullanıcı', value: `<@${newMember.user.id}> (${newMember.user.id})` }
                        )
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    
                    if (addedRoles.size > 0) {
                        roleUpdateEmbed.addFields({
                            name: '✅ Eklenen Roller',
                            value: addedRoles.map(r => `<@&${r.id}>`).join(', ')
                        });
                    }
                    
                    if (removedRoles.size > 0) {
                        roleUpdateEmbed.addFields({
                            name: '❌ Çıkarılan Roller',
                            value: removedRoles.map(r => `<@&${r.id}>`).join(', ')
                        });
                    }
                    
                    try {
                        // Son değişikliği yapan kişiyi bulmaya çalış
                        // Düzeltilmiş kısım: String yerine sayısal AuditLogEvent kullan
                        const auditLogs = await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: AuditLogEvent.MemberRoleUpdate // Düzeltilmiş kısım
                        });
                        
                        const roleLog = auditLogs.entries.first();
                        if (roleLog && roleLog.target.id === newMember.id && roleLog.createdTimestamp > (Date.now() - 5000)) {
                            roleUpdateEmbed.addFields({
                                name: 'Değiştiren Kullanıcı',
                                value: `<@${roleLog.executor.id}> (${roleLog.executor.tag})`
                            });
                        }
                    } catch (error) {
                        console.error('Audit log erişim hatası:', error);
                    }
                    
                    await logChannel.send({ embeds: [roleUpdateEmbed] });
                }
                
                // Nickname değişikliği kontrolü
                if (oldMember.nickname !== newMember.nickname) {
                    const nicknameUpdateEmbed = new EmbedBuilder()
                        .setColor('#1E90FF')
                        .setTitle('Üye Takma Adı Değiştirildi')
                        .setDescription(`${newMember.user.tag} kullanıcısının takma adı değiştirildi.`)
                        .addFields(
                            { name: 'Kullanıcı', value: `<@${newMember.user.id}> (${newMember.user.id})` },
                            { name: 'Eski Takma Ad', value: oldMember.nickname || 'Yok' },
                            { name: 'Yeni Takma Ad', value: newMember.nickname || 'Yok' }
                        )
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    
                    try {
                        // Son değişikliği yapan kişiyi bulmaya çalış
                        // Düzeltilmiş kısım: String yerine sayısal AuditLogEvent kullan
                        const auditLogs = await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: AuditLogEvent.MemberUpdate // Düzeltilmiş kısım
                        });
                        
                        const nicknameLog = auditLogs.entries.first();
                        if (nicknameLog && nicknameLog.target.id === newMember.id && nicknameLog.createdTimestamp > (Date.now() - 5000)) {
                            nicknameUpdateEmbed.addFields({
                                name: 'Değiştiren Kullanıcı',
                                value: `<@${nicknameLog.executor.id}> (${nicknameLog.executor.tag})`
                            });
                        }
                    } catch (error) {
                        console.error('Audit log erişim hatası:', error);
                    }
                    
                    await logChannel.send({ embeds: [nicknameUpdateEmbed] });
                }
            } catch (error) {
                console.error('Üye güncelleme logu gönderilirken hata:', error);
            }
        });
        
        console.log('Rol ve takma ad değişikliği log sistemi başlatıldı.');
    }
};