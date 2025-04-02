// src/buttons/mod_panel_back.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    customId: 'mod_panel_back',
    
    async execute(interaction) {
        try {
            // Moderasyon paneline yönlendir
            const panelModeration = interaction.client.commands.get('panel_moderation');
            
            if (panelModeration) {
                await panelModeration.execute(interaction);
            } else {
                // Eğer panel_moderation komutu bulunamazsa, varsayılan moderasyon paneli görüntüle
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
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔨'),
                        new ButtonBuilder()
                            .setCustomId('mod_mute_manage')
                            .setLabel('Mute Yönetimi')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🔇'),
                        new ButtonBuilder()
                            .setCustomId('mod_warning_manage')
                            .setLabel('Uyarı Yönetimi')
                            .setStyle(ButtonStyle.Warning)
                            .setEmoji('⚠️')
                    );
                    
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('mod_punishment_system')
                            .setLabel('Ceza Sistemi')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🚓'),
                        new ButtonBuilder()
                            .setCustomId('mod_log_settings')
                            .setLabel('Log Ayarları')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('📋'),
                        new ButtonBuilder()
                            .setCustomId('panel_main')
                            .setLabel('Ana Panele Dön')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🏠')
                    );

                await interaction.update({ embeds: [embed], components: [row1, row2] });
            }
        } catch (error) {
            console.error('Moderasyon paneline dönüş hatası:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Moderasyon paneline dönülürken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};