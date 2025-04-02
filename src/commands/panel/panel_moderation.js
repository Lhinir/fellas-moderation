// src/commands/panel/panel_moderation.js

// Öncelikle, ButtonStyle'ı doğru şekilde import ettiğinizden emin olalım
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_moderation')
        .setDescription('Moderasyon panelini açar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🛡️ Moderasyon Kontrol Paneli')
                .setDescription('Aşağıdaki butonları kullanarak moderasyon işlemlerini gerçekleştirebilirsiniz.')
                .addFields(
                    { name: 'Ban Yönetimi', value: 'Sunucudan yasaklanan kullanıcıları listeleyin veya yasaklamaları kaldırın.' },
                    { name: 'Mute Yönetimi', value: 'Susturulan kullanıcıları görüntüleyin ve yönetin.' },
                    { name: 'Uyarı Yönetimi', value: 'Kullanıcı uyarılarını görüntüleyin ve yönetin.' },
                    { name: 'Ceza Sistemi', value: 'Kullanıcıları cezalandırın ve ceza geçmişlerini görüntüleyin.' },
                    { name: 'Log Ayarları', value: 'Moderasyon log kanallarını ayarlayın.' }
                )
                .setFooter({ text: 'Moderasyon Paneli', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Buton stillerini sabit sayısal değerler olarak belirtelim
            // Discord.js v14'te ButtonStyle şu değerleri içerir:
            // Primary = 1, Secondary = 2, Success = 3, Danger = 4, Link = 5
            
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_ban_manage')
                        .setLabel('Ban Yönetimi')
                        .setStyle(4) // ButtonStyle.Danger yerine 4 kullanıyoruz
                        .setEmoji('🔨'),
                    new ButtonBuilder()
                        .setCustomId('mod_mute_manage')
                        .setLabel('Mute Yönetimi')
                        .setStyle(1) // ButtonStyle.Primary yerine 1 kullanıyoruz 
                        .setEmoji('🔇'),
                    new ButtonBuilder()
                        .setCustomId('mod_warning_manage')
                        .setLabel('Uyarı Yönetimi')
                        .setStyle(3) // ButtonStyle.Success yerine 3 kullanıyoruz
                        .setEmoji('⚠️')
                );
                
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_punishment_system')
                        .setLabel('Ceza Sistemi')
                        .setStyle(4) // ButtonStyle.Danger yerine 4 kullanıyoruz
                        .setEmoji('🚓'),
                    new ButtonBuilder()
                        .setCustomId('mod_log_settings')
                        .setLabel('Log Ayarları')
                        .setStyle(3) // ButtonStyle.Success yerine 3 kullanıyoruz
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('panel_main')
                        .setLabel('Ana Panele Dön')
                        .setStyle(2) // ButtonStyle.Secondary yerine 2 kullanıyoruz
                        .setEmoji('🏠')
                );

            // Interaction tipine göre update veya reply kullan
            if (interaction.isButton()) {
                await interaction.update({ embeds: [embed], components: [row1, row2] });
            } else {
                await interaction.reply({ embeds: [embed], components: [row1, row2] });
            }
        } catch (error) {
            console.error('Moderasyon paneli hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Moderasyon paneli açılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};