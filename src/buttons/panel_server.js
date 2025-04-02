// src/buttons/panel_server.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_server',
    
    async execute(interaction) {
        try {
            // panel_settings komutunu çağır (aynı içeriğe sahip)
            const panelSettings = interaction.client.commands.get('panel_server');
            
            if (panelSettings) {
                await panelSettings.execute(interaction);
            } else {
                console.error('panel_server komutu bulunamadı');
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Sunucu bilgileri açılırken bir hata oluştu.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('panel_server butonu hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Sunucu bilgileri açılırken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};