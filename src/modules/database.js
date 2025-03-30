// src/modules/database.js (genişletilmiş)

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

// Log kanalları işlemleri
const logs = {
    // Log kanalı ayarla
    setLogChannel: async (guildId, type, channelId) => {
        // Önce guild_settings tablosunda guild_id'nin var olduğundan emin ol
        await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
        // Log kanalını ayarla
        return run(
            'INSERT OR REPLACE INTO log_channels (guild_id, type, channel_id) VALUES (?, ?, ?)',
            [guildId, type, channelId]
        );
    },
    
    // Log kanalını getir
    getLogChannel: async (guildId, type) => {
        const row = await get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guildId, type]
        );
        return row ? row.channel_id : null;
    },
    
    // Tüm log kanallarını getir
    getAllLogChannels: async (guildId) => {
        return all(
            'SELECT type, channel_id FROM log_channels WHERE guild_id = ?',
            [guildId]
        );
    },
    
    // Log kanalı ayarını sil
    deleteLogChannel: async (guildId, type) => {
        return run(
            'DELETE FROM log_channels WHERE guild_id = ? AND type = ?',
            [guildId, type]
        );
    }
};

// Guild ayarları işlemleri
const guilds = {
    // Guild'i oluştur/kontrol et
    setupGuild: async (guildId) => {
        await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
        return { guildId };
    },
    
    // Prefix ayarla
    setPrefix: async (guildId, prefix) => {
        await run('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)', [guildId]);
        return run(
            'UPDATE guild_settings SET prefix = ? WHERE guild_id = ?',
            [prefix, guildId]
        );
    },
    
    // Prefix getir
    getPrefix: async (guildId) => {
        const row = await get(
            'SELECT prefix FROM guild_settings WHERE guild_id = ?',
            [guildId]
        );
        return row ? row.prefix : '!';
    },
    
    // Guild'i sil
    deleteGuild: async (guildId) => {
        return run('DELETE FROM guild_settings WHERE guild_id = ?', [guildId]);
    },
    
    // Tüm guild'leri getir
    getAllGuilds: async () => {
        return all('SELECT * FROM guild_settings');
    }
};

// Uyarı işlemleri
const warnings = {
    // Uyarı ekle
    addWarning: async (guildId, userId, moderatorId, reason) => {
        await guilds.setupGuild(guildId);
        const result = await run(
            'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)',
            [guildId, userId, moderatorId, reason]
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
    
    // Uyarı sayısını getir
    getWarningCount: async (guildId, userId) => {
        const row = await get(
            'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );
        return row ? row.count : 0;
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
    }
};

// Moderasyon kaydı işlemleri
const modActions = {
    // Moderasyon kaydı ekle (ban, kick, mute vb.)
    addAction: async (guildId, userId, moderatorId, actionType, reason, duration = null) => {
        await guilds.setupGuild(guildId);
        const result = await run(
            'INSERT INTO mod_actions (guild_id, user_id, moderator_id, action_type, reason, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [guildId, userId, moderatorId, actionType, reason, duration]
        );
        return result.lastID;
    },
    
    // Kullanıcının moderasyon kayıtlarını getir
    getUserActions: async (guildId, userId) => {
        return all(
            'SELECT * FROM mod_actions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
            [guildId, userId]
        );
    },
    
    // Belirli türdeki moderasyon kayıtlarını getir
    getActionsByType: async (guildId, actionType) => {
        return all(
            'SELECT * FROM mod_actions WHERE guild_id = ? AND action_type = ? ORDER BY created_at DESC',
            [guildId, actionType]
        );
    },
    
    // Belirli moderatörün işlemlerini getir
    getModeratorActions: async (guildId, moderatorId) => {
        return all(
            'SELECT * FROM mod_actions WHERE guild_id = ? AND moderator_id = ? ORDER BY created_at DESC',
            [guildId, moderatorId]
        );
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

// Module exports
module.exports = {
    db,
    initialize: initializeDatabase,
    run,
    get,
    all,
    logs,
    guilds,
    warnings,
    modActions,
    utils,
    
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