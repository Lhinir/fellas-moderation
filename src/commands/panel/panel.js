// src/commands/panel/panel.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

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
                        .setStyle(1) // Primary
                        .setEmoji('🛡️'),
                    new ButtonBuilder()
                        .setCustomId('panel_settings')
                        .setLabel('Ayarlar')
                        .setStyle(4) // Danger
                        .setEmoji('⚙️')
                );

            // Interaction tipine göre doğru yöntemi kullan
            if (interaction.isButton()) {
                // Buton için update kullan
                await interaction.update({ 
                    embeds: [embed], 
                    components: [row]
                    // Not: update ile ephemeral özelliği değiştirilemez
                });
            } else if (!interaction.replied && !interaction.deferred) {
                // Slash komut için ve henüz cevap verilmemişse reply kullan
                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row],
                    ephemeral: true
                });
            } else {
                // Daha önce deferred veya replied ise followUp kullan
                await interaction.followUp({ 
                    embeds: [embed], 
                    components: [row],
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Ana panel hatası:', error);
            
            // Sadece henüz cevap verilmemişse reply kullan
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Panel açılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                // Daha önce cevap verilmişse followUp kullan
                await interaction.followUp({ 
                    content: 'Panel açılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};