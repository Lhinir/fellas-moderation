// src/events/autoModHandler.js - Mesaj silme özelliği iyileştirilmiş

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../modules/database');

// Kullanıcı mesajlarını takip eden Map
const userMessageCache = new Map();

// Varsayılan timeout süreleri (dakika cinsinden)
const DEFAULT_TIMEOUT_DURATIONS = [5, 10, 30, 60]; // Kademeli olarak artan süreler

// Varsayılan ayarlar
const DEFAULT_SPAM_THRESHOLD = 5; // 5 mesaj
const DEFAULT_SPAM_INTERVAL = 5000; // 5 saniye
const DEFAULT_SPAM_TIMEOUT = 300000; // 5 dakika

// Silinecek mesaj sayısı
const MESSAGES_TO_DELETE = 8; // Kullanıcının son 8 mesajını sil

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Temel kontroller
        if (!message || !message.guild || !message.author) return;
        if (message.author.bot) return;
        
        const guildId = message.guild.id;
        const userId = message.author.id;
        const channelId = message.channel.id;
        const now = Date.now();
        
        console.log(`[AutoMod] Mesaj alındı: ${message.author.tag} in #${message.channel.name}`);
        
        try {
            // AutoMod konfigürasyonunu al
            let config;
            try {
                config = await database.get(
                    'SELECT * FROM automod_configs WHERE guild_id = ?',
                    [guildId]
                );
                
                console.log(`[AutoMod] Konfigürasyon bulundu: ${config ? 'Evet' : 'Hayır'}`);
            } catch (dbError) {
                console.error('[AutoMod] Veritabanı sorgulama hatası:', dbError);
                return; // Veritabanı hatası durumunda çık
            }
            
            // AutoMod aktif mi kontrol et
            if (!config || config.enabled !== 1) {
                console.log('[AutoMod] Bu sunucu için AutoMod aktif değil.');
                return;
            }
            
            // Spam koruması aktif mi kontrol et
            if (!config.spam_protection || config.spam_protection !== 1) {
                console.log('[AutoMod] Bu sunucu için spam koruması aktif değil.');
                return;
            }
            
            // Spam ayarlarını al (hata durumlarında varsayılan değerleri kullan)
            const spamThreshold = config.spam_threshold || DEFAULT_SPAM_THRESHOLD;
            const spamInterval = config.spam_interval || DEFAULT_SPAM_INTERVAL;
            const spamTimeoutBase = config.spam_timeout || DEFAULT_SPAM_TIMEOUT;
            
            console.log(`[AutoMod] Spam ayarları: Eşik=${spamThreshold}, Aralık=${spamInterval}ms, Timeout=${spamTimeoutBase}ms`);
            
            // Kullanıcının mesaj geçmişini kontrol et
            if (!userMessageCache.has(userId)) {
                userMessageCache.set(userId, {
                    guildId: guildId,
                    messages: [],
                    lastWarned: 0
                });
            }
            
            const userData = userMessageCache.get(userId);
            
            // Eski mesajları temizle (spam aralığı dışındakiler)
            userData.messages = userData.messages.filter(msg => now - msg.timestamp < spamInterval);
            
            // Mesajı kaydet
            userData.messages.push({
                timestamp: now,
                messageId: message.id,
                channelId: channelId,
                content: message.content.substring(0, 50) // Sadece ilk 50 karakteri kaydet
            });
            
            // Son X sürede gönderilen mesaj sayısını kontrol et
            if (userData.messages.length >= spamThreshold) {
                console.log(`[AutoMod] Spam tespit edildi! Kullanıcı: ${message.author.tag}, Mesaj sayısı: ${userData.messages.length}`);
                
                // Bot susturma yetkisine sahip mi kontrol et
                if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    console.error('[AutoMod] Botun susturma yetkisi yok!');
                    return;
                }
                
                // Kullanıcının spam geçmişini al
                let spamHistory = null;
                try {
                    spamHistory = await database.get(
                        'SELECT * FROM spam_history WHERE guild_id = ? AND user_id = ?',
                        [guildId, userId]
                    );
                    
                    console.log(`[AutoMod] Spam geçmişi bulundu: ${spamHistory ? 'Evet' : 'Hayır'}`);
                } catch (historyError) {
                    console.error('[AutoMod] Spam geçmişi sorgulanırken hata:', historyError);
                    // Hata olsa bile devam et, geçmiş bulunamadı olarak kabul et
                }
                
                // Timeout seviyesini belirle
                let spamLevel = 1;
                if (spamHistory) {
                    // Sıfırlama zamanını kontrol et
                    const resetTime = spamHistory.reset_after ? new Date(spamHistory.reset_after).getTime() : 0;
                    
                    if (now > resetTime) {
                        // Süre dolmuş, seviyeyi sıfırla
                        spamLevel = 1;
                    } else {
                        // Seviyeyi artır
                        spamLevel = Math.min((spamHistory.spam_count || 0) + 1, DEFAULT_TIMEOUT_DURATIONS.length);
                    }
                }
                
                // Timeout süresini belirle
                const timeoutMinutes = DEFAULT_TIMEOUT_DURATIONS[spamLevel - 1] || DEFAULT_TIMEOUT_DURATIONS[0];
                const timeoutMs = timeoutMinutes * 60 * 1000;
                
                console.log(`[AutoMod] Timeout süresi: ${timeoutMinutes} dakika (Seviye ${spamLevel})`);
                
                // Kullanıcıyı sustur
                try {
                    const member = await message.guild.members.fetch(userId);
                    
                    if (member && member.moderatable) {
                        await member.timeout(timeoutMs, `AutoMod: Spam yapma (${spamLevel}. ihlal)`);
                        console.log(`[AutoMod] ${message.author.tag} kullanıcısı ${timeoutMinutes} dakika susturuldu.`);
                    } else {
                        console.log(`[AutoMod] Kullanıcı susturulamadı: Kullanıcı moderatable değil.`);
                    }
                } catch (timeoutError) {
                    console.error('[AutoMod] Susturma hatası:', timeoutError);
                }
                
                // ÖNEMLİ: SPAM YAPILAN KANALDAN KULLANICININ SON 8 MESAJINI SİL
                let deletedCount = 0;
                try {
                    console.log(`[AutoMod] Kullanıcının mesajları siliniyor: Kanal ID ${channelId}`);
                    
                    // Son 20 mesajı getir (Discord API limiti 100, ama verimlilik için 20 yeterli)
                    const fetchedMessages = await message.channel.messages.fetch({ limit: 20 });
                    console.log(`[AutoMod] Kanaldan ${fetchedMessages.size} mesaj yüklendi.`);
                    
                    // Kullanıcının mesajlarını filtrele
                    const userMessages = fetchedMessages.filter(msg => msg.author.id === userId);
                    console.log(`[AutoMod] Kullanıcıya ait ${userMessages.size} mesaj bulundu.`);
                    
                    // Son 8 mesajı al
                    const messagesToDelete = userMessages.first(MESSAGES_TO_DELETE);
                    
                    if (messagesToDelete.length > 0) {
                        console.log(`[AutoMod] Silinecek ${messagesToDelete.length} mesaj.`);
                        
                        // Mesajları toplu sil (14 günden eski değilse)
                        await message.channel.bulkDelete(messagesToDelete, true)
                            .then(deleted => {
                                deletedCount = deleted.size;
                                console.log(`[AutoMod] ${deletedCount} mesaj başarıyla silindi.`);
                            })
                            .catch(error => {
                                console.error('[AutoMod] Toplu mesaj silme hatası:', error);
                                
                                // Toplu silme başarısız olursa, tek tek silmeyi dene
                                if (error.code === 50034) { // 14 günden eski mesaj hatası
                                    console.log('[AutoMod] Bazı mesajlar 14 günden eski. Tek tek silme deneniyor...');
                                    
                                    messagesToDelete.forEach(async (msg) => {
                                        try {
                                            await msg.delete();
                                            deletedCount++;
                                        } catch (individualError) {
                                            console.error(`[AutoMod] Tekil mesaj silme hatası: ${individualError.message}`);
                                        }
                                    });
                                }
                            });
                    } else {
                        console.log('[AutoMod] Silinecek mesaj bulunamadı.');
                    }
                } catch (deleteError) {
                    console.error('[AutoMod] Mesaj silme işlemi sırasında hata:', deleteError);
                }
                
                // Spam geçmişini güncelle
                try {
                    const resetAfter = new Date(now + 24 * 60 * 60 * 1000); // 24 saat sonra sıfırla
                    
                    if (spamHistory) {
                        // Mevcut kaydı güncelle
                        await database.run(
                            'UPDATE spam_history SET spam_count = ?, last_spam_time = CURRENT_TIMESTAMP, reset_after = ? WHERE guild_id = ? AND user_id = ?',
                            [spamLevel, resetAfter.toISOString(), guildId, userId]
                        );
                    } else {
                        // Yeni kayıt oluştur
                        await database.run(
                            'INSERT INTO spam_history (guild_id, user_id, spam_count, reset_after) VALUES (?, ?, ?, ?)',
                            [guildId, userId, spamLevel, resetAfter.toISOString()]
                        );
                    }
                    
                    console.log(`[AutoMod] Spam geçmişi güncellendi. Seviye: ${spamLevel}`);
                } catch (updateError) {
                    console.error('[AutoMod] Spam geçmişi güncelleme hatası:', updateError);
                    // Kritik olmayan hata, devam et
                }
                
                // Kullanıcıya uyarı mesajı gönder
                try {
                    const spamEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🔇 Spam Tespit Edildi')
                        .setDescription(`<@${userId}>, çok fazla mesaj gönderdiğiniz için **${timeoutMinutes} dakika** süreyle susturuldunuz.`)
                        .addFields(
                            { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'Süre', value: `${timeoutMinutes} dakika`, inline: true },
                            { name: 'İhlal Sayısı', value: `${spamLevel}`, inline: true },
                            { name: 'Silinen Mesajlar', value: `${deletedCount}`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'AutoMod Spam Koruması' });
                    
                    const spamWarning = await message.channel.send({ embeds: [spamEmbed] });
                    
                    // Uyarı mesajını 15 saniye sonra sil
                    setTimeout(() => {
                        spamWarning.delete().catch(err => {
                            console.error('[AutoMod] Spam uyarısı silme hatası:', err);
                        });
                    }, 15000); // 15 saniye
                } catch (embedError) {
                    console.error('[AutoMod] Spam uyarısı gönderme hatası:', embedError);
                }
                
                // Kullanıcının mesaj geçmişini temizle
                userMessageCache.delete(userId);
                
                // Log kanalına bildirim gönder
                try {
                    await sendLogMessage(
                        message.guild,
                        message.author,
                        timeoutMinutes,
                        spamLevel,
                        message.channel,
                        deletedCount
                    );
                } catch (logError) {
                    console.error('[AutoMod] Log gönderme hatası:', logError);
                }
            }
        } catch (error) {
            console.error('[AutoMod] İşleme hatası:', error);
        }
    }
};

