// src/commands/panel/panel_settings.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_server')
        .setDescription('Sunucu bilgilerini görüntüler')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guild = interaction.guild;
            
            // Sunucu bilgilerini topla
            const createdAt = Math.floor(guild.createdTimestamp / 1000);
            const memberCount = guild.memberCount;
            const botCount = guild.members.cache.filter(member => member.user.bot).size;
            const humanCount = memberCount - botCount;
            const channelCount = guild.channels.cache.size;
            const textChannelCount = guild.channels.cache.filter(ch => ch.type === 0).size; // 0 = Text Channel
            const voiceChannelCount = guild.channels.cache.filter(ch => ch.type === 2).size; // 2 = Voice Channel
            const categoryCount = guild.channels.cache.filter(ch => ch.type === 4).size; // 4 = Category
            const roleCount = guild.roles.cache.size;
            const emojiCount = guild.emojis.cache.size;
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostLevel = guild.premiumTier || 0;
            
            // Embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle(`📊 ${guild.name} - Sunucu Bilgileri`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '📆 Oluşturulma Tarihi', value: `<t:${createdAt}:F>`, inline: true },
                    { name: '👑 Sahibi', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '🌟 Boost Seviyesi', value: `Seviye ${boostLevel} (${boostCount} boost)`, inline: true },
                    { name: '👥 Üye Sayısı', value: `Toplam: ${memberCount}\nİnsan: ${humanCount}\nBot: ${botCount}`, inline: true },
                    { name: '📢 Kanallar', value: `Toplam: ${channelCount}\nYazı: ${textChannelCount}\nSes: ${voiceChannelCount}\nKategori: ${categoryCount}`, inline: true },
                    { name: '👮 Rol Sayısı', value: `${roleCount} rol`, inline: true },
                    { name: '😄 Emoji Sayısı', value: `${emojiCount} emoji`, inline: true },
                    { name: '🔐 Doğrulama Seviyesi', value: `${getVerificationLevel(guild.verificationLevel)}`, inline: true },
                    { name: '🔞 İçerik Filtresi', value: `${getContentFilter(guild.explicitContentFilter)}`, inline: true }
                )
                .setFooter({ text: `Sunucu ID: ${guild.id}` })
                .setTimestamp();
            
            // Buton satırı oluştur
            const row = new ActionRowBuilder()
                .addComponents(
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
                    components: [row]
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
            console.error('Sunucu bilgileri hatası:', error);
            
            // Sadece henüz cevap verilmemişse reply kullan
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Sunucu bilgileri görüntülenirken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                // Daha önce cevap verilmişse followUp kullan
                await interaction.followUp({ 
                    content: 'Sunucu bilgileri görüntülenirken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};

// Doğrulama Seviyesi İsimleri
function getVerificationLevel(level) {
    const levels = {
        0: 'Yok (None)',
        1: 'Düşük (Low)',
        2: 'Orta (Medium)',
        3: 'Yüksek (High)',
        4: 'Çok Yüksek (Very High)'
    };
    
    return levels[level] || 'Bilinmiyor';
}

// İçerik Filtresi İsimleri
function getContentFilter(filter) {
    const filters = {
        0: 'Filtreleme Yok',
        1: 'Rolü Olmayan Üyeler İçin',
        2: 'Tüm Üyeler İçin'
    };
    
    return filters[filter] || 'Bilinmiyor';
}