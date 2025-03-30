// src/events/memberLogs.js

const { Events, AuditLogEvent } = require('discord.js');
const logEvents = require('../modules/log-events');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('Üye log dinleyicileri başlatılıyor...');
        
        // Üye katılma
        client.on(Events.GuildMemberAdd, async member => {
            try {
                // Hesap oluşturma tarihi ve yaşı
                const createdAt = Math.floor(member.user.createdTimestamp / 1000);
                const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
                
                await logEvents.sendLog(member.guild, 'member', {
                    color: '#00ff00',
                    title: '🟢 Üye Katıldı',
                    description: `**${member.user.tag}** sunucuya katıldı`,
                    thumbnail: member.user.displayAvatarURL({ dynamic: true }),
                    fields: [
                        { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                        { name: 'Hesap Oluşturma', value: `<t:${createdAt}:R> (<t:${createdAt}:D>)`, inline: true },
                        { name: 'Hesap Yaşı', value: `${accountAge} gün`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Üye katılma log hatası:', error);
            }
        });
        
        // Üye ayrılma
        client.on(Events.GuildMemberRemove, async member => {
            try {
                // Sunucuda kalma süresi
                const joinedAt = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
                const timeInServer = joinedAt ? Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24)) : 'Bilinmiyor';
                
                // Kullanıcı atıldı mı yoksa kendi mi çıktı
                let actionType = '❌ Üye Ayrıldı';
                let actionDescription = `**${member.user.tag}** sunucudan ayrıldı`;
                let actionColor = '#ff0000';
                let executor = null;
                
                try {
                    // Son kick denetim kaydını kontrol et
                    const kickLogs = await member.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberKick
                    });
                    
                    const kickEntry = kickLogs.entries.first();
                    
                    // Son ban denetim kaydını kontrol et
                    const banLogs = await member.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberBanAdd
                    });
                    
                    const banEntry = banLogs.entries.first();
                    
                    // Son 5 saniye içinde kick veya ban yapıldıysa
                    const now = Date.now();
                    const kickTime = kickEntry ? kickEntry.createdTimestamp : 0;
                    const banTime = banEntry ? banEntry.createdTimestamp : 0;
                    
                    if (kickEntry && kickEntry.target.id === member.id && now - kickTime < 5000) {
                        actionType = '👢 Üye Atıldı';
                        actionDescription = `**${member.user.tag}** sunucudan atıldı`;
                        actionColor = '#ff7700';
                        executor = kickEntry.executor;
                    } else if (banEntry && banEntry.target.id === member.id && now - banTime < 5000) {
                        actionType = '🔨 Üye Yasaklandı';
                        actionDescription = `**${member.user.tag}** sunucudan yasaklandı`;
                        actionColor = '#ff0000';
                        executor = banEntry.executor;
                    }
                } catch (auditError) {
                    console.error('Denetim kaydı kontrol hatası:', auditError);
                }
                
                // Log alanlarını oluştur
                const fields = [
                    { name: 'Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true }
                ];
                
                if (joinedAt) {
                    fields.push({ name: 'Katılma Tarihi', value: `<t:${joinedAt}:R> (<t:${joinedAt}:D>)`, inline: true });
                    fields.push({ name: 'Sunucuda Kalma', value: `${timeInServer} gün`, inline: true });
                }
                
                if (executor) {
                    fields.push({ name: 'İşlemi Yapan', value: `${executor.tag} (${executor.id})`, inline: true });
                }
                
                // Log gönder
                await logEvents.sendLog(member.guild, 'member', {
                    color: actionColor,
                    title: actionType,
                    description: actionDescription,
                    thumbnail: member.user.displayAvatarURL({ dynamic: true }),
                    fields: fields
                });
            } catch (error) {
                console.error('Üye ayrılma log hatası:', error);
            }
        });
        
        // Kullanıcı yasaklama
        client.on(Events.GuildBanAdd, async ban => {
            try {
                // Denetim kaydından kim yasakladı ve neden
                const auditLogs = await ban.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberBanAdd
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                const reason = logEntry ? logEntry.reason || 'Belirtilmedi' : 'Belirtilmedi';
                
                await logEvents.sendLog(ban.guild, 'member', {
                    color: '#ff0000',
                    title: '🔨 Kullanıcı Yasaklandı',
                    description: `**${ban.user.tag}** sunucudan yasaklandı`,
                    thumbnail: ban.user.displayAvatarURL({ dynamic: true }),
                    fields: [
                        { name: 'Kullanıcı', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                        { name: 'Yasaklayan', value: `${executor.tag} (${executor.id})`, inline: true },
                        { name: 'Sebep', value: reason }
                    ]
                });
            } catch (error) {
                console.error('Ban log hatası:', error);
            }
        });
        
        // Kullanıcı yasak kaldırma
        client.on(Events.GuildBanRemove, async ban => {
            try {
                // Denetim kaydından kim yasağı kaldırdı
                const auditLogs = await ban.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberBanRemove
                });
                
                const logEntry = auditLogs.entries.first();
                const executor = logEntry ? logEntry.executor : { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                await logEvents.sendLog(ban.guild, 'member', {
                    color: '#00ff00',
                    title: '🔓 Kullanıcı Yasağı Kaldırıldı',
                    description: `**${ban.user.tag}** kullanıcısının yasağı kaldırıldı`,
                    thumbnail: ban.user.displayAvatarURL({ dynamic: true }),
                    fields: [
                        { name: 'Kullanıcı', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                        { name: 'Yasağı Kaldıran', value: `${executor.tag} (${executor.id})`, inline: true }
                    ]
                });
            } catch (error) {
                console.error('Ban kaldırma log hatası:', error);
            }
        });
        
        // Üye güncelleme (nickname, roller vb.)
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                // Değişiklikleri tespit et
                const changes = [];
                
                // Nickname değişikliği
                if (oldMember.nickname !== newMember.nickname) {
                    changes.push({
                        name: 'Nickname',
                        value: `${oldMember.nickname || 'Yok'} → ${newMember.nickname || 'Yok'}`
                    });
                }
                
                // Rol değişiklikleri
                const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                
                if (removedRoles.size > 0) {
                    changes.push({
                        name: 'Kaldırılan Roller',
                        value: removedRoles.map(r => `<@&${r.id}>`).join(', ')
                    });
                }
                
                if (addedRoles.size > 0) {
                    changes.push({
                        name: 'Eklenen Roller',
                        value: addedRoles.map(r => `<@&${r.id}>`).join(', ')
                    });
                }
                
                // Timeout durumu
                if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
                    const timeoutUntil = Math.floor(newMember.communicationDisabledUntilTimestamp / 1000);
                    changes.push({
                        name: 'Timeout',
                        value: `<t:${timeoutUntil}:R> kadar susturuldu`
                    });
                } else if (oldMember.communicationDisabledUntilTimestamp && !newMember.communicationDisabledUntilTimestamp) {
                    changes.push({
                        name: 'Timeout',
                        value: 'Susturma kaldırıldı'
                    });
                }
                
                // Değişiklik yoksa çık
                if (changes.length === 0) return;
                
                // Denetim kaydından kimin değiştirdiğini bul
                let executor = { tag: 'Bilinmiyor', id: 'Bilinmiyor' };
                
                try {
                    const auditTypes = [
                        AuditLogEvent.MemberUpdate,
                        AuditLogEvent.MemberRoleUpdate
                    ];
                    
                    for (const type of auditTypes) {
                        const auditLogs = await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: type
                        });
                        
                        const logEntry = auditLogs.entries.first();
                        if (logEntry && logEntry.target.id === newMember.id) {
                            executor = logEntry.executor;
                            break;
                        }
                    }
                } catch (auditError) {
                    console.error('Denetim kaydı kontrol hatası:', auditError);
                }
                
                // Fields oluştur
                const fields = [
                    { name: 'Kullanıcı', value: `<@${newMember.id}> (${newMember.id})`, inline: true },
                    { name: 'Güncelleyen', value: `${executor.tag} (${executor.id})`, inline: true }
                ];
                
                // Değişiklikleri ekle
                changes.forEach(change => {
                    fields.push({ name: change.name, value: change.value, inline: false });
                });
                
                await logEvents.sendLog(newMember.guild, 'member', {
                    color: '#ffaa00',
                    title: '✏️ Üye Güncellendi',
                    description: `**${newMember.user.tag}** üyesi güncellendi`,
                    thumbnail: newMember.user.displayAvatarURL({ dynamic: true }),
                    fields: fields
                });
            } catch (error) {
                console.error('Üye güncelleme log hatası:', error);
            }
        });
        
        // Kullanıcı güncelleme (username, avatar vb.)
        client.on(Events.UserUpdate, async (oldUser, newUser) => {
            try {
                // Değişiklikleri tespit et
                const changes = [];
                
                // Username değişikliği
                if (oldUser.username !== newUser.username) {
                    changes.push({
                        name: 'Kullanıcı Adı',
                        value: `${oldUser.username} → ${newUser.username}`
                    });
                }
                
                // Discriminator değişikliği
                if (oldUser.discriminator !== newUser.discriminator) {
                    changes.push({
                        name: 'Tag',
                        value: `#${oldUser.discriminator} → #${newUser.discriminator}`
                    });
                }
                
                // Avatar değişikliği
                if (oldUser.avatar !== newUser.avatar) {
                    changes.push({
                        name: 'Avatar',
                        value: 'Avatar değiştirildi'
                    });
                }
                
                // Değişiklik yoksa çık
                if (changes.length === 0) return;
                
                // Kullanıcının bulunduğu tüm sunucularda log gönder
                for (const guild of client.guilds.cache.values()) {
                    // Kullanıcı bu sunucuda mı kontrol et
                    const member = await guild.members.fetch(newUser.id).catch(() => null);
                    if (!member) continue;
                    
                    // Fields oluştur
                    const fields = [
                        { name: 'Kullanıcı', value: `<@${newUser.id}> (${newUser.id})`, inline: true }
                    ];
                    
                    // Değişiklikleri ekle
                    changes.forEach(change => {
                        fields.push({ name: change.name, value: change.value, inline: true });
                    });
                    
                    await logEvents.sendLog(guild, 'member', {
                        color: '#ffaa00',
                        title: '✏️ Kullanıcı Güncellendi',
                        description: `**${newUser.tag}** kullanıcısı güncellendi`,
                        thumbnail: newUser.displayAvatarURL({ dynamic: true }),
                        fields: fields
                    });
                }
            } catch (error) {
                console.error('Kullanıcı güncelleme log hatası:', error);
            }
        });
        
        console.log('Üye log dinleyicileri başlatıldı!');
    }
};