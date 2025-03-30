// reset-punishments.js - Ana dizine kaydedin

require('dotenv').config();
const database = require('./src/modules/database');

async function resetAllPunishments() {
    try {
        console.log('Tüm spam cezaları sıfırlanıyor...');
        
        // spam_history tablosundaki tüm kayıtları silin
        const result = await database.run('DELETE FROM spam_history');
        
        if (result) {
            console.log(`Toplam ${result.changes} kullanıcının ceza kaydı sıfırlandı.`);
        } else {
            console.log('Sıfırlanacak kayıt bulunamadı veya işlem tamamlandı.');
        }
        
        console.log('İşlem başarıyla tamamlandı!');
    } catch (error) {
        console.error('Ceza sıfırlama hatası:', error);
    } finally {
        // Veritabanı bağlantısını kapat
        await database.close();
        console.log('Veritabanı bağlantısı kapatıldı.');
    }
}

// Sıfırlama işlemini başlat
resetAllPunishments();