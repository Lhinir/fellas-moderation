// src/events/autoModHandler.js - Spam history hatasını çözen güncellenmiş versiyon

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

// Son X mesajı silecek şekilde ayarla (eşik değerinden daha fazla)
const DELETE_MESSAGE_COUNT = 10; // Kullanıcının son 10 mesajını sil

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
                
                // Yeni mesajı ekle
                userData.messages.push({
                    timestamp: now,
                    messageId: message.id,
                    channelId: message.channel.id
                });
                
                // Mesaj sayısını kontrol et (mevcut mesajı EKLEMEDEN ÖNCE)
                // Eşik - 1 değerine ulaşıldığında tetikle, böylece bu mesaj da silinsin
                if (userData.messages.length >= config.spam_threshold) {
                    try {
                        // Bot yetkisini kontrol et
                        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                            console.log('Bot, kullanıcıları susturmak için gerekli yetkiye sahip değil!');
                            return;
                        }
                        
                        // Kullanıcının spam geçmişini al veya oluştur
                        const spamHistory = await database.get(
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
                        
                        // SPAM MESAJLARINI SİL
                        const messagesToDelete = [...userData.messages]; // Kopyasını al
                        let deletedCount = 0;
                        
                        // Spam mesajlarını kanal bazında topla
                        const messagesByChannel = {};
                        
                        for (const msg of messagesToDelete) {
                            if (!messagesByChannel[msg.channelId]) {
                                messagesByChannel[msg.channelId] = [];
                            }
                            messagesByChannel[msg.channelId].push(msg.messageId);
                        }
                        
                        // Her kanal için toplu mesaj silme işlemi yap
                        for (const [channelId, messageIds] of Object.entries(messagesByChannel)) {
                            try {
                                const channel = await message.guild.channels.fetch(channelId);
                                if (!channel) continue;
                                
                                // Mesajları toplu sil
                                await channel.bulkDelete(messageIds)
                                    .then(deleted => {
                                        deletedCount += deleted.size;
                                    })
                                    .catch(error => {
                                        console.error(`Kanal ${channelId}'de mesaj silme hatası:`, error);
                                    });
                            } catch (channelError) {
                                console.error(`Kanal erişim hatası (${channelId}):`, channelError);
                            }
                        }
                        
                        // Map'ten kullanıcıyı temizle (spam mesajları silindiği için)
                        userMessageCounts.delete(userId);
                        
                        // Kullanıcıyı sustur
                        const member = await message.guild.members.fetch(userId);
                        await member.timeout(timeoutDuration, `AutoMod: Spam yapma (${spamCount}. ihlal)`);
                        
                        // Spam geçmişini güncelle
                        const resetAfter = new Date(now + RESET_PERIOD);
                        
                        // DÜZELTME: Burada spam geçmişini UPDATE veya INSERT yapalım
                        if (spamHistory) {
                            // Mevcut kayıt varsa güncelle
                            await database.run(
                                'UPDATE spam_history SET spam_count = ?, last_spam_time = CURRENT_TIMESTAMP, reset_after = ? WHERE guild_id = ? AND user_id = ?',
                                [spamCount, resetAfter.toISOString(), guildId, userId]
                            );
                        } else {
                            // Yeni kayıt oluştur
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