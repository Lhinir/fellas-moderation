// src/events/memberLogs.js
const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const database = require('../modules/database');

// Rol değişikliklerini takip etmek için bir önbellek
const roleChangeCache = new Map();
// Takma ad değişikliklerini takip etmek için bir önbellek
const nicknameChangeCache = new Map();

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        // Üye Ayrılma Olayı - Özel log kanalını kullanacak şekilde güncellenmiş
        client.on(Events.GuildMemberRemove, async (member) => {
            try {
                // Botları loglama (isteğe bağlı)
                if (member.user.bot) return;
                
                // Eğer üye yasaklandıysa, bu event için log gönderme
                const isBanned = await member.guild.bans.fetch().then(bans => 
                    bans.has(member.user.id)
                ).catch(() => false);
                
                if (isBanned) {
                    // Kullanıcı banlandıysa ayrılma mesajı gönderme
                    return;
                }
                
                // Önce özel ayrılma log kanalını kontrol et
                let logChannelId = await database.logs.getLogChannel(member.guild.id, 'leave');
                
                // Eğer özel ayrılma kanalı yoksa, varsayılan üye log kanalını kullan
                if (!logChannelId) {
                    logChannelId = await database.logs.getLogChannel(member.guild.id, 'member');
                    if (!logChannelId) return; // Hiçbir log kanalı yoksa çık
                }
                
                const logChannel = await member.guild.channels.fetch(logChannelId).catch(() => null);
                if (!logChannel) return;
                
                // Basit bir ayrılma mesajı gönder
                await logChannel.send(`**${member.user.tag}** (${member.user.id}) sunucudan ayrıldı.`);
                
            } catch (error) {
                console.error('Üye ayrılma logu gönderilirken hata:', error);
            }
        });

        // Rol ve Takma Adı Değişikliği Olayı
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                // Botları loglama (isteğe bağlı)
                if (newMember.user.bot) return;
                
                const logChannelId = await database.logs.getLogChannel(newMember.guild.id, 'member');
                if (!logChannelId) return;
                
                const logChannel = await newMember.guild.channels.fetch(logChannelId).catch(() => null);
                if (!logChannel) return;
                
                // Benzersiz bir üye tanımlayıcısı oluştur
                const memberKey = `${newMember.guild.id}-${newMember.id}`;
                
                // Değişiklikleri belirle
                const oldRoleIds = Array.from(oldMember.roles.cache.keys());
                const newRoleIds = Array.from(newMember.roles.cache.keys());
                
                // Rolleri sırala ve karşılaştır
                const sortedOldRoles = [...oldRoleIds].sort().join(',');
                const sortedNewRoles = [...newRoleIds].sort().join(',');
                
                const roleChanged = sortedOldRoles !== sortedNewRoles;
                const nicknameChanged = oldMember.nickname !== newMember.nickname;
                
                // Audit log doğrulaması için değişken
                let isRealRoleChange = false;
                let isRealNicknameChange = false;
                
                // Rol değişikliği kontrolü
                if (roleChanged) {
                    // Değişiklik yoklama - AuditLog ile doğrula
                    try {
                        const auditLogs = await newMember.guild.fetchAuditLogs({
                            limit: 3, // Son birkaç işleme bak
                            type: AuditLogEvent.MemberRoleUpdate
                        });
                        
                        // Son 5 saniye içinde gerçekleşen rol değişimi var mı kontrol et
                        const recentRoleLog = auditLogs.entries.find(entry => 
                            entry.target.id === newMember.id && 
                            entry.createdTimestamp > (Date.now() - 5000)
                        );
                        
                        if (recentRoleLog) {
                            isRealRoleChange = true;
                            
                            // Önbelleğe bu değişikliği kaydet - 10 saniye içinde aynı değişikliği tekrar loglamayı önle
                            const cacheKey = `${memberKey}-${sortedNewRoles}`;
                            
                            if (roleChangeCache.has(cacheKey)) {
                                // Bu değişiklik önceden loglanmış, atlayalım
                                isRealRoleChange = false;
                            } else {
                                // Önbelleğe ekle ve 10 saniye sonra sil
                                roleChangeCache.set(cacheKey, true);
                                setTimeout(() => roleChangeCache.delete(cacheKey), 10000);
                            }
                        }
                    } catch (error) {
                        console.error('Audit log erişim hatası:', error);
                    }
                    
                    // Gerçek rol değişimi tespit edilirse log gönder
                    if (isRealRoleChange) {
                        // Eklenen roller
                        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                        
                        // Çıkarılan roller
                        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                        
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
                            const auditLogs = await newMember.guild.fetchAuditLogs({
                                limit: 1,
                                type: AuditLogEvent.MemberRoleUpdate
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
                }
                
                // Nickname değişikliği kontrolü
                if (nicknameChanged) {
                    // Değişiklik yoklama - AuditLog ile doğrula
                    try {
                        const auditLogs = await newMember.guild.fetchAuditLogs({
                            limit: 3,
                            type: AuditLogEvent.MemberUpdate
                        });
                        
                        // Son 5 saniye içinde gerçekleşen takma ad değişimi var mı kontrol et
                        const recentNicknameLog = auditLogs.entries.find(entry => 
                            entry.target.id === newMember.id && 
                            entry.createdTimestamp > (Date.now() - 5000) &&
                            entry.changes.some(change => change.key === 'nick')
                        );
                        
                        if (recentNicknameLog) {
                            isRealNicknameChange = true;
                            
                            // Önbelleğe bu değişikliği kaydet - 10 saniye içinde aynı değişikliği tekrar loglamayı önle
                            const cacheKey = `${memberKey}-${newMember.nickname || 'null'}`;
                            
                            if (nicknameChangeCache.has(cacheKey)) {
                                // Bu değişiklik önceden loglanmış, atlayalım
                                isRealNicknameChange = false;
                            } else {
                                // Önbelleğe ekle ve 10 saniye sonra sil
                                nicknameChangeCache.set(cacheKey, true);
                                setTimeout(() => nicknameChangeCache.delete(cacheKey), 10000);
                            }
                        }
                    } catch (error) {
                        console.error('Audit log erişim hatası:', error);
                    }
                    
                    // Gerçek takma ad değişimi tespit edilirse ve rol değişimi loglanmadıysa log gönder
                    if (isRealNicknameChange && !isRealRoleChange) {
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
                            const auditLogs = await newMember.guild.fetchAuditLogs({
                                limit: 1,
                                type: AuditLogEvent.MemberUpdate
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
                }
            } catch (error) {
                console.error('Üye güncelleme logu gönderilirken hata:', error);
            }
        });
        
        console.log('Üye, rol ve takma ad değişikliği log sistemi başlatıldı.');
    }
};