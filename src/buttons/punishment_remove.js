// src/buttons/punishment_remove.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'punishment_remove',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Ceza ID'si sormak için modal oluştur
            const modal = new ModalBuilder()
                .setCustomId('punishment_remove_modal')
                .setTitle('Ceza Kaldır');
            
            const punishmentIdInput = new TextInputBuilder()
                .setCustomId('punishmentId')
                .setLabel('Ceza ID')
                .setPlaceholder('Kaldırmak istediğiniz cezanın ID numarası')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            // Modal'a input'u ekle
            const firstActionRow = new ActionRowBuilder().addComponents(punishmentIdInput);
            modal.addComponents(firstActionRow);
            
            // Modal'ı göster
            await interaction.showModal(modal);
            
            // Modal'dan yanıt bekle
            const filter = (i) => i.customId === 'punishment_remove_modal' && i.user.id === interaction.user.id;
            
            const modalResponse = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(() => null);
            
            if (!modalResponse) return; // Kullanıcı modal'ı iptal etti veya süre doldu
            
            await modalResponse.deferReply({ ephemeral: true });
            
            const punishmentId = modalResponse.fields.getTextInputValue('punishmentId');
            
            // Cezayı kontrol et
            const punishment = await database.punishments.getPunishment(punishmentId, interaction.guild.id);
            
            if (!punishment) {
                return modalResponse.editReply({ content: 'Belirtilen ID\'ye sahip bir ceza bulunamadı.' });
            }
            
            if (!punishment.active) {
                return modalResponse.editReply({ content: 'Bu ceza zaten kaldırılmış veya süresi dolmuş.' });
            }
            
            // Kullanıcıyı kontrol et
            const user = await interaction.client.users.fetch(punishment.user_id).catch(() => null);
            
            if (!user) {
                return modalResponse.editReply({ content: 'Cezası kaldırılacak kullanıcı bulunamadı.' });
            }
            
            // Cezayı kaldır
            try {
                // Ceza tipine göre işlem yap
                switch (punishment.type) {
                    case 'ban':
                    case 'tempban':
                        await interaction.guild.members.unban(user.id, 'Ceza kaldırıldı').catch(err => {
                            console.error('Yasak kaldırma hatası:', err);
                            // Hata olsa bile işleme devam et, veritabanında güncelleme yapılsın
                        });
                        break;
                        
                    case 'mute':
                        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                        if (member) {
                            await member.timeout(null, 'Ceza kaldırıldı').catch(err => {
                                console.error('Susturma kaldırma hatası:', err);
                                // Hata olsa bile işleme devam et, veritabanında güncelleme yapılsın
                            });
                        }
                        break;
                }
                
                // Veritabanında cezayı kaldır
                await database.punishments.removePunishment(punishmentId, interaction.guild.id);
                
                // Başarılı mesajı
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Ceza Kaldırıldı')
                    .setDescription(`**${user.tag}** kullanıcısının **#${punishmentId}** numaralı cezası başarıyla kaldırıldı.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                        { name: 'Ceza Türü', value: getPunishmentTypeName(punishment.type), inline: true },
                        { name: 'Kaldıran Yetkili', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false }
                    )
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
                
                await modalResponse.editReply({ embeds: [embed], components: [row] });
                
                // Log kanalına bildir
                await sendPunishmentRemoveLog(modalResponse, punishment, user);
                
            } catch (error) {
                console.error('Ceza kaldırma hatası:', error);
                await modalResponse.editReply({ content: 'Ceza kaldırılırken bir hata oluştu: ' + error.message });
            }
            
        } catch (error) {
            console.error('Ceza kaldırma işlemi hatası:', error);
            if (interaction.isModalSubmit()) {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: 'Ceza kaldırılırken bir hata oluştu.',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'Ceza kaldırılırken bir hata oluştu.',
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: 'Ceza kaldırma işlemi sırasında bir hata oluştu.',
                    ephemeral: true
                });
            }
        }
    }
};

// Ceza türünün görünen adını döndürme
function getPunishmentTypeName(type) {
    switch (type) {
        case 'ban': return '🔨 Ban';
        case 'tempban': return '⏱️ Geçici Ban';
        case 'mute': return '🔇 Susturma';
        case 'warn': return '⚠️ Uyarı';
        default: return type;
    }
}

// Log kanalına ceza kaldırma bilgisini gönderme
async function sendPunishmentRemoveLog(interaction, punishment, user) {
    try {
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Log embed'i oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`${getPunishmentTypeName(punishment.type)} | Ceza Kaldırıldı`)
            .setDescription(`**${user.tag}** kullanıcısının cezası kaldırıldı.`)
            .addFields(
                { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                { name: 'Yetkili', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Ceza ID', value: `#${punishment.id}`, inline: true },
                { name: 'Ceza Türü', value: getPunishmentTypeName(punishment.type), inline: true },
                { name: 'Ceza Sebebi', value: punishment.reason || 'Sebep belirtilmemiş', inline: false }
            )
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: `Kullanıcı ID: ${user.id}` })
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Ceza kaldırma log gönderme hatası:', error);
    }
}