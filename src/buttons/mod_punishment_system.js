// src/buttons/mod_punishment_system.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'mod_punishment_system',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Ceza sistemi ana embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🚓 Ceza Sistemi')
                .setDescription('Sunucunuzdaki cezaları yönetmek için aşağıdaki seçenekleri kullanabilirsiniz.')
                .addFields(
                    { name: 'Aktif Cezalar', value: 'Sunucuda şu anda aktif olan cezaları görüntüleyin.' },
                    { name: 'Ceza Geçmişi', value: 'Bir kullanıcının ceza geçmişini görüntüleyin.' },
                    { name: 'Ceza Ver', value: 'Bir kullanıcıya ceza verin (ban, mute, vb.).' },
                    { name: 'Ceza Kaldır', value: 'Aktif bir cezayı kaldırın.' }
                )
                .setFooter({ text: 'Ceza Sistemi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            // Kullanım bilgisi ekle
            embed.addFields({
                name: '💡 Kullanım',
                value: 'Slash komutlarıyla da ceza işlemleri yapabilirsiniz:\n• `/ban` - Kalıcı yasak\n• `/tempban` - Geçici yasak\n• `/mute` - Susturma\n• `/unmute` - Susturma kaldırma\n• `/warn` - Uyarı'
            });
            
            // Ana butonlar
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('punishment_active')
                        .setLabel('Aktif Cezalar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚠️'),
                    new ButtonBuilder()
                        .setCustomId('punishment_history')
                        .setLabel('Ceza Geçmişi')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('punishment_give')
                        .setLabel('Ceza Ver')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('➕')
                );
            
            // Geri dön butonu
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_panel_back')
                        .setLabel('Panele Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            
            await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
            
        } catch (error) {
            console.error('Ceza sistemi hatası:', error);
            await interaction.reply({
                content: 'Ceza sistemi açılırken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};