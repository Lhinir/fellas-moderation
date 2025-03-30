// src/commands/moderation/clear.js - Basitleştirilmiş

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        // ... tüm command builder kodu aynı kalır ...
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.editReply({ 
                    content: 'Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın!'
                });
            }

            const amount = interaction.options.getInteger('miktar');
            const channel = interaction.channel;

            // Mesajları sil
            let messages;
            try {
                messages = await channel.bulkDelete(amount, true);
            } catch (deleteError) {
                console.error('Mesaj silme hatası:', deleteError);
                return interaction.editReply({ 
                    content: 'Mesajları silerken bir hata oluştu! 14 günden eski mesajlar silinemez.'
                });
            }

            // Başarılı yanıt
            await interaction.editReply({ 
                content: `${messages.size} mesaj başarıyla silindi!`
            });

            // Log gönder
            try {
                // SQLite'dan log kanalını al
                const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
                
                if (logChannelId) {
                    // Log kanalını bul
                    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                    
                    if (logChannel) {
                        // Embed log mesajı oluştur
                        const logEmbed = new EmbedBuilder()
                            .setColor('#ff9900') // Turuncu
                            .setTitle('⚠️ Mesaj Temizleme Logu')
                            .setDescription(`**${messages.size}** mesaj silindi`)
                            .addFields(
                                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                                { name: 'Kanal', value: `<#${interaction.channel.id}>`, inline: true },
                                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                            )
                            .setFooter({ text: `Moderatör ID: ${interaction.user.id} • Kanal ID: ${interaction.channel.id}` })
                            .setTimestamp();

                        // Logu gönder
                        await logChannel.send({ embeds: [logEmbed] });
                    } else {
                        console.log('Moderasyon log kanalı bulunamadı! ID:', logChannelId);
                    }
                } else {
                    console.log('Bu sunucu için moderasyon log kanalı ayarlanmamış.');
                }
            } catch (logError) {
                console.error('Log işlemi hatası:', logError);
                // Log hataları kullanıcı deneyimini etkilemez
            }

        } catch (error) {
            console.error('Clear komutu hatası:', error);
            return interaction.editReply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!'
            });
        }
    }
};