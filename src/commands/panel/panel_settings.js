// src/commands/admin/panel.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_settings')
        .setDescription('Bot ayar panelini aç')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
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
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('panel_logs')
                    .setLabel('Log Ayarları')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_server')
                    .setLabel('Sunucu Ayarları')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('panel_info')
                    .setLabel('Bot Bilgileri')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );
        
        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }
};