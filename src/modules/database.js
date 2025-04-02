// src/modules/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Veritabanı dosyası
const dbFolder = path.join(process.cwd(), 'data');
const dbFile = path.join(dbFolder, 'fellas.db');

// Veritabanı klasörünün var olduğundan emin ol
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

// Veritabanı bağlantısını oluştur
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
    } else {
        console.log('Veritabanına bağlanıldı.');
    }
});

// Tabloları oluştur/güncelle
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('Veritabanı tabloları hazırlanıyor...');
        
        // Tablolar için SQL komutları
        const tables = [
            // Cezalar tablosu
            `CREATE TABLE IF NOT EXISTS punishments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                type TEXT,
                reason TEXT,
                duration TEXT,
                end_time INTEGER,
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )`,

            // Guild ayarları tablosu
            `CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Log kanalları tablosu
            `CREATE TABLE IF NOT EXISTS log_channels (
                guild_id TEXT,
                type TEXT,
                channel_id TEXT,
                PRIMARY KEY (guild_id, type),
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )`,
            
            // Uyarılar tablosu
            `CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )`,
            
            // Moderasyon kayıtları tablosu (ban, kick, mute vb.)
            `CREATE TABLE IF NOT EXISTS mod_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                action_type TEXT,
                reason TEXT,
                duration TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )`
        ];
        
        // Sequential execution of table creation
        db.serialize(() => {
            db.run('PRAGMA foreign_keys = ON');
            
            const promises = tables.map(sql => {
                return new Promise((res, rej) => {
                    db.run(sql, (err) => {
                        if (err) rej(err);
                        else res();
                    });
                });
            });
            
            Promise.all(promises)
                .then(() => {
                    console.log('Veritabanı tabloları hazır.');
                    resolve();
                })
                .catch(err => {
                    console.error('Tablo oluşturma hatası:', err);
                    reject(err);
                });
        });
    });
}

// Promisify run
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('SQL Error:', err);
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

// Promisify get
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('SQL Error:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Promisify all
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('SQL Error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Log tipi normalleştirme yardımcı fonksiyonu
function normalizeLogType(type) {
    // Eğer type null veya undefined ise, varsayılan olarak 'moderation' kullan
    if (!type) return 'moderation';
    
    // Tip eşleştirme - logchannel'dan logs sistemine
    const typeMapping = {
        'mod': 'moderation',
        'modlog': 'moderation',
        'action': 'action',
        'voice': 'voice',
        'message': 'message',
        'msg': 'message',
        'member': 'member',
        'user': 'member',
        'join': 'join',
        'leave': 'leave',
        'exit': 'leave'
    };
    
    // String'e dönüştür ve küçük harfe çevir
    const lowerType = String(type).toLowerCase();
    
    // Eşleştirme tablosunda varsa, karşılık gelen değeri kullan
    return typeMapping[lowerType] || lowerType;
}

// Log kanalları işlemleri
const logs = {
    // Log kanalı ayarla
    setLogChannel: async (guildId, type, channelId) => {
        try {
            // Tip normalleştirme
            const normalizedType = normalizeLogType(type);
            
            // Önce guild_settings tablosunda guild_id'nin var olduğundan emin ol
            await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
            
            // Log kanalını ayarla
            return run(
                'INSERT OR REPLACE INTO log_channels (guild_id, type, channel_id) VALUES (?, ?, ?)',
                [guildId, normalizedType, channelId]
            );
        } catch (error) {
            console.error(`Log kanalı ayarlama hatası (${type}):`, error);
            throw error;
        }
    },
    
    // Log kanalını getir - uyumluluk eklenmiş versiyon
    getLogChannel: async (guildId, type) => {
        try {
            // Tip normalleştirme
            const normalizedType = normalizeLogType(type);
            
            const row = await get(
                'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
                [guildId, normalizedType]
            );
            
            // Legacy logchannel desteği - belirli bir tip yoksa 'mod' tipini dene
            if (!row && (type !== 'moderation' && normalizedType !== 'moderation')) {
                // Açıkça herhangi bir tip bulunamadıysa, 'mod' tipini kontrol et
                const modRow = await get(
                    'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
                    [guildId, 'moderation']
                );
                
                if (modRow) return modRow.channel_id;
            }
            
            return row ? row.channel_id : null;
        } catch (error) {
            console.error(`Log kanalı getirme hatası (${type}):`, error);
            return null;
        }
    },
    
    // Tüm log kanallarını getir
    getAllLogChannels: async (guildId) => {
        try {
            return all(
                'SELECT type, channel_id FROM log_channels WHERE guild_id = ?',
                [guildId]
            );
        } catch (error) {
            console.error(`Tüm log kanallarını getirme hatası:`, error);
            return [];
        }
    },
    
    // Log kanalı ayarını sil
    deleteLogChannel: async (guildId, type) => {
        try {
            // Tip normalleştirme
            const normalizedType = normalizeLogType(type);
            
            return run(
                'DELETE FROM log_channels WHERE guild_id = ? AND type = ?',
                [guildId, normalizedType]
            );
        } catch (error) {
            console.error(`Log kanalı silme hatası (${type}):`, error);
            throw error;
        }
    }
};

// Guild ayarları işlemleri
const guilds = {
    // Guild'i oluştur/kontrol et
    setupGuild: async (guildId) => {
        try {
            await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
            return { guildId };
        } catch (error) {
            console.error(`Guild ayarları oluşturma hatası:`, error);
            throw error;
        }
    },
    
    // Prefix ayarla
    setPrefix: async (guildId, prefix) => {
        try {
            await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
            return run(
                'UPDATE guild_settings SET prefix = ? WHERE guild_id = ?',
                [prefix, guildId]
            );
        } catch (error) {
            console.error(`Prefix ayarlama hatası:`, error);
            throw error;
        }
    },
    
    // Prefix getir
    getPrefix: async (guildId) => {
        try {
            const row = await get(
                'SELECT prefix FROM guild_settings WHERE guild_id = ?',
                [guildId]
            );
            return row ? row.prefix : '!';
        } catch (error) {
            console.error(`Prefix getirme hatası:`, error);
            return '!';
        }
    },
    
    // Guild'i sil
    deleteGuild: async (guildId) => {
        try {
            return run('DELETE FROM guild_settings WHERE guild_id = ?', [guildId]);
        } catch (error) {
            console.error(`Guild silme hatası:`, error);
            throw error;
        }
    },
    
    // Tüm guild'leri getir
    getAllGuilds: async () => {
        try {
            return all('SELECT * FROM guild_settings');
        } catch (error) {
            console.error(`Tüm guild'leri getirme hatası:`, error);
            return [];
        }
    }
};

