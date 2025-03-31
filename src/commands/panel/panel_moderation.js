// src/commands/panel/panel_moderation.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

// Discord.js ButtonStyle enum değerleri yerine doğrudan sayısal değerleri kullanmak
const ButtonStyle = {
    PRIMARY: 1,   // Mavi
    SECONDARY: 2, // Gri
    SUCCESS: 3,   // Yeşil
    DANGER: 4,    // Kırmızı
    LINK: 5       // URL Link
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modpanel')
        .setDescription('Moderasyon panelini açar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🛡️ Moderasyon Kontrol Paneli')
            .setDescription('Aşağıdaki butonları kullanarak moderasyon işlemlerini gerçekleştirebilirsiniz.')
            .addFields(
                { name: 'Ban Yönetimi', value: 'Sunucudan yasaklanan kullanıcıları listeleyin veya yasaklamaları kaldırın.' },
                { name: 'Mute Yönetimi', value: 'Susturulan kullanıcıları görüntüleyin ve yönetin.' },
                { name: 'Uyarı Yönetimi', value: 'Kullanıcı uyarılarını görüntüleyin ve yönetin.' },
                { name: 'Log Ayarları', value: 'Moderasyon log kanallarını ayarlayın.' }
            )
            .setFooter({ text: 'Moderasyon Paneli', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mod_ban_manage')
                    .setLabel('Ban Yönetimi')
                    .setStyle(ButtonStyle.DANGER) // Sayısal değer 4
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('mod_mute_manage')
                    .setLabel('Mute Yönetimi')
                    .setStyle(ButtonStyle.PRIMARY) // Sayısal değer 1
                    .setEmoji('🔇'),
                new ButtonBuilder()
                    .setCustomId('mod_warning_manage')
                    .setLabel('Uyarı Yönetimi')
                    .setStyle(ButtonStyle.SUCCESS) // Sayısal değer 3
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId('mod_log_settings')
                    .setLabel('Log Ayarları')
                    .setStyle(ButtonStyle.SUCCESS) // Sayısal değer 3
                    .setEmoji('📋')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};