// Log kanalına bildirim gönder
async function sendLogMessage(guild, user, timeoutMinutes, spamLevel, channel, deletedCount) {
    try {
        // Log kanalını al
        const logChannelId = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, 'moderation']
        ).catch(() => null);
        
        if (!logChannelId || !logChannelId.channel_id) {
            console.log('[AutoMod] Log kanalı bulunamadı.');
            return;
        }
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId.channel_id).catch(() => null);
        if (!logChannel) {
            console.log('[AutoMod] Log kanalına erişilemedi.');
            return;
        }
        
        // Log embedini oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('🔇 Spam Nedeniyle Susturma')
            .setDescription(`<@${user.id}> kullanıcısı spam yaptığı için susturuldu.`)
            .addFields(
                { name: 'Kullanıcı', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
                { name: 'Süre', value: `${timeoutMinutes} dakika`, inline: true },
                { name: 'İhlal Seviyesi', value: `${spamLevel}. ihlal`, inline: true },
                { name: 'Silinen Mesaj Sayısı', value: `${deletedCount}`, inline: true },
                { name: 'Sıfırlanma', value: `24 saat sonra`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'AutoMod Spam Koruması' });
        
        // Log gönder
        await logChannel.send({ embeds: [logEmbed] });
        console.log('[AutoMod] Log kanalına bildirim gönderildi.');
    } catch (error) {
        console.error('[AutoMod] Log gönderme hatası:', error);
    }
}

// Her 30 dakikada bir hafızayı temizle
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    userMessageCache.forEach((data, userId) => {
        // 30 dakikadan eski mesajları olan kullanıcıları temizle
        const oldestMessage = data.messages.length > 0 ? 
            Math.min(...data.messages.map(m => m.timestamp)) : now;
            
        if (now - oldestMessage > 30 * 60 * 1000) {
            userMessageCache.delete(userId);
            cleanedCount++;
        }
    });
    
    if (cleanedCount > 0) {
        console.log(`[AutoMod Temizlik] ${cleanedCount} kullanıcının mesaj geçmişi temizlendi.`);
    }
}, 30 * 60 * 1000); // 30 dakika