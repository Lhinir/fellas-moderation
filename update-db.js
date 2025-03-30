// update-db.js - Veritabanı güncelleme dosyası

require('dotenv').config();
const database = require('./src/modules/database');

async function updateDatabase() {
    try {
        console.log('Veritabanı güncelleniyor...');
        
        // Link engelleme konfigürasyonu için tablo oluştur
        await database.run(`
            CREATE TABLE IF NOT EXISTS link_protection (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                whitelist_channels TEXT DEFAULT '[]',
                whitelist_roles TEXT DEFAULT '[]',
                whitelist_domains TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Link engelleme tablosu oluşturuldu.');
        console.log('Veritabanı başarıyla güncellendi!');
    } catch (error) {
        console.error('Veritabanı güncelleme hatası:', error);
    } finally {
        await database.close();
    }
}

updateDatabase();