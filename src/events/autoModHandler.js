// src/events/autoModHandler.js - Spam koruması eklenmiş

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../modules/database');

// Kullanıcı mesaj geçmişini saklayacak Map
const userMessageCounts = new Map();

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
                const now = Date.now();
                
                // Kullanıcının mesaj sayacını al veya oluştur
                if (!userMessageCounts.has(userId)) {
                    userMessageCounts.set(userId, {
                        count: 0,
                        firstMessage: now,
                        messages: []
                    });
                }
                
                const userData = userMessageCounts.get(userId);
                
                // Zamanlama penceresi dışındaki mesajları temizle
                userData.messages = userData.messages.filter(
                    timestamp => now - timestamp < config.spam_interval
                );
                
                // Yeni mesajı ekle
                userData.messages.push(now);
                
                // Eğer kullanıcı belirtilen süre içinde threshold'dan fazla mesaj attıysa
                if (userData.messages.length >= config.spam_threshold) {
                    // Map'ten kullanıcıyı temizle
                    userMessageCounts.delete(userId);
                    
                    try {
                        // Kullanıcıyı sustur
                        const member = await message.guild.members.fetch(userId);
                        
                        // Bot yetkisini kontrol et
                        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                            console.log('Bot, kullanıcıları susturmak için gerekli yetkiye sahip değil!');
                            return;
                        }
                        
                        // Kullanıcıyı sustur
                        await member.timeout(config.spam_timeout, 'AutoMod: Spam yapma');
                        
                        // Spam uyarısı gönder
                        const spamEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🔇 Spam Tespit Edildi')
                            .setDescription(`<@${userId}>, çok fazla mesaj gönderdiğiniz için **${config.spam_timeout / 60000} dakika** süreyle susturuldunuz.`)
                            .addFields(
                                { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Süre', value: `${config.spam_timeout / 60000} dakika`, inline: true }
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
                        
                        console.log(`AutoMod: ${message.author.tag} spam yaptığı için ${config.spam_timeout / 60000} dakika susturuldu.`);
                        
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

// Periyodik olarak eski verileri temizle (memory leak'i önlemek için)
setInterval(() => {
    const now = Date.now();
    
    // En az 30 dakika boyunca aktif olmayan kullanıcıları Map'ten temizle
    for (const [userId, userData] of userMessageCounts.entries()) {
        const lastMessageTime = Math.max(...userData.messages, 0);
        if (now - lastMessageTime > 30 * 60 * 1000) { // 30 dakika
            userMessageCounts.delete(userId);
        }
    }
}, 15 * 60 * 1000); // 15 dakikada bir kontrol et