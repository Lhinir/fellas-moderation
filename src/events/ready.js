// src/events/ready.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 ${client.user.tag} olarak giriş yapıldı!`);

        // Tüm sunuculara slash komutlarını kaydet
        const commands = [];
        for (const [, command] of client.commands) {
            commands.push(command.data.toJSON());
        }

        try {
            console.log('🔧 Slash komutları sunuculara kaydediliyor...');

            // Global olarak komutları kaydet
            await client.application.commands.set(commands);

            console.log('✅ Slash komutları başarıyla kaydedildi!');
        } catch (error) {
            console.error('Komut kaydetme hatası:', error);
        }
    }
};