// src/commands/panel/panel.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Sunucu yönetim panelini açar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🖥️ Sunucu Yönetim Paneli')
                .setDescription('Aşağıdaki butonları kullanarak çeşitli yönetim panellerine erişebilirsiniz.')
                .addFields(
                    { name: '🛡️ Moderasyon Paneli', value: 'Ban, mute, uyarı ve log ayarları gibi moderasyon işlemleri.' },
                    { name: '⚙️ Sunucu Ayarları', value: 'Temel sunucu ayarları ve yapılandırmalar.' }
                )
                .setFooter({ text: 'Sunucu Yönetim Paneli', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_moderation')
                        .setLabel('Moderasyon')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🛡️'),
                    new ButtonBuilder()
                        .setCustomId('panel_settings')
                        .setLabel('Ayarlar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚙️')
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Panel komutu hatası:', error);
            await interaction.reply({ 
                content: 'Panel açılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};