require('dotenv').config();
const database = require('./src/modules/database');

async function updateWarningsTable() {
    try {
        // Veritabanını başlat
        await database.initialize();
        
        // Warnings tablosuna automated sütunu ekle (eğer yoksa)
        await database.run(`
            PRAGMA table_info(warnings)
        `).then(async (columns) => {
            // Automated sütunu var mı kontrol et
            const hasAutomatedColumn = columns.some(col => col.name === 'automated');
            
            if (!hasAutomatedColumn) {
                console.log('Warnings tablosuna "automated" sütunu ekleniyor...');
                
                await database.run(`
                    ALTER TABLE warnings ADD COLUMN automated INTEGER DEFAULT 0
                `);
                
                console.log('Sütun başarıyla eklendi!');
            } else {
                console.log('Automated sütunu zaten mevcut.');
            }
        });
        
        console.log('Tablo güncelleme tamamlandı.');
    } catch (error) {
        console.error('Tablo güncelleme hatası:', error);
    } finally {
        await database.close();
    }
}

updateWarningsTable();