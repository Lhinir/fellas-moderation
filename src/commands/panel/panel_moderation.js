// src/commands/panel/panel_moderation.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

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

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_ban_manage')
                        .setLabel('Ban Yönetimi')
                        .setStyle(4) // Danger
                        .setEmoji('🔨'),
                    new ButtonBuilder()
                        .setCustomId('mod_mute_manage')
                        .setLabel('Mute Yönetimi')
                        .setStyle(1) // Primary
                        .setEmoji('🔇'),
                    new ButtonBuilder()
                        .setCustomId('mod_warning_manage')
                        .setLabel('Uyarı Yönetimi')
                        .setStyle(3) // Success
                        .setEmoji('⚠️')
                );
                
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_punishment_system')
                        .setLabel('Ceza Sistemi')
                        .setStyle(4) // Danger
                        .setEmoji('🚓'),
                    new ButtonBuilder()
                        .setCustomId('mod_log_settings')
                        .setLabel('Log Ayarları')
                        .setStyle(3) // Success
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('panel_main')
                        .setLabel('Ana Panele Dön')
                        .setStyle(2) // Secondary
                        .setEmoji('🏠')
                );

            // Interaction tipine göre doğru yöntemi kullan
            if (interaction.isButton()) {
                // Buton için update kullan
                await interaction.update({ 
                    embeds: [embed], 
                    components: [row1, row2]  // row yerine row1, row2 kullan
                });
            } else if (!interaction.replied && !interaction.deferred) {
                // Slash komut için ve henüz cevap verilmemişse reply kullan
                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row1, row2],  // row yerine row1, row2 kullan
                    ephemeral: true
                });
            } else {
                // Daha önce deferred veya replied ise followUp kullan
                await interaction.followUp({ 
                    embeds: [embed], 
                    components: [row1, row2],  // row yerine row1, row2 kullan
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Moderasyon paneli hatası:', error);
            
            // Sadece henüz cevap verilmemişse reply kullan
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Moderasyon paneli açılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                // Daha önce cevap verilmişse followUp kullan
                await interaction.followUp({ 
                    content: 'Moderasyon paneli açılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};