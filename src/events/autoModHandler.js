// src/events/autoModHandler.js - Sadece spam yapılan kanalda mesaj silme, +1 mesaj

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../modules/database');

// Kullanıcı mesaj geçmişini saklayacak Map
const userMessageCounts = new Map();

// Kademeli ceza süreleri (milisaniye cinsinden)
const TIMEOUT_LEVELS = {
    1: 1 * 60 * 1000,     // 2 dakika
    2: 3 * 60 * 1000,     // 5 dakika
    3: 5 * 60 * 1000,    // 10 dakika
    4: 10 * 60 * 1000,
    5: 30 * 60 * 1000     // 30 dakika (maksimum ve sonraki ihlaller için)
};

// Spam geçmişinin sıfırlanma süresi (24 saat)
const RESET_PERIOD = 24 * 60 * 60 * 1000; // 24 saat

// Eşik değerinin üzerine ekstra kaç mesaj silinecek
const EXTRA_DELETE_COUNT = 3; // Eşik + 1 mesaj

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        try {
            // Bot mesajlarını yoksay
            if (message.author.bot) return;
            
            // DM mesajlarını yoksay
            if (!message.guild) return;
            
            // AutoMod konfigürasyonunu al
            const config = await database.get(
                'SELECT * FROM automod_configs WHERE guild_id = ?',
                [message.guild.id]
            );
            
            // AutoMod aktif değilse veya yapılandırma yoksa çık
            if (!config || !config.enabled) return;
            
            // ----- YASAKLI KELİME KONTROLÜ -----
            // ... (önceki kod aynı kalıyor)
            
            // ----- SPAM KONTROLÜ -----
            if (config.spam_protection) {
                const userId = message.author.id;
                const guildId = message.guild.id;
                const channelId = message.channel.id;
                const now = Date.now();
                
                // Kullanıcının mesaj sayacını al veya oluştur
                if (!userMessageCounts.has(userId)) {
                    userMessageCounts.set(userId, {
                        channelMessages: {}
                    });
                }
                
                const userData = userMessageCounts.get(userId);
                
                // Kanal bazlı mesaj listesini al veya oluştur
                if (!userData.channelMessages[channelId]) {
                    userData.channelMessages[channelId] = [];
                }
                
                // Zamanlama penceresi dışındaki mesajları temizle
                userData.channelMessages[channelId] = userData.channelMessages[channelId].filter(
                    msg => now - msg.timestamp < config.spam_interval
                );
                
                // Yeni mesajı ekle
                userData.channelMessages[channelId].push({
                    timestamp: now,
                    messageId: message.id
                });
                
                // Spam tespit et - eşik değerine ulaşıldığında
                if (userData.channelMessages[channelId].length >= config.spam_threshold) {
                    try {
                        // Bot yetkisini kontrol et
                        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                            console.log('Bot, kullanıcıları susturmak için gerekli yetkiye sahip değil!');
                            return;
                        }
                        
                        // Kullanıcının spam geçmişini al
                        let spamHistory = await database.get(
                            'SELECT * FROM spam_history WHERE guild_id = ? AND user_id = ?',
                            [guildId, userId]
                        );
                        
                        let spamCount = 1;
                        
                        if (spamHistory) {
                            // Sıfırlama zamanını kontrol et
                            const resetAfter = new Date(spamHistory.reset_after).getTime();
                            
                            if (now > resetAfter) {
                                // 24 saat geçmiş, sıfırla
                                spamCount = 1;
                            } else {
                                // Spam sayısını artır
                                spamCount = spamHistory.spam_count + 1;
                            }
                        }
                        
                        // Maksimum seviyeyi aşmasın
                        if (spamCount > Object.keys(TIMEOUT_LEVELS).length) {
                            spamCount = Object.keys(TIMEOUT_LEVELS).length;
                        }
                        
                        // Ceza süresini belirle
                        const timeoutDuration = TIMEOUT_LEVELS[spamCount];
                        
                        // SADECE SPAM YAPILAN KANALDA MESAJLARI SİL
                        let deletedCount = 0;
                        
                        try {
                            // Bu kanaldan son mesajları getir (threshold + extra)
                            const fetchLimit = config.spam_threshold + EXTRA_DELETE_COUNT;
                            
                            // Kanaldan son mesajları getir
                            const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });
                            
                            // Sadece spam yapan kullanıcının mesajlarını filtrele
                            const userMessages = fetchedMessages.filter(msg => 
                                msg.author.id === userId && 
                                now - msg.createdTimestamp < config.spam_interval * 2 // Biraz daha geniş zaman aralığı
                            ).first(fetchLimit); // En son X mesajı al
                            
                            // Mesajları toplu sil
                            if (userMessages.length > 0) {
                                await message.channel.bulkDelete(userMessages)
                                    .then(deleted => {
                                        deletedCount = deleted.size;
                                    })
                                    .catch(error => {
                                        console.error(`Mesaj silme hatası:`, error);
                                    });
                            }
                        } catch (deleteError) {
                            console.error('Mesaj silme hatası:', deleteError);
                        }
                        
                        // Map'ten kullanıcının bu kanaldaki mesajlarını temizle
                        if (userData.channelMessages[channelId]) {
                            userData.channelMessages[channelId] = [];
                        }
                        
                        // Kullanıcıyı sustur
                        const member = await message.guild.members.fetch(userId);
                        await member.timeout(timeoutDuration, `AutoMod: Spam yapma (${spamCount}. ihlal)`);
                        
                        // Spam geçmişini güncelle
                        const resetAfter = new Date(now + RESET_PERIOD);
                        
                        if (spamHistory) {
                            await database.run(
                                'UPDATE spam_history SET spam_count = ?, last_spam_time = CURRENT_TIMESTAMP, reset_after = ? WHERE guild_id = ? AND user_id = ?',
                                [spamCount, resetAfter.toISOString(), guildId, userId]
                            );
                        } else {
                            await database.run(
                                'INSERT INTO spam_history (guild_id, user_id, spam_count, reset_after) VALUES (?, ?, ?, ?)',
                                [guildId, userId, spamCount, resetAfter.toISOString()]
                            );
                        }
                        
                        // Spam uyarısı gönder
                        const spamEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🔇 Spam Tespit Edildi')
                            .setDescription(`<@${userId}>, çok fazla mesaj gönderdiğiniz için **${timeoutDuration / 60000} dakika** süreyle susturuldunuz.`)
                            .addFields(
                                { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Süre', value: `${timeoutDuration / 60000} dakika`, inline: true },
                                { name: 'İhlal Sayısı', value: `${spamCount}`, inline: true },
                                { name: 'Silinen Mesajlar', value: `${deletedCount}`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'AutoMod Spam Koruması' });
                        
                        const spamWarning = await message.channel.send({ embeds: [spamEmbed] });
                        
                        // Uyarı mesajını 10 saniye sonra sil
                        setTimeout(() => {
                            spamWarning.delete().catch(err => {
                                console.error('Spam uyarısı silme hatası:', err);
                            });
                        }, 10000); // 10 saniye
                        
                        // Log kanalına bildirim gönder
                        await logSpamTimeout(
                            message.guild, 
                            message.author, 
                            timeoutDuration, 
                            spamCount, 
                            message.channel,
                            deletedCount
                        );
                        
                        console.log(`AutoMod: ${message.author.tag} spam yaptığı için ${timeoutDuration / 60000} dakika susturuldu ve ${deletedCount} mesajı silindi (${spamCount}. ihlal).`);
                        
                    } catch (timeoutError) {
                        console.error('Kullanıcı susturma hatası:', timeoutError);
                    }
                }
            }
            
        } catch (error) {
            console.error('AutoMod işleyici hatası:', error);
        }
    }
};

