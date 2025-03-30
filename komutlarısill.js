// clearGuildCommands.js adında yeni bir dosya oluşturun

require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// ENV değerlerini kontrol et
if (!process.env.TOKEN || !process.env.APP_ID || !process.env.GUILD_ID) {
    console.error('HATA: .env dosyasında TOKEN, APP_ID veya GUILD_ID eksik!');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Sunucuya özel komutlar temizleniyor...');
        
        // Sunucuya özel komutları boş bir dizi ile değiştir
        await rest.put(
            Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
            { body: [] }
        );

        console.log('Tüm sunucuya özel komutlar başarıyla temizlendi!');
    } catch (error) {
        console.error('Komut temizleme hatası:', error);
    }
})();