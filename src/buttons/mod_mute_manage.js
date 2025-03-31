const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    customId: 'mod_mute_manage',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Zaman aşımı uygulanan üyeleri bul
            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const timeoutMembers = members.filter(m => m.communicationDisabledUntilTimestamp !== null);
            
            if (timeoutMembers.size === 0) {
                return interaction.reply({
                    content: 'Bu sunucuda susturulmuş (timeout) kullanıcı bulunmuyor.',
                    ephemeral: true
                });
            }
            
            // Susturulmuş kullanıcılar için bir embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🔇 Susturulmuş Kullanıcılar')
                .setDescription(`Bu sunucuda toplam **${timeoutMembers.size}** susturulmuş kullanıcı bulunuyor.`)
                .setFooter({ text: 'Susturmayı kaldırmak için /unmute komutunu kullanın' })
                .setTimestamp();
            
            // Susturulmuş kullanıcıları listele (ilk 25 kişi)
            let count = 0;
            const muteList = [];
            
            timeoutMembers.forEach(member => {
                if (count < 25) {
                    count++;
                    const timeLeft = Math.floor(member.communicationDisabledUntilTimestamp / 1000);
                    muteList.push(`${count}. <@${member.id}> (${member.user.tag})\n⏱️ Bitiş: <t:${timeLeft}:R>`);
                }
            });
            
            embed.addFields({ name: 'Susturulmuş Kullanıcı Listesi', value: muteList.join('\n\n') || 'Listelenecek susturulmuş kullanıcı yok' });
            
            if (timeoutMembers.size > 25) {
                embed.addFields({ name: 'Not', value: `Toplamda ${timeoutMembers.size} susturulmuş kullanıcı var, sadece ilk 25 gösteriliyor.` });
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
            console.error('Mute yönetimi hatası:', error);
            await interaction.reply({
                content: 'Susturulmuş kullanıcılar listelenirken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};