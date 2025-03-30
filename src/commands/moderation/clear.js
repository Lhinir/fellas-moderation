// src/commands/moderation/clear.js - Basitleştirilmiş

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler')
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        // DİREKT YANIT VER - DeferReply KULLANMA
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ 
                content: 'Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın!',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('miktar');
        const channel = interaction.channel;

        try {
            // Mesajları sil
            const messages = await channel.bulkDelete(amount, true);
            
            // HEMEN yanıt ver - ASLA await kullanma
            interaction.reply({ 
                content: `${messages.size} mesaj başarıyla silindi!`,
                ephemeral: true
            });
            
            // Log gönderme (arka planda)
            sendLog(interaction, messages.size).catch(error => {
                console.error('Log gönderme hatası:', error);
            });
            
        } catch (error) {
            console.error('Mesaj silme hatası:', error);
            
            // Yanıt ver - ama eğer zaten yanıtladıysan, hata ver
            if (!interaction.replied) {
                interaction.reply({ 
                    content: 'Mesajları silerken bir hata oluştu! 14 günden eski mesajlar silinemez.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
};

// Log gönderen yardımcı fonksiyon - async olduğu için ana akışı engellemiyor
async function sendLog(interaction, messageCount) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
        if (!logChannelId) return;
        
        // Log kanalını bul
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Embed oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ff9900') 
            .setTitle('⚠️ Mesaj Temizleme Logu')
            .setDescription(`**${messageCount}** mesaj silindi`)
            .addFields(
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Kanal', value: `<#${interaction.channel.id}>`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Moderatör ID: ${interaction.user.id} • Kanal ID: ${interaction.channel.id}` })
            .setTimestamp();

        // Log gönder
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Log gönderme hatası:', error);
    }
}