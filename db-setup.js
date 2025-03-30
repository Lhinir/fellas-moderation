// db-setup.js - Tüm SQLite tablolarını oluşturan kurulum dosyası

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Veritabanı dosyasının yolu
const dbFolder = path.join(process.cwd(), 'data');
const dbFile = path.join(dbFolder, 'fellas.db');

// Veritabanı klasörünü oluştur
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

// Veritabanı bağlantısını oluştur
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
        process.exit(1);
    }
    console.log('Veritabanına bağlandı:', dbFile);
});

// Promise tabanlı SQL çalıştırma fonksiyonu
function runSQL(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, function(err) {
            if (err) {
                console.error(`SQL hatası: ${err.message}`);
                console.error(`Hatalı SQL: ${sql}`);
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes, lastID: this.lastID });
            }
        });
    });
}

// Tüm tabloları oluştur
async function setupDatabase() {
    console.log('Veritabanı tabloları oluşturuluyor...');
    
    try {
        // Foreign keys aktifleştir
        await runSQL('PRAGMA foreign_keys = ON');
        
        // guild_settings tablosu - Sunucu ayarları
        await runSQL(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ guild_settings tablosu oluşturuldu');
        
        // log_channels tablosu - Log kanalları
        await runSQL(`
            CREATE TABLE IF NOT EXISTS log_channels (
                guild_id TEXT,
                type TEXT,
                channel_id TEXT,
                PRIMARY KEY (guild_id, type),
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ log_channels tablosu oluşturuldu');
        
        // warnings tablosu - Kullanıcı uyarıları
        await runSQL(`
            ALTER TABLE warnings ADD COLUMN automated INTEGER DEFAULT 0
        `);
        console.log('✅ warnings tablosu oluşturuldu');
        
        // mod_actions tablosu - Moderasyon işlemleri
        await runSQL(`
            CREATE TABLE IF NOT EXISTS mod_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                action_type TEXT,
                reason TEXT,
                duration TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ mod_actions tablosu oluşturuldu');
        
        // automod_configs tablosu - AutoMod yapılandırması
        await runSQL(`
            CREATE TABLE IF NOT EXISTS automod_configs (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                banned_words TEXT DEFAULT '[]',
                spam_protection INTEGER DEFAULT 0,
                spam_threshold INTEGER DEFAULT 5,
                spam_interval INTEGER DEFAULT 5000,
                spam_timeout INTEGER DEFAULT 300000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ automod_configs tablosu oluşturuldu');
        
        // spam_history tablosu - Spam yapan kullanıcıların geçmişi
        await runSQL(`
            CREATE TABLE IF NOT EXISTS spam_history (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                spam_count INTEGER DEFAULT 1,
                last_spam_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reset_after TIMESTAMP,
                PRIMARY KEY (guild_id, user_id),
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ spam_history tablosu oluşturuldu');
        
        // link_protection tablosu - Link koruma ayarları
        await runSQL(`
            CREATE TABLE IF NOT EXISTS link_protection (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                whitelist_channels TEXT DEFAULT '[]',
                whitelist_roles TEXT DEFAULT '[]',
                whitelist_domains TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ link_protection tablosu oluşturuldu');
        
        // welcomes tablosu - Karşılama mesajları
        await runSQL(`
            CREATE TABLE IF NOT EXISTS welcomes (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                channel_id TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ welcomes tablosu oluşturuldu');
        
        // auto_roles tablosu - Otomatik rol atamaları
        await runSQL(`
            CREATE TABLE IF NOT EXISTS auto_roles (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                roles TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ auto_roles tablosu oluşturuldu');
        
        // İndeksleri oluştur - Performans için
        await runSQL('CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id)');
        await runSQL('CREATE INDEX IF NOT EXISTS idx_mod_actions_guild_user ON mod_actions(guild_id, user_id)');
        await runSQL('CREATE INDEX IF NOT EXISTS idx_mod_actions_type ON mod_actions(action_type)');
        
        console.log('🎉 Tüm tablolar başarıyla oluşturuldu!');
    } catch (error) {
        console.error('Veritabanı kurulumu sırasında bir hata oluştu:', error);
    } finally {
        // Veritabanını kapat
        db.close((err) => {
            if (err) {
                console.error('Veritabanı kapatma hatası:', err.message);
            } else {
                console.log('Veritabanı bağlantısı kapatıldı.');
            }
        });
    }
}

// Kurulumu başlat
setupDatabase();