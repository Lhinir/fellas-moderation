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
                
                // Audit log'dan son değişikliği kontrol et
                let auditLogEntry = null;
                try {
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        limit: 5,
                        user: null // Tüm kullanıcıların değişikliklerini al
                    });
                    
                    // Son değişikliği bul
                    auditLogEntry = auditLogs.entries.find(entry => {
                        // Son 5 saniye içinde yapılan ve bu üyeyi hedefleyen bir değişiklik mi?
                        return entry.target && 
                               entry.target.id === newMember.user.id && 
                               entry.createdTimestamp > (Date.now() - 5000);
                    });
                } catch (error) {
                    console.error('Audit log erişim hatası:', error);
                }
                
                // Gerçek bir değişiklik yoksa çık
                if (!auditLogEntry) {
                    return;
                }
                
                // Değişiklik tipine göre işlem yap
                if (auditLogEntry.action === AuditLogEvent.MemberRoleUpdate) {
                    // Rol değişikliği
                    const changes = auditLogEntry.changes || [];
                    
                    // Eklenen ve çıkarılan rolleri belirle
                    let addedRoles = [];
                    let removedRoles = [];
                    
                    // AuditLog'dan eklenen ve çıkarılan rolleri al
                    for (const change of changes) {
                        if (change.key === '$add') {
                            addedRoles = change.new || [];
                        } else if (change.key === '$remove') {
                            removedRoles = change.new || [];
                        }
                    }
                    
                    // Önbellek kontrolü - aynı değişikliği tekrar loglamamak için
                    const cacheKey = `${newMember.guild.id}-${newMember.id}-${auditLogEntry.id}`;
                    if (roleChangeCache.has(cacheKey)) {
                        return; // Bu değişiklik zaten loglanmış
                    }
                    
                    // Önbelleğe ekle ve 30 saniye sonra sil
                    roleChangeCache.set(cacheKey, true);
                    setTimeout(() => roleChangeCache.delete(cacheKey), 30000);
                    
                    // Eğer hem eklenen hem çıkarılan rol yoksa, bu gerçek bir değişiklik değil
                    if (addedRoles.length === 0 && removedRoles.length === 0) {
                        return;
                    }
                    
                    // Rol değişikliği embedini oluştur
                    const roleUpdateEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('Üye Rolleri Güncellendi')
                        .setDescription(`${newMember.user.tag} kullanıcısının rolleri değiştirildi.`)
                        .addFields(
                            { name: 'Kullanıcı', value: `<@${newMember.user.id}> (${newMember.user.id})` }
                        )
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    
                    // Eklenen rolleri ekle
                    if (addedRoles.length > 0) {
                        roleUpdateEmbed.addFields({
                            name: '✅ Eklenen Roller',
                            value: addedRoles.map(role => `<@&${role.id}>`).join(', ')
                        });
                    }
                    
                    // Çıkarılan rolleri ekle
                    if (removedRoles.length > 0) {
                        roleUpdateEmbed.addFields({
                            name: '❌ Çıkarılan Roller',
                            value: removedRoles.map(role => `<@&${role.id}>`).join(', ')
                        });
                    }
                    
                    // Değişikliği yapan kullanıcı bilgisini ekle
                    if (auditLogEntry.executor) {
                        roleUpdateEmbed.addFields({
                            name: 'Değiştiren Kullanıcı',
                            value: `<@${auditLogEntry.executor.id}> (${auditLogEntry.executor.tag})`
                        });
                    }
                    
                    // Embedı gönder
                    await logChannel.send({ embeds: [roleUpdateEmbed] });
                    
                } else if (auditLogEntry.action === AuditLogEvent.MemberUpdate) {
                    // Takma ad veya başka bir değişiklik
                    const changes = auditLogEntry.changes || [];
                    
                    // Takma ad değişikliği var mı kontrol et
                    const nicknameChange = changes.find(change => change.key === 'nick');
                    
                    if (nicknameChange) {
                        // Önbellek kontrolü - aynı değişikliği tekrar loglamamak için
                        const cacheKey = `${newMember.guild.id}-${newMember.id}-nickname-${auditLogEntry.id}`;
                        if (nicknameChangeCache.has(cacheKey)) {
                            return; // Bu değişiklik zaten loglanmış
                        }
                        
                        // Önbelleğe ekle ve 30 saniye sonra sil
                        nicknameChangeCache.set(cacheKey, true);
                        setTimeout(() => nicknameChangeCache.delete(cacheKey), 30000);
                        
                        // Takma ad değişikliği embedini oluştur
                        const nicknameUpdateEmbed = new EmbedBuilder()
                            .setColor('#1E90FF')
                            .setTitle('Üye Takma Adı Değiştirildi')
                            .setDescription(`${newMember.user.tag} kullanıcısının takma adı değiştirildi.`)
                            .addFields(
                                { name: 'Kullanıcı', value: `<@${newMember.user.id}> (${newMember.user.id})` },
                                { name: 'Eski Takma Ad', value: nicknameChange.old || 'Yok' },
                                { name: 'Yeni Takma Ad', value: nicknameChange.new || 'Yok' }
                            )
                            .setThumbnail(newMember.user.displayAvatarURL())
                            .setTimestamp();
                        
                        // Değişikliği yapan kullanıcı bilgisini ekle
                        if (auditLogEntry.executor) {
                            nicknameUpdateEmbed.addFields({
                                name: 'Değiştiren Kullanıcı',
                                value: `<@${auditLogEntry.executor.id}> (${auditLogEntry.executor.tag})`
                            });
                        }
                        
                        // Embedı gönder
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