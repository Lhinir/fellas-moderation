// src/commands/moderation/ban.js - Düzeltilmiş

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Yasaklanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Yasaklama sebebi')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Silinecek mesaj günü (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // Önce deferReply kullan - işlem biraz zaman alabilir
        await interaction.deferReply();
        
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.editReply('Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın!');
            }

            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            const days = interaction.options.getInteger('days') || 0;
            
            // Kendisini banlayamasın
            if (user.id === interaction.user.id) {
                return interaction.editReply('Kendinizi banlayamazsınız!');
            }
            
            // Botu banlayamasın
            if (user.id === interaction.client.user.id) {
                return interaction.editReply('Beni banlayamazsın!');
            }
            
            // Kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (targetMember) {
                // Hedef banlanabilir mi kontrol et
                if (!targetMember.bannable) {
                    return interaction.editReply('Bu kullanıcıyı yasaklama yetkim yok veya kullanıcı benden daha yüksek bir role sahip.');
                }

                // Yetkili kendisinden üst rütbeyi banlayamasın
                if (interaction.member.id !== interaction.guild.ownerId) {
                    const executorHighestRole = interaction.member.roles.highest.position;
                    const targetHighestRole = targetMember.roles.highest.position;
                    
                    if (executorHighestRole <= targetHighestRole) {
                        return interaction.editReply('Kendinizle aynı veya daha yüksek role sahip kullanıcıları yasaklayamazsınız.');
                    }
                }
            }
            
            // Kullanıcıyı yasakla
            await interaction.guild.members.ban(user.id, { 
                reason: `${interaction.user.tag} tarafından banlandı: ${reason}`, 
                deleteMessageDays: days 
            });
            
            // Başarılı yanıt
            await interaction.editReply(`**${user.tag}** başarıyla yasaklandı.\n**Sebep:** ${reason}`);
            
            // Veritabanına işlemi kaydet (modActions tablosu varsa)
            try {
                await database.modActions.addAction(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    'ban',
                    reason,
                    null
                );
            } catch (dbError) {
                console.error('Ban işlemi veritabanına kaydedilemedi:', dbError);
            }
            
            // Log gönder
            await sendBanLogEmbed(interaction, user, reason, days);

        } catch (error) {
            console.error('Ban komutu hatası:', error);
            return interaction.editReply('Komut çalıştırılırken bir hata oluştu!');
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendBanLogEmbed(interaction, targetUser, reason, days) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ff0000') // Kırmızı
            .setTitle('🔨 Kullanıcı Yasaklandı')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Silinen Mesaj Günü', value: `${days} gün`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Ban log gönderme hatası:', error);
    }
}