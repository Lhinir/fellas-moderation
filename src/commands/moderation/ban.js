// src/commands/moderation/ban.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı yasaklar')
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
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın!', 
                    ephemeral: true 
                });
            }

            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            const days = interaction.options.getInteger('days') || 0;
            
            // Hedef kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (targetMember) {
                // Hedef banlanabilir mi kontrol et
                if (!targetMember.bannable) {
                    return interaction.reply({ 
                        content: 'Bu kullanıcıyı yasaklama yetkim yok veya kullanıcı benden daha yüksek bir role sahip.', 
                        ephemeral: true 
                    });
                }

                // Yetkili kendisini veya kendisinden üst rütbeyi banlayamaz
                if (interaction.member.id !== interaction.guild.ownerId) {
                    const executorHighestRole = interaction.member.roles.highest.position;
                    const targetHighestRole = targetMember.roles.highest.position;
                    
                    if (executorHighestRole <= targetHighestRole) {
                        return interaction.reply({ 
                            content: 'Kendinizi veya sizden yüksek/eşit roldeki kullanıcıları yasaklayamazsınız.', 
                            ephemeral: true 
                        });
                    }
                }
            }
            
            // Kullanıcıyı yasakla
            await interaction.guild.members.ban(user.id, { reason: reason, deleteMessageDays: days });
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** başarıyla yasaklandı. Sebep: ${reason}`, 
                ephemeral: true 
            });
            
            // Veritabanına kaydet
            await database.modActions.addAction(
                interaction.guild.id,
                user.id,
                interaction.user.id,
                'ban',
                reason,
                null // Süresiz
            );
            
            // Log gönder
            await sendBanLogEmbed(interaction, user, reason, days);

        } catch (error) {
            console.error('Ban komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendBanLogEmbed(interaction, targetUser, reason, days) {
    try {
        const guild = interaction.guild;
        
        // SQLite'dan log kanalını al
        const logChannelId = await database.logs.getLogChannel(guild.id, 'moderation');
        
        if (!logChannelId) {
            console.log('Bu sunucu için moderasyon log kanalı ayarlanmamış.');
            return;
        }
        
        // Log kanalını bul
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) {
            console.error('Moderasyon log kanalı bulunamadı! ID:', logChannelId);
            return;
        }

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ff0000') // Kırmızı
            .setTitle('🔨 Kullanıcı Yasaklandı')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Silinen Mesaj Günü', value: `${days} gün`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Ban log gönderme hatası:', error);
    }
}