// Ceza işlemleri
const punishments = {
    // Ceza ekle
    addPunishment: async (guildId, userId, moderatorId, type, reason, duration = null, endTime = null) => {
        try {
            await guilds.setupGuild(guildId);
            const result = await run(
                'INSERT INTO punishments (guild_id, user_id, moderator_id, type, reason, duration, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildId, userId, moderatorId, type, reason, duration, endTime]
            );
            return result.lastID;
        } catch (error) {
            console.error(`Ceza ekleme hatası:`, error);
            throw error;
        }
    },
    
    // Aktif cezaları getir
    getActivePunishments: async (guildId) => {
        try {
            return all(
                'SELECT * FROM punishments WHERE guild_id = ? AND active = 1 ORDER BY created_at DESC',
                [guildId]
            );
        } catch (error) {
            console.error(`Aktif cezaları getirme hatası:`, error);
            return [];
        }
    },
    
    // Kullanıcının aktif cezalarını getir
    getUserActivePunishments: async (guildId, userId) => {
        try {
            return all(
                'SELECT * FROM punishments WHERE guild_id = ? AND user_id = ? AND active = 1 ORDER BY created_at DESC',
                [guildId, userId]
            );
        } catch (error) {
            console.error(`Kullanıcı aktif cezalarını getirme hatası:`, error);
            return [];
        }
    },
    
    // Kullanıcının tüm ceza geçmişini getir
    getUserPunishmentHistory: async (guildId, userId) => {
        try {
            return all(
                'SELECT * FROM punishments WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
                [guildId, userId]
            );
        } catch (error) {
            console.error(`Kullanıcı ceza geçmişini getirme hatası:`, error);
            return [];
        }
    },
    
    // Belirli bir cezayı getir
    getPunishment: async (punishmentId, guildId) => {
        try {
            return get(
                'SELECT * FROM punishments WHERE id = ? AND guild_id = ?',
                [punishmentId, guildId]
            );
        } catch (error) {
            console.error(`Ceza getirme hatası:`, error);
            return null;
        }
    },
    
    // Cezayı kaldır (active = 0 yap)
    removePunishment: async (punishmentId, guildId) => {
        try {
            return run(
                'UPDATE punishments SET active = 0 WHERE id = ? AND guild_id = ?',
                [punishmentId, guildId]
            );
        } catch (error) {
            console.error(`Ceza kaldırma hatası:`, error);
            throw error;
        }
    },
    
    // Süresi dolmuş cezaları kontrol et ve kaldır
    checkExpiredPunishments: async () => {
        try {
            const now = Date.now();
            const expiredPunishments = await all(
                'SELECT * FROM punishments WHERE active = 1 AND end_time IS NOT NULL AND end_time <= ?',
                [now]
            );
            
            for (const punishment of expiredPunishments) {
                await run(
                    'UPDATE punishments SET active = 0 WHERE id = ?',
                    [punishment.id]
                );
            }
            
            return expiredPunishments;
        } catch (error) {
            console.error(`Süresi dolmuş cezaları kontrol hatası:`, error);
            return [];
        }
    }
};

