// src/selectMenus/logs_select.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    customId: 'logs_select',
    async execute(interaction) {
        const selectedType = interaction.values[0];
        
        // Log türlerine göre anlaşılır isimler
        const logTypeNames = {
            'moderation': 'Moderasyon Logları',
            'server': 'Sunucu Logları',
            'message': 'Mesaj Logları',
            'member': 'Üye Logları',
            'voice': 'Ses Logları'
        };
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`logs_set_${selectedType}`)
            .setTitle(`${logTypeNames[selectedType]} Ayarla`);
            
        // Kanal ID input
        const channelInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('Kanal ID')
            .setPlaceholder('Log kanalının ID\'sini girin veya # ile kanalı etiketleyin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // Row oluştur
        const actionRow = new ActionRowBuilder().addComponents(channelInput);
        
        // Modal'a row ekle
        modal.addComponents(actionRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
    }
};