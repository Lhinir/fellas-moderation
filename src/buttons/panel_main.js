// src/buttons/panel_main.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_main',
    
    async execute(interaction) {
        try {
            // panel (ana panel) komutunu çağır
            const panel = interaction.client.commands.get('panel');
            
            if (panel) {
                await panel.execute(interaction);
            } else {
                console.error('panel komutu bulunamadı');
                await interaction.reply({
                    content: 'Ana panel açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('panel_main butonu hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Ana panel açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};