// Uyarı işlemleri
const warnings = {
    // Uyarı ekle
    addWarning: async (guildId, userId, moderatorId, reason) => {
        try {
            await guilds.setupGuild(guildId);
            const result = await run(
                'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)',
                [guildId, userId, moderatorId, reason]
            );
            return result.lastID;
        } catch (error) {
            console.error(`Uyarı ekleme hatası:`, error);
            throw error;
        }
    },
    
    // Uyarıları getir
    getWarnings: async (guildId, userId) => {
        try {
            return all(
                'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
                [guildId, userId]
            );
        } catch (error) {
            console.error(`Uyarıları getirme hatası:`, error);
            return [];
        }
    },
    
    // Uyarı sayısını getir
    getWarningCount: async (guildId, userId) => {
        try {
            const row = await get(
                'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?',
                [guildId, userId]
            );
            return row ? row.count : 0;
        } catch (error) {
            console.error(`Uyarı sayısı getirme hatası:`, error);
            return 0;
        }
    },
    
    // Belirli bir uyarıyı sil
    deleteWarning: async (warningId, guildId) => {
        try {
            return run(
                'DELETE FROM warnings WHERE id = ? AND guild_id = ?',
                [warningId, guildId]
            );
        } catch (error) {
            console.error(`Uyarı silme hatası:`, error);
            throw error;
        }
    },
    
    // Kullanıcının tüm uyarılarını temizle
    clearAutomatedWarnings: async (guildId, userId) => {
        try {
            return run(
                'DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND reason LIKE ?',
                [guildId, userId, '%Otomatik uyarı:%']
                // Alternatif olarak, spam uyarılarını belirli bir formatta kaydettiyseniz:
                // [guildId, userId, '%spam%']
            );
        } catch (error) {
            console.error(`Otomatik uyarı temizleme hatası:`, error);
            throw error;
        }
    }
};

// Moderasyon kaydı işlemleri
const modActions = {
    // Moderasyon kaydı ekle (ban, kick, mute vb.)
    addAction: async (guildId, userId, moderatorId, actionType, reason, duration = null) => {
        try {
            await guilds.setupGuild(guildId);
            const result = await run(
                'INSERT INTO mod_actions (guild_id, user_id, moderator_id, action_type, reason, duration) VALUES (?, ?, ?, ?, ?, ?)',
                [guildId, userId, moderatorId, actionType, reason, duration]
            );
            return result.lastID;
        } catch (error) {
            console.error(`Moderasyon kaydı ekleme hatası:`, error);
            throw error;
        }
    },
    
    // Kullanıcının moderasyon kayıtlarını getir
    getUserActions: async (guildId, userId) => {
        try {
            return all(
                'SELECT * FROM mod_actions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
                [guildId, userId]
            );
        } catch (error) {
            console.error(`Kullanıcı moderasyon kayıtları getirme hatası:`, error);
            return [];
        }
    },
    
    // Belirli türdeki moderasyon kayıtlarını getir
    getActionsByType: async (guildId, actionType) => {
        try {
            return all(
                'SELECT * FROM mod_actions WHERE guild_id = ? AND action_type = ? ORDER BY created_at DESC',
                [guildId, actionType]
            );
        } catch (error) {
            console.error(`Türe göre moderasyon kayıtları getirme hatası:`, error);
            return [];
        }
    },
    
    // Belirli moderatörün işlemlerini getir
    getModeratorActions: async (guildId, moderatorId) => {
        try {
            return all(
                'SELECT * FROM mod_actions WHERE guild_id = ? AND moderator_id = ? ORDER BY created_at DESC',
                [guildId, moderatorId]
            );
        } catch (error) {
            console.error(`Moderatör işlemleri getirme hatası:`, error);
            return [];
        }
    }
};

// Helper functions
const utils = {
    // SQLite LIKE için karakterleri escape et
    escapeLike: (str) => str.replace(/[%_]/g, char => `\\${char}`),
    
    // Veritabanından verileri yedekle
    backupDatabase: async () => {
        const backupPath = path.join(dbFolder, `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
        return new Promise((resolve, reject) => {
            const backup = fs.createWriteStream(backupPath);
            const source = fs.createReadStream(dbFile);
            
            source.pipe(backup);
            source.on('end', () => {
                console.log(`Veritabanı ${backupPath} adresine yedeklendi.`);
                resolve(backupPath);
            });
            source.on('error', (err) => {
                console.error('Yedekleme hatası:', err);
                reject(err);
            });
        });
    }
};

// Eski logchannel.js ile uyumluluk için yardımcı fonksiyonlar
async function getLogChannel(guildId, type) {
    return await logs.getLogChannel(guildId, type);
}

async function setLogChannel(guildId, type, channelId) {
    return await logs.setLogChannel(guildId, type, channelId);
}

// Module exports
module.exports = {
    db,
    initialize: initializeDatabase,
    run,
    get,
    all,
    punishments,
    logs,
    guilds,
    warnings,
    modActions,
    utils,
    
    // Eski fonksiyon adları için uyumluluk
    getLogChannel,
    setLogChannel,
    
    // Close database connection
    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    console.error('Veritabanını kapatma hatası:', err.message);
                    reject(err);
                } else {
                    console.log('Veritabanı bağlantısı kapatıldı.');
                    resolve();
                }
            });
        });
    }
};