// Log kanalına spam bildirimi gönder
async function logSpamTimeout(guild, user, duration, spamCount, channel, deletedCount) {
    try {
        // Log kanalı ID'sini al
        const logChannels = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, 'moderation']
        );
        
        if (!logChannels || !logChannels.channel_id) return;
        
        const logChannelId = logChannels.channel_id;
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Log embedini oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('🔇 Spam Nedeniyle Susturma')
            .setDescription(`<@${user.id}> kullanıcısı spam yaptığı için susturuldu.`)
            .addFields(
                { name: 'Kullanıcı', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
                { name: 'Süre', value: `${duration / 60000} dakika`, inline: true },
                { name: 'İhlal Seviyesi', value: `${spamCount}. ihlal`, inline: true },
                { name: 'Silinen Mesaj Sayısı', value: `${deletedCount}`, inline: true },
                { name: 'Sıfırlanma', value: `24 saat sonra`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'AutoMod Spam Koruması' });
        
        // Log gönder
        await logChannel.send({ embeds: [logEmbed] });
        
    } catch (error) {
        console.error('Spam log hatası:', error);
    }
}

// Periyodik olarak eski verileri temizle (memory leak'i önlemek için)
setInterval(() => {
    const now = Date.now();
    
    // En az 30 dakika boyunca aktif olmayan kullanıcıları Map'ten temizle
    for (const [userId, userData] of userMessageCounts.entries()) {
        let hasRecentMessages = false;
        
        // Tüm kanallardaki mesajları kontrol et
        for (const channelId in userData.channelMessages) {
            if (userData.channelMessages[channelId].length === 0) {
                delete userData.channelMessages[channelId];
                continue;
            }
            
            // En son mesaj zamanını kontrol et
            const lastMessages = userData.channelMessages[channelId];
            const lastMessageTime = Math.max(...lastMessages.map(msg => msg.timestamp));
            
            if (now - lastMessageTime < 30 * 60 * 1000) { // 30 dakikadan yeni
                hasRecentMessages = true;
            } else {
                // 30 dakikadan eski kanal mesajlarını temizle
                delete userData.channelMessages[channelId];
            }
        }
        
        // Hiç aktif kanal yoksa kullanıcıyı tamamen temizle
        if (!hasRecentMessages || Object.keys(userData.channelMessages).length === 0) {
            userMessageCounts.delete(userId);
        }
    }
}, 15 * 60 * 1000); // 15 dakikada bir kontrol et