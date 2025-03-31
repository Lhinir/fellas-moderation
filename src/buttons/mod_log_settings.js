// src/buttons/mod_log_settings.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

// Discord.js ButtonStyle enum değerleri yerine doğrudan sayısal değerleri kullanmak
const ButtonStyle = {
    PRIMARY: 1,   // Mavi
    SECONDARY: 2, // Gri
    SUCCESS: 3,   // Yeşil
    DANGER: 4,    // Kırmızı
    LINK: 5       // URL Link
};

module.exports = {
    customId: 'mod_log_settings',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Yönetici yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Mevcut log ayarlarını getir
            const database = require('../modules/database');
            let logChannels = [];
            
            try {
                logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
            } catch (dbError) {
                console.error('Log kanalları getirme hatası:', dbError);
                // Hata durumunda boş array ile devam et
            }
            
            // Embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('📋 Log Ayarları')
                .setDescription('Log kanallarını ayarlamak için `/logs set` komutunu kullanabilirsiniz.')
                .setFooter({ text: 'Log Ayarları' })
                .setTimestamp();
            
            // Mevcut log kanallarını göster
            if (logChannels && logChannels.length > 0) {
                const channelList = logChannels.map(log => {
                    return `**${log.type}**: <#${log.channel_id}>`;
                }).join('\n');
                
                embed.addFields({ name: 'Mevcut Log Kanalları', value: channelList });
            } else {
                embed.addFields({ name: 'Mevcut Log Kanalları', value: 'Henüz ayarlanmış log kanalı bulunmuyor.' });
            }
            
            // Kullanım bilgisi ekle
            embed.addFields(
                { name: '💡 Komutlar', value: '• `/logs set <type> <channel>` - Log kanalı ayarla\n• `/logs view` - Log kanallarını görüntüle\n• `/logs delete <type>` - Log kanalını kaldır' }
            );
            
            // Butonlar
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_panel_back')
                        .setLabel('Panele Dön')
                        .setStyle(ButtonStyle.SECONDARY) // Sayısal değer 2
                        .setEmoji('⬅️')
                );
            
            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Log ayarları hatası:', error);
            await interaction.reply({
                content: 'Log ayarları görüntülenirken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};