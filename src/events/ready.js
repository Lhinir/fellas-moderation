// src/events/ready.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} olarak giriş yapıldı!`);
        
        try {
            // Veri klasörlerinin varlığını kontrol et
            const dataDir = path.join(__dirname, '../../data');
            const logsDir = path.join(__dirname, '../../logs');
            
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            // Slash komutları kaydet
            const commands = [];
            
            client.commands.forEach(command => {
                commands.push(command.data.toJSON());
            });
            
            const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
            
            console.log('Slash komutları kaydediliyor...');
            
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            
            console.log('Slash komutları başarıyla kaydedildi!');
            
            // Bot durumunu ayarla
            client.user.setPresence({
                activities: [{ name: '/help', type: 3 }], // 3 = Watching
                status: 'online'
            });
            
            // Sunucu sayısını logla
            console.log(`${client.guilds.cache.size} sunucuda hazır!`);
            
        } catch (error) {
            console.error('Ready olayında hata:', error);
        }
    }
};