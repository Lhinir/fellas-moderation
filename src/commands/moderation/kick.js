// src/commands/moderation/kick.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('at')
        .setDescription('Belirtilen kullanıcıyı sunucudan atar')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Atılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Atılma sebebi')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısın!',
                    ephemeral: true
                });
            }

            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            
            // Kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!targetMember) {
                return interaction.reply({ 
                    content: 'Bu kullanıcı sunucuda değil!',
                    ephemeral: true
                });
            }
            
            // Kendisini kickleyemesin
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: 'Kendinizi sunucudan atamazsınız!',
                    ephemeral: true
                });
            }
            
            // Botu kickleyemesin
            if (user.id === interaction.client.user.id) {
                return interaction.reply({
                    content: 'Beni sunucudan atamazsın!',
                    ephemeral: true
                });
            }
            
            // Hedef kicklenebilir mi kontrol et
            if (!targetMember.kickable) {
                return interaction.reply({ 
                    content: 'Bu kullanıcıyı atma yetkim yok veya kullanıcı benden daha yüksek bir role sahip.',
                    ephemeral: true
                });
            }

            // Yetkili kendisinden üst rütbeyi kickleyemesin
            if (interaction.member.id !== interaction.guild.ownerId) {
                const executorHighestRole = interaction.member.roles.highest.position;
                const targetHighestRole = targetMember.roles.highest.position;
                
                if (executorHighestRole <= targetHighestRole) {
                    return interaction.reply({ 
                        content: 'Kendinizle aynı veya daha yüksek role sahip kullanıcıları atamazsınız.',
                        ephemeral: true
                    });
                }
            }
            
            // Kullanıcıyı at
            await targetMember.kick(`${interaction.user.tag} tarafından atıldı: ${reason}`);
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** başarıyla sunucudan atıldı.\n**Sebep:** ${reason}`,
                ephemeral: false
            });
            
            // Veritabanına işlemi kaydet (modActions tablosu varsa)
            try {
                await database.modActions.addAction(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    'kick',
                    reason,
                    null
                );
            } catch (dbError) {
                console.error('Kick işlemi veritabanına kaydedilemedi:', dbError);
            }
            
            // Log gönder
            await sendKickLogEmbed(interaction, user, reason);

        } catch (error) {
            console.error('Kick komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendKickLogEmbed(interaction, targetUser, reason) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ff9500') // Turuncu
            .setTitle('👢 Kullanıcı Atıldı')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Kick log gönderme hatası:', error);
    }
}