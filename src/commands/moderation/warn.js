// src/commands/moderation/warn.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Bir kullanıcıyı uyarır')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Uyarılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Uyarı sebebi')
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
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            
            // Hedef kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!targetMember) {
                return interaction.reply({ 
                    content: 'Bu kullanıcı sunucuda bulunamadı.', 
                    ephemeral: true 
                });
            }
            
            // Yetkili kendisini veya kendisinden üst rütbeyi uyaramaz
            if (interaction.member.id !== interaction.guild.ownerId) {
                const executorHighestRole = interaction.member.roles.highest.position;
                const targetHighestRole = targetMember.roles.highest.position;
                
                if (executorHighestRole <= targetHighestRole) {
                    return interaction.reply({ 
                        content: 'Kendinizi veya sizden yüksek/eşit roldeki kullanıcıları uyaramazsınız.', 
                        ephemeral: true 
                    });
                }
            }
            
            // Veritabanına uyarı ekle
            await database.warnings.addWarning(
                interaction.guild.id,
                user.id,
                interaction.user.id,
                reason
            );
            
            // Uyarı sayısını al
            const warningCount = await database.warnings.getWarningCount(interaction.guild.id, user.id);
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** başarıyla uyarıldı. Sebep: ${reason}`, 
                ephemeral: true 
            });
            
            // Kullanıcıya DM göndermeyi dene
            try {
                const warnEmbed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle(`${interaction.guild.name} Sunucusunda Uyarıldınız`)
                    .setDescription(`Bir moderatör tarafından uyarıldınız.`)
                    .addFields(
                        { name: 'Sebep', value: reason, inline: false },
                        { name: 'Moderatör', value: interaction.user.tag, inline: true },
                        { name: 'Uyarı Sayınız', value: `${warningCount}`, inline: true }
                    )
                    .setTimestamp();
                
                await user.send({ embeds: [warnEmbed] }).catch(() => {
                    console.log(`${user.tag} kullanıcısına DM gönderilemedi.`);
                });
            } catch (error) {
                console.error('DM gönderme hatası:', error);
            }
            
            // Log gönder
            await sendWarnLogEmbed(interaction, user, reason, warningCount);

        } catch (error) {
            console.error('Warn komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendWarnLogEmbed(interaction, targetUser, reason, warningCount) {
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
            .setColor('#ffcc00') // Sarı
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Toplam Uyarı', value: `${warningCount}`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Warn log gönderme hatası:', error);
    }
}