// check-automod.js - AutoMod yapılandırmasını kontrol etmek için bir script
require('dotenv').config();
const database = require('./src/modules/database');

async function checkAutoMod() {
    try {
        // Veritabanını başlat
        await database.initialize();
        
        // Tüm sunucular için AutoMod konfigürasyonlarını kontrol et
        const configs = await database.all('SELECT * FROM automod_configs');
        
        if (configs && configs.length > 0) {
            console.log('Bulunan AutoMod konfigürasyonları:');
            configs.forEach(config => {
                console.log(`Sunucu ID: ${config.guild_id}`);
                console.log(`  AutoMod Aktif: ${config.enabled ? 'Evet' : 'Hayır'}`);
                console.log(`  Spam Koruması: ${config.spam_protection ? 'Aktif' : 'Devre Dışı'}`);
                console.log(`  Spam Eşiği: ${config.spam_threshold} mesaj`);
                console.log(`  Spam Aralığı: ${config.spam_interval / 1000} saniye`);
                console.log(`  Spam Susturma Süresi: ${config.spam_timeout / 60000} dakika`);
                console.log('---');
            });
        } else {
            console.log('Hiç AutoMod konfigürasyonu bulunamadı!');
            
            // Test amaçlı bir konfigürasyon oluşturalım
            console.log('Test konfigürasyonu oluşturuluyor...');
            
            // Sunucu ID'nizi buraya girin
            const guildId = 'YOUR_GUILD_ID';
            
            // AutoMod konfigürasyonu oluştur
            await database.run(`
                INSERT OR REPLACE INTO automod_configs 
                (guild_id, enabled, banned_words, spam_protection, spam_threshold, spam_interval, spam_timeout) 
                VALUES (?, 1, '[]', 1, 5, 5000, 300000)
            `, [guildId]);
            
            console.log(`${guildId} için test konfigürasyonu oluşturuldu.`);
        }
    } catch (error) {
        console.error('Kontrol sırasında hata:', error);
    } finally {
        // Bağlantıyı kapat
        await database.close();
    }
}

checkAutoMod();