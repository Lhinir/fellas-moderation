// src/buttons/panel_settings.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_settings',
    
    async execute(interaction) {
        try {
            // panel_settings komutunu çağır
            const panelSettings = interaction.client.commands.get('panel_settings');
            
            if (panelSettings) {
                await panelSettings.execute(interaction);
            } else {
                console.error('panel_settings komutu bulunamadı');
                await interaction.reply({
                    content: 'Ayarlar paneli açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('panel_settings butonu hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Ayarlar paneli açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};