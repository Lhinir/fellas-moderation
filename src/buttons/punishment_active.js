// src/buttons/punishment_active.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'punishment_active',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Aktif cezaları getir
            const activePunishments = await database.punishments.getActivePunishments(interaction.guild.id);
            
            if (!activePunishments || activePunishments.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🚓 Aktif Cezalar')
                    .setDescription('Sunucuda aktif ceza bulunmuyor.')
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
                
                return interaction.editReply({ embeds: [embed], components: [row] });
            }
            
            // Aktif cezaları göster
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🚓 Aktif Cezalar')
                .setDescription(`Sunucuda toplam **${activePunishments.length}** aktif ceza bulunuyor.`)
                .setFooter({ text: 'Ceza Sistemi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            // Cezaları listele (en fazla 10 tane)
            for (let i = 0; i < Math.min(activePunishments.length, 10); i++) {
                const punishment = activePunishments[i];
                const user = await interaction.client.users.fetch(punishment.user_id).catch(() => ({ tag: 'Bilinmeyen Kullanıcı', id: punishment.user_id }));
                const moderator = await interaction.client.users.fetch(punishment.moderator_id).catch(() => ({ tag: 'Bilinmeyen Yetkili', id: punishment.moderator_id }));
                
                let endTimeText = 'Süresiz';
                if (punishment.end_time) {
                    const endTime = new Date(punishment.end_time);
                    endTimeText = `<t:${Math.floor(endTime.getTime() / 1000)}:R>`;
                }
                
                let typeText = 'Ceza';
                switch (punishment.type) {
                    case 'ban': typeText = '🔨 Ban'; break;
                    case 'tempban': typeText = '⏱️ Geçici Ban'; break;
                    case 'mute': typeText = '🔇 Susturma'; break;
                    case 'jail': typeText = '🔒 Hapis'; break;
                    default: typeText = `⚠️ ${punishment.type}`;
                }
                
                embed.addFields({
                    name: `${typeText} - ${user.tag || `ID: ${user.id}`}`,
                    value: `**Sebep:** ${punishment.reason}\n**Yetkili:** ${moderator.tag || `ID: ${moderator.id}`}\n**Bitiş:** ${endTimeText}\n**ID:** \`${punishment.id}\``
                });
            }
            
            // Eğer daha fazla ceza varsa not ekle
            if (activePunishments.length > 10) {
                embed.addFields({
                    name: 'Not',
                    value: `Toplam ${activePunishments.length} aktif ceza var, sadece ilk 10 tanesi gösteriliyor.`
                });
            }
            
            // Butonlar
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('punishment_remove')
                        .setLabel('Ceza Kaldır')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('mod_punishment_system')
                        .setLabel('Ceza Sistemine Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            
            await interaction.editReply({ embeds: [embed], components: [row] });
            
        } catch (error) {
            console.error('Aktif cezalar görüntüleme hatası:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'Aktif cezalar görüntülenirken bir hata oluştu.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Aktif cezalar görüntülenirken bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};