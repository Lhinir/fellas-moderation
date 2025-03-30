// src/tools/migrate-data.js - Düzeltilmiş yol

const fs = require('fs');
const path = require('path');
// Burada yolu düzeltiyoruz - bir üst dizine çıkıp, oradan modules klasörüne gidiyoruz
const database = require('../src/modules/database');

// Mevcut log kanallarını oku ve veritabanına aktar
async function migrateLogChannels() {
    console.log('Log kanalları aktarılıyor...');
    
    // Proje kök dizinine git
    const dataFolder = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataFolder)) {
        console.log('Data klasörü bulunamadı, göç yapılacak veri yok.');
        return;
    }
    
    // Tüm sunucu JSON dosyalarını bul
    const files = fs.readdirSync(dataFolder)
        .filter(file => file.endsWith('.json'));
    
    for (const file of files) {
        try {
            const guildId = path.basename(file, '.json');
            const filePath = path.join(dataFolder, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            console.log(`${guildId} için veriler işleniyor...`);
            
            // Sunucu ayarlarını başlat
            await database.guilds.setupGuild(guildId);
            
            // Log kanallarını aktar
            if (data.logChannels) {
                for (const [type, channelId] of Object.entries(data.logChannels)) {
                    if (channelId) {
                        console.log(`${guildId} için ${type} log kanalı aktarılıyor: ${channelId}`);
                        await database.logs.setLogChannel(guildId, type, channelId);
                    }
                }
            }
            
            console.log(`${guildId} için veriler aktarıldı.`);
        } catch (error) {
            console.error(`Dosya işlenirken hata: ${file}`, error);
        }
    }
    
    console.log('Log kanallarının göçü tamamlandı.');
}

// Veritabanını başlat ve göç işlemini başlat
async function migrateData() {
    try {
        // Veritabanını başlat
        await database.initialize();
        
        // Log kanallarını aktar
        await migrateLogChannels();
        
        console.log('Veri göçü tamamlandı!');
    } catch (error) {
        console.error('Veri göçü hatası:', error);
    } finally {
        // Veritabanı bağlantısını kapat
        await database.close();
    }
}

// Göç işlemini başlat
migrateData();