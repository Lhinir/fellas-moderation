const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'mod_warning_manage',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#ffcc00')
                .setTitle('⚠️ Uyarı Yönetimi')
                .setDescription('Bir kullanıcının uyarılarını görmek için, lütfen aşağıdaki komutları kullanın.')
                .addFields(
                    { name: '💡 Bilgi', value: 'Uyarıları görüntülemek, silmek veya eklemek için komutları kullanabilirsiniz:\n• `/warnings list @user` - Uyarıları listele\n• `/warnings remove @user id` - Belirli uyarıyı sil\n• `/warnings clear @user` - Tüm uyarıları temizle\n• `/warn @user [reason]` - Uyarı ekle' }
                )
                .setFooter({ text: 'Uyarı Yönetimi' })
                .setTimestamp();
            
            // Butonlar
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_panel_back')
                        .setLabel('Panele Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            
            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Uyarı yönetimi hatası:', error);
            await interaction.reply({
                content: 'Uyarı yönetimi paneli açılırken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};