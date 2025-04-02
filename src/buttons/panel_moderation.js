// src/buttons/panel_moderation.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_moderation',
    
    async execute(interaction) {
        try {
            // panel_moderation komutunu çağır
            const panelModeration = interaction.client.commands.get('panel_moderation');
            
            if (panelModeration) {
                await panelModeration.execute(interaction);
            } else {
                console.error('panel_moderation komutu bulunamadı');
                await interaction.reply({
                    content: 'Moderasyon paneli açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('panel_moderation butonu hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Moderasyon paneli açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};