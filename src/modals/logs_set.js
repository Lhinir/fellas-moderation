// src/modals/logs_set.js

const { EmbedBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: /^logs_set_(.+)$/,
    async execute(interaction) {
        // Modal'dan kanal ID'sini al
        let channelId = interaction.fields.getTextInputValue('channel_id').trim();
        
        // # ile başlıyorsa ID'yi çıkar
        if (channelId.startsWith('<#') && channelId.endsWith('>')) {
            channelId = channelId.slice(2, -1);
        }
        
        // Log türünü customId'den çıkar
        const logType = interaction.customId.match(/^logs_set_(.+)$/)[1];
        
        // Log türlerine göre anlaşılır isimler
        const logTypeNames = {
            'moderation': 'Moderasyon Logları',
            'server': 'Sunucu Logları',
            'message': 'Mesaj Logları',
            'member': 'Üye Logları',
            'voice': 'Ses Logları'
        };
        
        try {
            // Kanalın var olup olmadığını kontrol et
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            
            if (!channel) {
                return interaction.reply({
                    content: `❌ Geçersiz kanal ID'si! Lütfen geçerli bir kanal ID'si girin.`,
                    ephemeral: true
                });
            }
            
            // Kanalın metin kanalı olup olmadığını kontrol et
            if (!channel.isTextBased() || channel.isDMBased()) {
                return interaction.reply({
                    content: `❌ <#${channelId}> bir metin kanalı değil! Lütfen geçerli bir metin kanalı seçin.`,
                    ephemeral: true
                });
            }
            
            // Kanalı veritabanına kaydet
            await database.logs.setLogChannel(interaction.guild.id, logType, channelId);
            
            // Başarılı yanıt
            await interaction.reply({
                content: `✅ ${logTypeNames[logType]} kanalı <#${channelId}> olarak ayarlandı.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Log kanalı ayarlama hatası:', error);
            await interaction.reply({
                content: `❌ Log kanalı ayarlanırken bir hata oluştu: ${error.message}`,
                ephemeral: true
            });
        }
    }
};