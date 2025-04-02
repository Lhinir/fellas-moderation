// src/buttons/panel_logs.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'panel_logs',
    async execute(interaction) {
        // Mevcut log kanallarını al
        const logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
        
        // Log türlerini anlaşılır isimlerle eşleştir
        const logTypeNames = {
            'moderation': 'Moderasyon Logları',
            'server': 'Sunucu Logları',
            'message': 'Mesaj Logları',
            'member': 'Üye Logları',
            'voice': 'Ses Logları'
        };
        
        // Her log türü için durum metni oluştur
        const logStatus = {};
        
        for (const type in logTypeNames) {
            const channel = logChannels?.find(log => log.type === type);
            logStatus[type] = channel ? `<#${channel.channel_id}>` : 'Ayarlanmamış';
        }
        
        // Log paneli
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📋 Log Ayarları')
            .setDescription('Log kanallarını yapılandırın:')
            .addFields(
                { name: 'Moderasyon Logları', value: logStatus.moderation, inline: true },
                { name: 'Sunucu Logları', value: logStatus.server, inline: true },
                { name: 'Mesaj Logları', value: logStatus.message, inline: true },
                { name: 'Üye Logları', value: logStatus.member, inline: true },
                { name: 'Ses Logları', value: logStatus.voice, inline: true }
            );
            
        // Log seçim menüsü
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('logs_select')
            .setPlaceholder('Ayarlamak istediğiniz log kanalını seçin')
            .addOptions([
                {
                    label: 'Moderasyon Logları',
                    description: 'Ban, kick, mute gibi moderasyon işlemleri',
                    value: 'moderation',
                    emoji: '🔨'
                },
                {
                    label: 'Sunucu Logları',
                    description: 'Kanal, rol, emoji değişiklikleri',
                    value: 'server',
                    emoji: '🏢'
                },
                {
                    label: 'Mesaj Logları',
                    description: 'Silinen ve düzenlenen mesajlar',
                    value: 'message',
                    emoji: '💬'
                },
                {
                    label: 'Üye Logları',
                    description: 'Sunucuya katılma, ayrılma, yasaklama',
                    value: 'member',
                    emoji: '👥'
                },
                {
                    label: 'Ses Logları',
                    description: 'Ses kanalı hareketleri',
                    value: 'voice',
                    emoji: '🔊'
                }
            ]);
            
        const row1 = new ActionRowBuilder()
            .addComponents(selectMenu);
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_settings')
                    .setLabel('Ana Panele Dön')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
            );
            
        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
};