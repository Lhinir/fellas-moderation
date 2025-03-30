// src/buttons/panel_server.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    customId: 'panel_server',
    async execute(interaction) {
        // Sunucu panel
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('⚙️ Sunucu Ayarları')
            .setDescription('Sunucu özelliklerini yapılandırın:')
            .addFields(
                { name: 'Karşılama Sistemi', value: 'Karşılama mesajları ve kanalları' },
                { name: 'Oto-Rol', value: 'Yeni üyelere otomatik rol atama' },
                { name: 'Özel Komutlar', value: 'Sunucuya özel komutlar oluşturma' }
            );
            
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('server_welcome')
                    .setLabel('Karşılama Sistemi')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👋'),
                new ButtonBuilder()
                    .setCustomId('server_autorole')
                    .setLabel('Oto-Rol')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏷️'),
                new ButtonBuilder()
                    .setCustomId('server_commands')
                    .setLabel('Özel Komutlar')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💻')
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