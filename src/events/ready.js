// src/events/ready.js - güncellenmiş

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { ActivityType } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            console.log(`${client.user.tag} olarak giriş yapıldı!`);
            
            // Durum mesajını ayarla
            client.user.setPresence({
                activities: [{ name: 'fellas gururla sunar', type: ActivityType.Playing }],
                status: 'online',
            });
            
            // Slash komutlarını kaydedelim
            const commands = [];
            
            // Komut toplama işlemini try/catch içine alalım
            try {
                client.commands.forEach((command) => {
                    // Komutun geçerli veri içerdiğini kontrol et
                    if (command.data && command.data.name && command.data.description) {
                        try {
                            commands.push(command.data.toJSON());
                        } catch (cmdError) {
                            console.warn(`Komut JSON dönüştürme hatası (${command.data.name}):`, cmdError.message);
                        }
                    } else {
                        console.warn(`Geçersiz komut formatı: ${command?.data?.name || 'İsimsiz komut'}`);
                    }
                });
            } catch (collectError) {
                console.error('Komutları toplama hatası:', collectError);
            }
            
            // Komutları kaydet
            if (commands.length > 0) {
                const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
                
                try {
                    console.log(`${commands.length} adet slash komutu kaydediliyor...`);
                    
                    await rest.put(
                        Routes.applicationCommands(client.user.id),
                        { body: commands },
                    );
                    
                    console.log('Slash komutları başarıyla kaydedildi!');
                } catch (apiError) {
                    console.error('Slash komutlarını kaydetme hatası:', apiError);
                }
            } else {
                console.warn('Kaydedilecek geçerli komut bulunamadı!');
            }
            
            // Tüm sunucuları veritabanında başlat
            try {
                for (const guild of client.guilds.cache.values()) {
                    await database.guilds.setupGuild(guild.id).catch(err => {
                        console.error(`${guild.name} (${guild.id}) sunucusu için veritabanı hatası:`, err);
                    });
                    console.log(`Guild hazırlandı: ${guild.name} (${guild.id})`);
                }
                
                console.log(`${client.guilds.cache.size} sunucu veritabanında hazırlandı.`);
            } catch (dbError) {
                console.error('Veritabanı işlemi hatası:', dbError);
            }
            
        } catch (error) {
            console.error('Ready olayında hata:', error);
        }
    },
};