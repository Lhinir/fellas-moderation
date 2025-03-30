// src/commands/moderation/timeout.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Bir kullanıcıyı belirli bir süre için susturur')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Susturulacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Susturma süresi (1s, 1m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Susturma sebebi')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!',
                    ephemeral: true
                });
            }

            const user = interaction.options.getUser('user');
            const durationString = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            
            // Süreyi milisaniyeye çevir
            let duration;
            try {
                duration = ms(durationString);
                if (!duration) throw new Error('Geçersiz süre formatı');
                
                // Discord API limiti - maksimum 28 gün
                if (duration > 28 * 24 * 60 * 60 * 1000) {
                    return interaction.reply({ 
                        content: 'Maksimum susturma süresi 28 gündür.',
                        ephemeral: true
                    });
                }
            } catch (error) {
                return interaction.reply({ 
                    content: 'Geçersiz süre formatı! Örnek: 1s, 1m, 1h, 1d',
                    ephemeral: true
                });
            }
            
            // Kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!targetMember) {
                return interaction.reply({ 
                    content: 'Bu kullanıcı sunucuda değil!',
                    ephemeral: true
                });
            }
            
            // Kendisini timeoutlayamasın
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: 'Kendinizi susturamzsınız!',
                    ephemeral: true
                });
            }
            
            // Botu timeoutlayamasın
            if (user.id === interaction.client.user.id) {
                return interaction.reply({
                    content: 'Beni susturamazsın!',
                    ephemeral: true
                });
            }
            
            // Hedef timeoutlanabilir mi kontrol et
            if (!targetMember.moderatable) {
                return interaction.reply({ 
                    content: 'Bu kullanıcıyı susturma yetkim yok veya kullanıcı benden daha yüksek bir role sahip.',
                    ephemeral: true
                });
            }

            // Yetkili kendisinden üst rütbeyi timeoutlayamasın
            if (interaction.member.id !== interaction.guild.ownerId) {
                const executorHighestRole = interaction.member.roles.highest.position;
                const targetHighestRole = targetMember.roles.highest.position;
                
                if (executorHighestRole <= targetHighestRole) {
                    return interaction.reply({ 
                        content: 'Kendinizle aynı veya daha yüksek role sahip kullanıcıları susturamazsınız.',
                        ephemeral: true
                    });
                }
            }
            
            // Okunabilir süre formatı
            const humanReadableDuration = formatDuration(duration);
            
            // Kullanıcıyı sustur
            await targetMember.timeout(duration, `${interaction.user.tag} tarafından susturuldu: ${reason}`);
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** ${humanReadableDuration} süreyle susturuldu.\n**Sebep:** ${reason}`,
                ephemeral: false
            });
            
            // Veritabanına işlemi kaydet
            try {
                await database.modActions.addAction(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    'timeout',
                    reason,
                    durationString
                );
            } catch (dbError) {
                console.error('Timeout işlemi veritabanına kaydedilemedi:', dbError);
            }
            
            // Log gönder
            await sendTimeoutLogEmbed(interaction, user, reason, humanReadableDuration);

        } catch (error) {
            console.error('Timeout komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Süreyi insan tarafından okunabilir formata çevirir
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0) parts.push(`${seconds} saniye`);
    
    return parts.join(' ');
}

// Log mesajı gönderen yardımcı fonksiyon
async function sendTimeoutLogEmbed(interaction, targetUser, reason, duration) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ffbb00') // Amber
            .setTitle('🔇 Kullanıcı Susturuldu')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Süre', value: duration, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Timeout log gönderme hatası:', error);
    }
}