// src/modules/automod.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AutoMod {
    constructor(client) {
        this.client = client;
        this.db = new sqlite3.Database(path.join(__dirname, '../../data/automod.db'));
        this.setupDatabase();
        this.spamCache = new Map();
        this.raidCache = new Map();
        this.profanityList = [];
        this.loadProfanityList();
    }

    setupDatabase() {
        this.db.serialize(() => {
            // Küfür listesi tablosu
            this.db.run(`CREATE TABLE IF NOT EXISTS profanity_words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Sunucu ayarları tablosu
            this.db.run(`CREATE TABLE IF NOT EXISTS guild_automod_settings (
                guild_id TEXT PRIMARY KEY,
                spam_protection BOOLEAN DEFAULT 0,
                spam_threshold INTEGER DEFAULT 5,
                spam_interval INTEGER DEFAULT 5000,
                raid_protection BOOLEAN DEFAULT 0,
                raid_threshold INTEGER DEFAULT 10,
                raid_interval INTEGER DEFAULT 10000,
                profanity_filter BOOLEAN DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Varsayılan küfür listesini ekle
            const defaultProfanity = [
                'amk', 'aq', 'oç', 'piç', 'sik', 'yarrak', 'amcık', 'göt', 
                'mal', 'salak', 'bok', 'gerizekalı', 'aptal'
            ];
            
            const stmt = this.db.prepare('INSERT OR IGNORE INTO profanity_words (word) VALUES (?)');
            defaultProfanity.forEach(word => {
                stmt.run(word);
            });
            stmt.finalize();
        });
    }

    loadProfanityList() {
        this.db.all('SELECT word FROM profanity_words', (err, rows) => {
            if (err) {
                console.error('Küfür listesi yüklenirken hata:', err);
                return;
            }
            this.profanityList = rows.map(row => row.word.toLowerCase());
        });
    }

    async getGuildSettings(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM guild_automod_settings WHERE guild_id = ?', [guildId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // Varsayılan ayarları ekle
                    const defaultSettings = {
                        guild_id: guildId,
                        spam_protection: 0,
                        spam_threshold: 5,
                        spam_interval: 5000,
                        raid_protection: 0,
                        raid_threshold: 10,
                        raid_interval: 10000,
                        profanity_filter: 0
                    };
                    
                    this.db.run(
                        `INSERT INTO guild_automod_settings 
                        (guild_id, spam_protection, spam_threshold, spam_interval, raid_protection, raid_threshold, raid_interval, profanity_filter) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [guildId, 0, 5, 5000, 0, 10, 10000, 0],
                        function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(defaultSettings);
                        }
                    );
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateGuildSettings(guildId, settings) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(
                `UPDATE guild_automod_settings SET 
                spam_protection = ?, spam_threshold = ?, spam_interval = ?,
                raid_protection = ?, raid_threshold = ?, raid_interval = ?,
                profanity_filter = ?, updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ?`
            );
            
            stmt.run(
                settings.spam_protection ? 1 : 0,
                settings.spam_threshold,
                settings.spam_interval,
                settings.raid_protection ? 1 : 0,
                settings.raid_threshold,
                settings.raid_interval,
                settings.profanity_filter ? 1 : 0,
                guildId,
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.changes > 0);
                }
            );
            
            stmt.finalize();
        });
    }

    async addProfanityWord(word) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT OR IGNORE INTO profanity_words (word) VALUES (?)', [word.toLowerCase()], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }

    async removeProfanityWord(word) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM profanity_words WHERE word = ?', [word.toLowerCase()], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }

    async getProfanityList() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT word FROM profanity_words ORDER BY word', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(row => row.word));
            });
        });
    }

    // Spam tespit fonksiyonu
    handleSpamDetection(message) {
        if (!message.guild || message.author.bot) return false;
        
        return this.getGuildSettings(message.guild.id)
            .then(settings => {
                if (!settings.spam_protection) return false;
                
                const userId = message.author.id;
                const threshold = settings.spam_threshold;
                const interval = settings.spam_interval;
                
                if (!this.spamCache.has(userId)) {
                    this.spamCache.set(userId, {
                        messages: [message.createdTimestamp],
                        timeout: setTimeout(() => {
                            this.spamCache.delete(userId);
                        }, interval)
                    });
                    return false;
                }
                
                const userData = this.spamCache.get(userId);
                userData.messages.push(message.createdTimestamp);
                
                // Zaman aşımını yenile
                clearTimeout(userData.timeout);
                userData.timeout = setTimeout(() => {
                    this.spamCache.delete(userId);
                }, interval);
                
                // İlgili zaman aralığındaki mesajları filtrele
                const now = Date.now();
                userData.messages = userData.messages.filter(timestamp => now - timestamp < interval);
                
                // Spam tespiti
                if (userData.messages.length >= threshold) {
                    // Spam tespit edildi
                    this.spamCache.delete(userId);
                    return true;
                }
                
                return false;
            })
            .catch(err => {
                console.error('Spam tespiti sırasında hata:', err);
                return false;
            });
    }

    // Raid (istila) tespit fonksiyonu
    handleRaidDetection(member) {
        if (!member.guild) return false;
        
        return this.getGuildSettings(member.guild.id)
            .then(settings => {
                if (!settings.raid_protection) return false;
                
                const guildId = member.guild.id;
                const threshold = settings.raid_threshold;
                const interval = settings.raid_interval;
                
                if (!this.raidCache.has(guildId)) {
                    this.raidCache.set(guildId, {
                        members: [member.id],
                        timeout: setTimeout(() => {
                            this.raidCache.delete(guildId);
                        }, interval)
                    });
                    return false;
                }
                
                const guildData = this.raidCache.get(guildId);
                guildData.members.push(member.id);
                
                // Zaman aşımını yenile
                clearTimeout(guildData.timeout);
                guildData.timeout = setTimeout(() => {
                    this.raidCache.delete(guildId);
                }, interval);
                
                // İstila tespiti
                if (guildData.members.length >= threshold) {
                    // İstila tespit edildi
                    return true;
                }
                
                return false;
            })
            .catch(err => {
                console.error('Raid tespiti sırasında hata:', err);
                return false;
            });
    }

    // Küfür tespit fonksiyonu
    async handleProfanityDetection(message) {
        if (!message.guild || message.author.bot) return false;
        
        try {
            const settings = await this.getGuildSettings(message.guild.id);
            if (!settings.profanity_filter) return false;
            
            // Küfür listesi henüz yüklenmemişse yükle
            if (this.profanityList.length === 0) {
                await this.loadProfanityList();
            }
            
            const content = message.content.toLowerCase();
            
            // Basit kelime tabanlı filtreleme
            for (const word of this.profanityList) {
                const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
                if (regex.test(content)) {
                    return true;
                }
            }
            
            return false;
        } catch (err) {
            console.error('Küfür tespiti sırasında hata:', err);
            return false;
        }
    }

    // Spam yaptırımı
    async punishSpam(message) {
        try {
            // Kullanıcının mesajlarını sil
            const messages = await message.channel.messages.fetch({ 
                limit: 10,
                author: message.author.id
            });
            
            message.channel.bulkDelete(messages)
                .catch(err => console.error('Spam mesajları silinirken hata:', err));
            
            // Kullanıcıyı sustur
            if (message.member && message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                try {
                    await message.member.timeout(30 * 60 * 1000, 'Spam yapma');
                } catch (err) {
                    console.error('Kullanıcı susturulurken hata:', err);
                }
            }
            
            // Log oluştur
            await this.client.logger.log(message.guild.id, 'spam', {
                description: 'Spam tespit edildi ve kullanıcı cezalandırıldı',
                user: {
                    id: message.author.id,
                    tag: message.author.tag
                },
                channel: {
                    id: message.channel.id,
                    name: message.channel.name
                },
                messageCount: message.channel.messages.cache.filter(m => m.author.id === message.author.id).size,
                action: 'timeout',
                reason: 'Spam yapma'
            });
            
            // Uyarı mesajı
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Spam Tespit Edildi')
                .setDescription(`${message.author} spam yaptığı için 30 dakika susturuldu.`)
                .setTimestamp();
                
            message.channel.send({ embeds: [embed] })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
                .catch(err => console.error('Spam uyarı mesajı gönderilirken hata:', err));
                
        } catch (err) {
            console.error('Spam cezalandırması sırasında hata:', err);
        }
    }

    // Raid yaptırımı
    async punishRaid(guild) {
        try {
            // Sunucuyu kitle
            if (guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await guild.edit({
                    verificationLevel: Math.min(guild.verificationLevel + 1, 4)
                });
            }
            
            // Log oluştur
            await this.client.logger.log(guild.id, 'raid', {
                description: 'Raid/İstila tespit edildi ve sunucu korunmaya alındı',
                memberCount: this.raidCache.get(guild.id)?.members.length || 0,
                action: 'increase_verification',
                timestamp: new Date().toISOString()
            });
            
            // Yeni gelen üyeleri toplu halde listele
            let newMembers = '';
            if (this.raidCache.has(guild.id)) {
                const memberIds = this.raidCache.get(guild.id).members;
                for (const id of memberIds.slice(0, 10)) {
                    newMembers += `<@${id}> `;
                }
                if (memberIds.length > 10) {
                    newMembers += `ve ${memberIds.length - 10} kişi daha...`;
                }
            }
            
            // Admin rolü olan kullanıcıları bilgilendir
            const adminRole = guild.roles.cache.find(role => role.permissions.has(PermissionFlagsBits.Administrator));
            if (adminRole) {
                const adminChannel = guild.channels.cache.find(channel => 
                    channel.type === 0 && // Text kanalı
                    channel.permissionsFor(adminRole).has(PermissionFlagsBits.ViewChannel)
                );
                
                if (adminChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🚨 Raid/İstila Tespit Edildi')
                        .setDescription(`Sunucuya kısa sürede çok sayıda kullanıcı katıldı. Güvenlik seviyesi artırıldı.`)
                        .addFields(
                            { name: 'Yeni Katılanlar', value: newMembers || 'Bilgi yok' }
                        )
                        .setTimestamp();
                        
                    adminChannel.send({ content: `<@&${adminRole.id}>`, embeds: [embed] })
                        .catch(err => console.error('Raid uyarı mesajı gönderilirken hata:', err));
                }
            }
            
            // Raid önbelleğini temizle
            this.raidCache.delete(guild.id);
                
        } catch (err) {
            console.error('Raid cezalandırması sırasında hata:', err);
        }
    }

    // Küfür yaptırımı
    async punishProfanity(message) {
        try {
            // Mesajı sil
            await message.delete();
            
            // Log oluştur
            await this.client.logger.log(message.guild.id, 'profanity', {
                description: 'Küfür içeren mesaj silindi',
                user: {
                    id: message.author.id,
                    tag: message.author.tag
                },
                channel: {
                    id: message.channel.id,
                    name: message.channel.name
                },
                content: message.content,
                action: 'delete',
                reason: 'Küfür içeren mesaj'
            });
            
            // Kullanıcıya DM ile uyar
            try {
                const embed = new EmbedBuilder()
                    .setColor('#FF9900')
                    .setTitle('⚠️ Uyarı: Uygunsuz İçerik')
                    .setDescription(`**${message.guild.name}** sunucusunda gönderdiğiniz mesaj uygunsuz içerik nedeniyle silindi.`)
                    .addFields(
                        { name: 'Mesaj', value: message.content.length > 1000 ? message.content.substring(0, 1000) + '...' : message.content }
                    )
                    .setTimestamp();
                    
                await message.author.send({ embeds: [embed] });
            } catch (err) {
                console.log('Kullanıcıya DM gönderilemedi:', err.message);
            }
                
        } catch (err) {
            console.error('Küfür cezalandırması sırasında hata:', err);
        }
    }
}

module.exports = AutoMod;