// src/modules/database.js - Güncellenmiş versiyon

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Veritabanı dosyası
const dbFolder = path.join(process.cwd(), 'data');
const dbFile = path.join(dbFolder, 'fellas.db');

// Veritabanı bağlantısı
let db;

// Veritabanını başlat
async function initialize() {
    return new Promise((resolve, reject) => {
        // Klasörün var olduğundan emin ol
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder, { recursive: true });
        }
        
        // Bağlantıyı oluştur
        db = new sqlite3.Database(dbFile, (err) => {
            if (err) {
                console.error('Veritabanı bağlantı hatası:', err.message);
                reject(err);
                return;
            }
            
            console.log('SQLite veritabanına bağlanıldı.');
            
            // Foreign keys'i aktifleştir
            db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
                if (pragmaErr) {
                    console.error('PRAGMA ayarı hatası:', pragmaErr);
                }
                resolve();
            });
        });
    });
}

// Veritabanını kapat
function close() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Veritabanı kapatma hatası:', err.message);
                    reject(err);
                    return;
                }
                console.log('Veritabanı bağlantısı kapatıldı.');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Promise tabanlı run
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('SQL Error:', sql);
                console.error('Parameters:', params);
                console.error('Error details:', err);
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Promise tabanlı get
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('SQL Error:', sql);
                console.error('Parameters:', params);
                console.error('Error details:', err);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Promise tabanlı all
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('SQL Error:', sql);
                console.error('Parameters:', params);
                console.error('Error details:', err);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Guild işlemleri
const guilds = {
    // Bir guild'i kur veya kontrol et
    setupGuild: async (guildId) => {
        const result = await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
        return { guildId, changes: result.changes };
    },
    
    // Guild prefix'ini al
    getPrefix: async (guildId) => {
        const result = await get('SELECT prefix FROM guild_settings WHERE guild_id = ?', [guildId]);
        return result ? result.prefix : '!';
    },
    
    // Guild prefix'ini ayarla
    setPrefix: async (guildId, prefix) => {
        return run('UPDATE guild_settings SET prefix = ? WHERE guild_id = ?', [prefix, guildId]);
    }
};

// Log kanalı işlemleri
const logs = {
    // Log kanalı ayarla
    setLogChannel: async (guildId, type, channelId) => {
        // Guild'in var olduğundan emin ol
        await guilds.setupGuild(guildId);
        
        // Log kanalını ayarla veya güncelle
        return run(
            'INSERT OR REPLACE INTO log_channels (guild_id, type, channel_id) VALUES (?, ?, ?)',
            [guildId, type, channelId]
        );
    },
    
    // Log kanalını getir
    getLogChannel: async (guildId, type) => {
        const result = await get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guildId, type]
        );
        
        return result ? result.channel_id : null;
    },
    
    // Tüm log kanallarını getir
    getAllLogChannels: async (guildId) => {
        return all(
            'SELECT type, channel_id FROM log_channels WHERE guild_id = ?',
            [guildId]
        );
    },
    
    // Log kanalını sil
    deleteLogChannel: async (guildId, type) => {
        return run(
            'DELETE FROM log_channels WHERE guild_id = ? AND type = ?',
            [guildId, type]
        );
    }
};

// Uyarı işlemleri
const warnings = {
    // Uyarı ekle
    addWarning: async (guildId, userId, moderatorId, reason, automated = 0) => {
        // Guild'in var olduğundan emin ol
        await guilds.setupGuild(guildId);
        
        const result = await run(
            'INSERT INTO warnings (guild_id, user_id, moderator_id, reason, automated) VALUES (?, ?, ?, ?, ?)',
            [guildId, userId, moderatorId, reason, automated]
        );
        
        return result.lastID;
    },
    
    // Uyarıları getir
    getWarnings: async (guildId, userId) => {
        return all(
            'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
            [guildId, userId]
        );
    },
    
    // Otomatik uyarıları getir
    getAutomatedWarnings: async (guildId, userId) => {
        return all(
            'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? AND automated = 1 ORDER BY created_at DESC',
            [guildId, userId]
        );
    },
    
    // Uyarı sayısını getir
    getWarningCount: async (guildId, userId) => {
        const result = await get(
            'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );
        return result ? result.count : 0;
    },
    
    // Belirli bir uyarıyı sil
    deleteWarning: async (warningId, guildId) => {
        return run(
            'DELETE FROM warnings WHERE id = ? AND guild_id = ?',
            [warningId, guildId]
        );
    },
    
    // Kullanıcının tüm uyarılarını temizle
    clearWarnings: async (guildId, userId) => {
        return run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );
    },
    
    // Kullanıcının otomatik uyarılarını temizle
    clearAutomatedWarnings: async (guildId, userId) => {
        return run(
            'DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND automated = 1',
            [guildId, userId]
        );
    }
};

// Moderasyon işlemleri
const modActions = {
    // Moderasyon işlemi ekle
    addAction: async (guildId, userId, moderatorId, actionType, reason, duration = null) => {
        // Guild'in var olduğundan emin ol
        await guilds.setupGuild(guildId);
        
        const result = await run(
            'INSERT INTO mod_actions (guild_id, user_id, moderator_id, action_type, reason, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [guildId, userId, moderatorId, actionType, reason, duration]
        );
        
        return result.lastID;
    },
    
    // Kullanıcı işlemlerini getir
    getUserActions: async (guildId, userId) => {
        return all(
            'SELECT * FROM mod_actions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
            [guildId, userId]
        );
    },
    
    // Belirli türdeki işlemleri getir
    getActionsByType: async (guildId, actionType) => {
        return all(
            'SELECT * FROM mod_actions WHERE guild_id = ? AND action_type = ? ORDER BY created_at DESC',
            [guildId, actionType]
        );
    }
};

module.exports = {
    initialize,
    close,
    run,
    get,
    all,
    guilds,
    logs,
    warnings,
    modActions
};