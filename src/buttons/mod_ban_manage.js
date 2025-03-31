const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    customId: 'mod_ban_manage',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yasakla yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Sunucudaki yasaklı kullanıcıları al
            const bans = await interaction.guild.bans.fetch();
            
            if (bans.size === 0) {
                return interaction.reply({
                    content: 'Bu sunucuda yasaklı kullanıcı bulunmuyor.',
                    ephemeral: true
                });
            }
            
            // Yasaklı kullanıcılar için bir embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔨 Yasaklı Kullanıcılar')
                .setDescription(`Bu sunucuda toplam **${bans.size}** yasaklı kullanıcı bulunuyor.`)
                .setFooter({ text: 'Yasaklamayı kaldırmak için kullanıcının IDsini /unban komutu ile kullanın' })
                .setTimestamp();
            
            // Yasaklı kullanıcıları listele (ilk 25 kişi)
            const banList = bans.map((ban, index) => {
                if (index < 25) { // Discord embed sınırlaması nedeniyle sadece 25 gösterilecek
                    return `${index + 1}. **${ban.user.tag}** (${ban.user.id})\n📝 Sebep: ${ban.reason || 'Sebep belirtilmedi'}`;
                }
            }).join('\n\n');
            
            embed.addFields({ name: 'Yasaklı Kullanıcı Listesi', value: banList || 'Listelenecek yasaklı kullanıcı yok' });
            
            if (bans.size > 25) {
                embed.addFields({ name: 'Not', value: `Toplamda ${bans.size} yasaklı kullanıcı var, sadece ilk 25 gösteriliyor.` });
            }
            
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
            console.error('Ban yönetimi hatası:', error);
            await interaction.reply({
                content: 'Yasaklı kullanıcılar listelenirken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};