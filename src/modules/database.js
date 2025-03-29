// src/modules/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../data/bot.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Sunucu ayarları tablosu
            this.db.run(`CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                welcome_channel_id TEXT,
                goodbye_channel_id TEXT,
                log_channel_id TEXT,
                mod_role_id TEXT,
                mute_role_id TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }

    async getGuildConfig(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // Varsayılan ayarlar
                    const defaultConfig = {
                        guild_id: guildId,
                        prefix: '!'
                    };
                    
                    // Veritabanına varsayılan ayarları ekle
                    this.db.run(
                        'INSERT INTO guild_settings (guild_id, prefix) VALUES (?, ?)',
                        [guildId, '!'],
                        function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(defaultConfig);
                        }
                    );
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateGuildConfig(guildId, settings) {
        const columns = [];
        const values = [];
        
        Object.entries(settings).forEach(([key, value]) => {
            if (key !== 'guild_id') {
                columns.push(`${key} = ?`);
                values.push(value);
            }
        });
        
        if (columns.length === 0) return false;
        
        columns.push('updated_at = CURRENT_TIMESTAMP');
        values.push(guildId);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE guild_settings SET ${columns.join(', ')} WHERE guild_id = ?`,
                values,
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}

module.exports = Database;