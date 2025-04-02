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
                { name: 'Log Ayarları', value: 'Çeşitli log kanallarını yapılandırma' },
                { name: 'Sunucu Bilgileri', value: 'Sunucu bilgilerini görüntüler' },
                { name: 'Bot Bilgileri', value: 'Bot istatistikleri ve durum bilgileri' }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot ayarlarını yönetin ve yapılandırın' });
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_logs')
                    .setLabel('Log Ayarları')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('panel_server')
                    .setLabel('Sunucu Bilgileri')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('panel_info')
                    .setLabel('Bot Bilgileri')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️'),
                new ButtonBuilder()
                    .setCustomId('panel_main')
                    .setLabel('Ana Panele Dön')
                    .setStyle(ButtonStyle.Secondary) // Secondary
                    .setEmoji('🏠')
            );
        
        if (interaction.isButton()) {
            await interaction.update({ 
                embeds: [embed], 
                components: [row], // row yerine row1, row2 kullanın
            });
        } else {
            await interaction.reply({ 
                embeds: [embed], 
                components: [row], // row yerine row1, row2 kullanın
                ephemeral: true  // Kişiye özel
            });
        }
    }
};