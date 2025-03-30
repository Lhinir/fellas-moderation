// src/buttons/automod_toggle.js

const { EmbedBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'automod_toggle',
    async execute(interaction) {
        try {
            // Mevcut durumu al
            const config = await database.get(
                'SELECT * FROM automod_configs WHERE guild_id = ?',
                [interaction.guild.id]
            );
            
            // Yeni durumu belirle
            const newState = config && config.enabled ? 0 : 1;
            
            // Veritabanını güncelle
            if (config) {
                await database.run(
                    'UPDATE automod_configs SET enabled = ? WHERE guild_id = ?',
                    [newState, interaction.guild.id]
                );
            } else {
                await database.run(
                    'INSERT INTO automod_configs (guild_id, enabled, banned_words, spam_protection, spam_threshold, spam_interval, spam_timeout) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [interaction.guild.id, newState, '[]', 0, 5, 5000, 300000]
                );
            }
            
            // Başarılı yanıt
            await interaction.reply({
                content: `✅ AutoMod ${newState ? 'aktifleştirildi' : 'devre dışı bırakıldı'}.`,
                ephemeral: true
            });
            
            // Paneli yeniden göster
            const button = interaction.client.buttons.get('mod_automod');
            if (button) {
                await button.execute(interaction);
            }
        } catch (error) {
            console.error('AutoMod toggle hatası:', error);
            await interaction.reply({
                content: `❌ AutoMod durumu değiştirilirken bir hata oluştu: ${error.message}`,
                ephemeral: true
            });
        }
    }
};