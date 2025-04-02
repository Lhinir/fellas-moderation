// src/buttons/punishment_history.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'punishment_history',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Kullanıcı ID'si sormak için modal oluştur
            const modal = new ModalBuilder()
                .setCustomId('punishment_history_modal')
                .setTitle('Ceza Geçmişi Sorgula');
            
            const userIdInput = new TextInputBuilder()
                .setCustomId('userId')
                .setLabel('Kullanıcı ID')
                .setPlaceholder('Ceza geçmişini görmek istediğiniz kullanıcının ID\'si')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            // Modal'a input'u ekle
            const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
            modal.addComponents(firstActionRow);
            
            // Modal'ı göster
            await interaction.showModal(modal);
            
            // Modal'dan yanıt bekle
            const filter = (i) => i.customId === 'punishment_history_modal' && i.user.id === interaction.user.id;
            
            const modalResponse = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(() => null);
            
            if (!modalResponse) return; // Kullanıcı modal'ı iptal etti veya süre doldu
            
            await modalResponse.deferReply({ ephemeral: true });
            
            const userId = modalResponse.fields.getTextInputValue('userId');
            
            // Kullanıcının varlığını kontrol et
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            
            if (!user) {
                return modalResponse.editReply({ content: 'Geçerli bir kullanıcı ID\'si girmelisiniz.' });
            }
            
            // Ceza geçmişini getir
            const punishmentHistory = await database.punishments.getUserPunishmentHistory(interaction.guild.id, userId);
            
            if (!punishmentHistory || punishmentHistory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`🚓 ${user.tag} - Ceza Geçmişi`)
                    .setDescription('Bu kullanıcının ceza geçmişi bulunmuyor.')
                    .setThumbnail(user.displayAvatarURL())
                    .setFooter({ text: 'Ceza Sistemi', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('mod_punishment_system')
                            .setLabel('Ceza Sistemine Dön')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                
                return modalResponse.editReply({ embeds: [embed], components: [row] });
            }
            
            // Ceza geçmişini göster
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle(`🚓 ${user.tag} - Ceza Geçmişi`)
                .setDescription(`Bu kullanıcının toplam **${punishmentHistory.length}** ceza kaydı bulunuyor.`)
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: 'Ceza Sistemi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            // Cezaları listele (en fazla 10 tane)
            for (let i = 0; i < Math.min(punishmentHistory.length, 10); i++) {
                const punishment = punishmentHistory[i];
                const moderator = await interaction.client.users.fetch(punishment.moderator_id).catch(() => ({ tag: 'Bilinmeyen Yetkili', id: punishment.moderator_id }));
                
                let endTimeText = 'Süresiz';
                if (punishment.end_time) {
                    const endTime = new Date(Number(punishment.end_time));
                    endTimeText = `<t:${Math.floor(endTime.getTime() / 1000)}:f>`;
                }
                
                let typeText = 'Ceza';
                switch (punishment.type) {
                    case 'ban': typeText = '🔨 Ban'; break;
                    case 'tempban': typeText = '⏱️ Geçici Ban'; break;
                    case 'mute': typeText = '🔇 Susturma'; break;
                    case 'jail': typeText = '🔒 Hapis'; break;
                    default: typeText = `⚠️ ${punishment.type}`;
                }
                
                const createdAt = new Date(punishment.created_at);
                const statusEmoji = punishment.active ? '🟢' : '🔴';
                const statusText = punishment.active ? 'Aktif' : 'Sona Erdi';
                
                embed.addFields({
                    name: `${statusEmoji} ${typeText} (#${punishment.id}) - <t:${Math.floor(createdAt.getTime() / 1000)}:f>`,
                    value: `**Sebep:** ${punishment.reason}\n**Yetkili:** ${moderator.tag || `ID: ${moderator.id}`}\n**Durum:** ${statusText}${punishment.end_time ? `\n**Bitiş:** ${endTimeText}` : ''}`
                });
            }
            
            // Eğer daha fazla ceza varsa not ekle
            if (punishmentHistory.length > 10) {
                embed.addFields({
                    name: 'Not',
                    value: `Toplam ${punishmentHistory.length} ceza kaydı var, sadece son 10 tanesi gösteriliyor.`
                });
            }
            
            // Butonlar
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_punishment_system')
                        .setLabel('Ceza Sistemine Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            
            await modalResponse.editReply({ embeds: [embed], components: [row] });
            
        } catch (error) {
            console.error('Ceza geçmişi görüntüleme hatası:', error);
            
            if (interaction.isModalSubmit()) {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: 'Ceza geçmişi görüntülenirken bir hata oluştu.',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'Ceza geçmişi görüntülenirken bir hata oluştu.',
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: 'Ceza geçmişi görüntülenirken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};