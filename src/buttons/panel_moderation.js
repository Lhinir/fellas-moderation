// src/buttons/panel_moderation.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_moderation',
    async execute(interaction) {
        // Moderasyon ana panel
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🛡️ Moderasyon Ayarları')
            .setDescription('Moderasyon özelliklerini yapılandırın:')
            .addFields(
                { name: 'AutoMod', value: 'Yasaklı kelimeler ve spam koruması ayarları' },
                { name: 'Link Engelleme', value: 'Link paylaşımını kontrol edin ve kısıtlayın' },
                { name: 'Ceza Sistemi', value: 'Uyarı, susturma ve yasaklama ayarları' }
            );
            
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mod_automod')
                    .setLabel('AutoMod')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🤖'),
                new ButtonBuilder()
                    .setCustomId('mod_linkprotect')
                    .setLabel('Link Engelleme')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setCustomId('mod_punishment_system')  // Dikkat: customId değişti
                    .setLabel('Ceza Sistemi')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚓'),
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Ana Menü')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
            );
            
        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
};