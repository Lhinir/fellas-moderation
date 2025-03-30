// deploy-commands.js - Guild-specific versiyonu

require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');

// ENV kontrol
if (!process.env.TOKEN || !process.env.APP_ID || !process.env.GUILD_ID) {
    console.error('HATA: .env dosyasında TOKEN, APP_ID veya GUILD_ID eksik!');
    console.log('Lütfen .env dosyanızın şunları içerdiğinden emin olun:');
    console.log('TOKEN=your_bot_token');
    console.log('APP_ID=your_application_id');
    console.log('GUILD_ID=your_guild_id');
    process.exit(1);
}

// Komutları topla
const commands = [];
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            try {
                commands.push(command.data.toJSON());
                console.log(`Komut hazırlandı: ${command.data.name}`);
            } catch (error) {
                console.error(`Komut JSON dönüştürme hatası (${file}):`, error);
            }
        } else {
            console.log(`[UYARI] ${filePath} komutu "data" veya "execute" özelliğine sahip değil.`);
        }
    }
}

// Komut listesi kontrol
if (commands.length === 0) {
    console.error('HATA: Hiçbir geçerli komut bulunamadı!');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// ID'leri loglama
console.log(`Discord Uygulama ID: ${process.env.APP_ID}`);
console.log(`Hedef Sunucu ID: ${process.env.GUILD_ID}`);

(async () => {
    try {
        console.log(`${commands.length} adet slash komutunu belirli bir sunucuya kaydediliyor...`);
        
        // Sadece belirli bir sunucu için komutları kaydet
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
            { body: commands },
        );
        
        console.log(`Başarıyla ${data.length} komut belirli sunucuya kaydedildi!`);
        
        // Mevcut global komutları temizlemek için - isteğe bağlı
        console.log('Global komutlar temizleniyor...');
        await rest.put(
            Routes.applicationCommands(process.env.APP_ID),
            { body: [] },
        );
        console.log('Global komutlar temizlendi.');
        
    } catch (error) {
        console.error('Komut kaydı sırasında hata oluştu:', error);
        
        // Hata detayını göster
        if (error.rawError) {
            console.error('Hata detayları:', JSON.stringify(error.rawError, null, 2));
        }
    }
})();