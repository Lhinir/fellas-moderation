// src/buttons/panel_back.js

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    customId: 'panel_back',
    async execute(interaction) {
        // Ana panel'e dön
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🛠️ Fellas Bot Yönetim Paneli')
            .setDescription('Aşağıdaki butonları kullanarak bot ayarlarını kolay ve hızlı bir şekilde yapılandırabilirsiniz.')
            .addFields(
                { name: 'Moderasyon Ayarları', value: 'AutoMod, spam kontrolü ve link engelleme ayarları' },
                { name: 'Log Ayarları', value: 'Çeşitli log kanallarını yapılandırma' },
                { name: 'Sunucu Ayarları', value: 'Karşılama, oto-rol ve diğer sunucu ayarları' },
                { name: 'Bot Bilgileri', value: 'Bot istatistikleri ve durum bilgileri' }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot ayarlarını yönetin ve yapılandırın' });
            
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_moderation')
                    .setLabel('Moderasyon Ayarları')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('panel_logs')
                    .setLabel('Log Ayarları')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_server')
                    .setLabel('Sunucu Ayarları')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('panel_info')
                    .setLabel('Bot Bilgileri')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );
            
        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
};