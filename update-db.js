// Veritabanı güncelleme betiği oluşturalım
// update-db.js adında bir dosya oluşturun:

require('dotenv').config();
const database = require('./src/modules/database');

async function updateDatabase() {
    try {
        console.log('Veritabanı güncelleniyor...');
        
        // Mevcut tablo yapısını kontrol et
        const tableInfo = await database.all("PRAGMA table_info(automod_configs)");
        
        // Eksik sütunları belirle ve ekle
        const requiredColumns = [
            { name: 'spam_protection', type: 'INTEGER DEFAULT 0' },
            { name: 'spam_threshold', type: 'INTEGER DEFAULT 5' },
            { name: 'spam_interval', type: 'INTEGER DEFAULT 5000' },
            { name: 'spam_timeout', type: 'INTEGER DEFAULT 300000' }
        ];
        
        // Mevcut sütun adlarını al
        const existingColumns = tableInfo.map(col => col.name);
        
        // Eksik sütunları ekle
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                console.log(`Ekleniyor: ${column.name}`);
                await database.run(`ALTER TABLE automod_configs ADD COLUMN ${column.name} ${column.type}`);
            } else {
                console.log(`Sütun zaten var: ${column.name}`);
            }
        }
        
        console.log('Veritabanı başarıyla güncellendi!');
    } catch (error) {
        console.error('Veritabanı güncelleme hatası:', error);
    } finally {
        // Bağlantıyı kapat
        await database.close();
    }
}

updateDatabase();