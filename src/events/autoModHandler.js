// src/events/autoModHandler.js - Sadece spam kanalındaki mesajları silen ve log sistemini ayrı hale getiren versiyon

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../modules/database');

// Kullanıcı mesaj geçmişini saklayacak Map
const userMessageCounts = new Map();

// Kademeli ceza süreleri (milisaniye cinsinden)
const TIMEOUT_LEVELS = {
    1: 2 * 60 * 1000,     // 2 dakika
    2: 5 * 60 * 1000,     // 5 dakika
    3: 10 * 60 * 1000,    // 10 dakika
    4: 30 * 60 * 1000     // 30 dakika (maksimum ve sonraki ihlaller için)
};

// Spam geçmişinin sıfırlanma süresi (24 saat)
const RESET_PERIOD = 24 * 60 * 60 * 1000; // 24 saat

// Son kaç mesajı sileceğimizi belirleyen değişken
const DELETE_LAST_MESSAGES = 10;

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
            if (config.banned_words) {
                // Yasaklı kelimeleri parse et
                const bannedWords = JSON.parse(config.banned_words || '[]');
                
                // Yasaklı kelime varsa, kontrol et
                if (bannedWords.length > 0) {
                    // Mesajı kontrol et
                    const content = message.content.toLowerCase();
                    
                    // Hangi yasaklı kelimenin bulunduğunu kontrol et
                    let foundBannedWord = null;
                    for (const word of bannedWords) {
                        if (content.includes(word.toLowerCase())) {
                            foundBannedWord = word;
                            break;
                        }
                    }
                    
                    // Yasaklı kelime varsa mesajı sil ve uyarı gönder
                    if (foundBannedWord) {
                        try {
                            // Mesajı sil
                            await message.delete();
                            
                            // Bulunan yasaklı kelimeyi maskele (örn: a**e)
                            const maskedWord = foundBannedWord.length <= 2 
                                ? foundBannedWord 
                                : foundBannedWord[0] + '*'.repeat(foundBannedWord.length - 2) + foundBannedWord[foundBannedWord.length - 1];
                            
                            // Uyarı embedini oluştur
                            const warningEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🛑 AutoMod Uyarısı')
                                .setDescription(`<@${message.author.id}>, mesajınız yasaklı kelime içerdiği için silindi.`)
                                .addFields(
                                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Yasaklı Kelime', value: maskedWord, inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'AutoMod Sistemi' });
                            
                            // Mesajın gönderildiği kanala uyarı gönder
                            const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
                            
                            // Uyarı mesajını belirli bir süre sonra sil (5 saniye)
                            setTimeout(() => {
                                warningMessage.delete().catch(err => {
                                    // Mesaj zaten silinmişse sessizce devam et
                                    console.error('Uyarı mesajı silme hatası:', err);
                                });
                            }, 5000); // 5 saniye (5000 ms)
                            
                            console.log(`AutoMod: ${message.author.tag} tarafından gönderilen yasaklı kelime içeren mesaj silindi.`);
                            
                            // Log gönder (ayrı log tipi olarak)
                            await logMessageDeletion(message.guild, message.author, message.channel, 'banned_word', maskedWord);
                            
                            // Yasaklı kelime bulunduğu için diğer kontrolleri yapmaya gerek yok
                            return;
                        } catch (deleteError) {
                            console.error('AutoMod: Mesaj silme hatası:', deleteError);
                        }
                    }
                }
            }
            
            // ----- SPAM KONTROLÜ -----
            if (config.spam_protection) {
                const userId = message.author.id;
                const guildId = message.guild.id;
                const now = Date.now();
                const currentChannel = message.channel;
                
                // Kullanıcının mesaj sayacını al veya oluştur
                if (!userMessageCounts.has(userId)) {
                    userMessageCounts.set(userId, {
                        messages: []
                    });
                }
                
                const userData = userMessageCounts.get(userId);
                
                // Zamanlama penceresi dışındaki mesajları temizle
                userData.messages = userData.messages.filter(
                    msg => now - msg.timestamp < config.spam_interval
                );
                
                // Yeni mesajı ekle (bu mesajı da silmek için)
                userData.messages.push({
                    timestamp: now,
                    messageId: message.id,
                    channelId: message.channel.id
                });
                
                // Spam tespit et - eşik değerine ulaşıldığında
                if (userData.messages.length >= config.spam_threshold) {
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
                        
                        // YENİ YAKLAŞIM: Yalnızca spam yapılan kanaldaki son X mesajı sil
                        let deletedCount = 0;
                        
                        try {
                            // Spam kanalından son 100 mesajı getir
                            const channelMessages = await currentChannel.messages.fetch({ limit: 100 });
                            
                            // Kullanıcının bu kanaldaki son mesajlarını bul
                            const userMessages = channelMessages.filter(msg => 
                                msg.author.id === userId && 
                                now - msg.createdTimestamp < 1000 * 60 * 60 // Son 1 saat içindeki mesajlar
                            );
                            
                            // Sadece son X mesajı al (en yeniden eskiye doğru sıralı)
                            const messagesToDelete = Array.from(userMessages.values())
                                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                                .slice(0, DELETE_LAST_MESSAGES);
                            
                            if (messagesToDelete.length > 0) {
                                // Mesajları toplu sil (14 günden eski olmayanlar için)
                                const recentMessages = messagesToDelete.filter(
                                    msg => now - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                                );
                                
                                if (recentMessages.length > 0) {
                                    // BulkDelete ile toplu silme
                                    try {
                                        const deleted = await currentChannel.bulkDelete(recentMessages);
                                        deletedCount = deleted.size;
                                    } catch (bulkDeleteError) {
                                        console.error('Toplu mesaj silme hatası:', bulkDeleteError);
                                        
                                        // BulkDelete başarısız olursa tek tek silmeyi dene
                                        for (const msgToDelete of recentMessages) {
                                            try {
                                                await msgToDelete.delete();
                                                deletedCount++;
                                            } catch (singleDeleteError) {
                                                console.error('Tekil mesaj silme hatası:', singleDeleteError);
                                            }
                                        }
                                    }
                                }
                                
                                // 14 günden eski mesajlar için tek tek silme dene
                                const oldMessages = messagesToDelete.filter(
                                    msg => now - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
                                );
                                
                                for (const msgToDelete of oldMessages) {
                                    try {
                                        await msgToDelete.delete();
                                        deletedCount++;
                                    } catch (oldMsgDeleteError) {
                                        console.error('Eski mesaj silme hatası:', oldMsgDeleteError);
                                    }
                                }
                            }
                        } catch (channelError) {
                            console.error(`Kanal işleme hatası (${currentChannel.id}):`, channelError);
                        }
                        
                        // Map'ten kullanıcıyı temizle (spam mesajları silindiği için)
                        userMessageCounts.delete(userId);
                        
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
                                { name: 'Silinen Mesaj Sayısı', value: `${deletedCount}`, inline: true }
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
                        
                        // Sadece spam için log gönder (mesaj silme logu ayrı gönderilmeyecek)
                        await logSpamAction(
                            message.guild, 
                            message.author, 
                            timeoutDuration, 
                            spamCount, 
                            message.channel,
                            deletedCount
                        );
                        
                        console.log(`AutoMod: ${message.author.tag} spam yaptığı için ${timeoutDuration / 60000} dakika susturuldu ve ${deletedCount} mesajı silindi (${spamCount}. ihlal).`);
                        
                        return; // İşlem tamamlandı
                    } catch (timeoutError) {
                        console.error('Kullanıcı susturma hatası:', timeoutError);
                    }
                }
                
                // Eğer bu noktaya geldiysek, spam tespit edilmedi - mesajı listeye ekle
                // (Burada eklemiyoruz çünkü zaten yukarıda ekledik)
            }
            
        } catch (error) {
            console.error('AutoMod işleyici hatası:', error);
        }
    }
};

// Yasaklı kelime tespitinde mesaj silme logu gönder
async function logMessageDeletion(guild, user, channel, reason, word) {
    try {
        // Log kanalı ID'sini al (mesaj logu için)
        const logChannels = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, 'message'] // Mesaj silme için message log kanalı kullan
        );
        
        if (!logChannels || !logChannels.channel_id) return;
        
        const logChannelId = logChannels.channel_id;
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Log embedini oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#FFA500') // Turuncu - mesaj silme için
            .setTitle('🗑️ AutoMod: Mesaj Silindi')
            .setDescription(`<@${user.id}> kullanıcısının mesajı **${reason === 'banned_word' ? 'yasaklı kelime' : 'spam'}** nedeniyle silindi.`)
            .addFields(
                { name: 'Kullanıcı', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Kanal', value: `<#${channel.id}>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'AutoMod Sistemi' });
            
        // Yasaklı kelime ise bunu da ekle
        if (reason === 'banned_word' && word) {
            logEmbed.addFields({ name: 'Yasaklı Kelime', value: word, inline: true });
        }
        
        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] });
        
    } catch (error) {
        console.error('Mesaj silme log hatası:', error);
    }
}

// Spam susturma için ayrı log gönder
async function logSpamAction(guild, user, duration, spamCount, channel, deletedCount) {
    try {
        // Log kanalı ID'sini al (moderasyon logu için)
        const logChannels = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, 'moderation'] // Moderasyon logu kullan
        );
        
        if (!logChannels || !logChannels.channel_id) return;
        
        const logChannelId = logChannels.channel_id;
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Log embedini oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Kırmızı - spam susturma için
            .setTitle('🔇 AutoMod: Spam Susturma')
            .setDescription(`<@${user.id}> kullanıcısı **spam** yaptığı için otomatik olarak susturuldu.`)
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
        
        // Logu gönder
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
        if (userData.messages.length === 0) {
            userMessageCounts.delete(userId);
            continue;
        }
        
        const lastMessageTime = Math.max(...userData.messages.map(msg => msg.timestamp));
        if (now - lastMessageTime > 30 * 60 * 1000) { // 30 dakika
            userMessageCounts.delete(userId);
        }
    }
}, 15 * 60 * 1000); // 15 dakikada bir kontrol et