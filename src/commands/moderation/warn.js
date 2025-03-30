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
            
            // Kullanıcıyı kontrol et
            const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!targetMember) {
                return interaction.reply({ 
                    content: 'Bu kullanıcı sunucuda değil!',
                    ephemeral: true
                });
            }
            
            // Kendini uyaramasın
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: 'Kendinizi uyaramazsınız!',
                    ephemeral: true
                });
            }
            
            // Botu uyaramasın
            if (user.id === interaction.client.user.id) {
                return interaction.reply({
                    content: 'Beni uyaramazsın!',
                    ephemeral: true
                });
            }
            
            // Yetkili kendisinden üst rütbeyi uyaramasın
            if (interaction.member.id !== interaction.guild.ownerId) {
                const executorHighestRole = interaction.member.roles.highest.position;
                const targetHighestRole = targetMember.roles.highest.position;
                
                if (executorHighestRole <= targetHighestRole) {
                    return interaction.reply({ 
                        content: 'Kendinizle aynı veya daha yüksek role sahip kullanıcıları uyaramazsınız.',
                        ephemeral: true
                    });
                }
            }
            
            // Veritabanında uyarı oluştur
            let warnId;
            try {
                warnId = await database.warnings.addWarning(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    reason
                );
            } catch (dbError) {
                console.error('Uyarı veritabanına kaydedilemedi:', dbError);
                return interaction.reply({
                    content: 'Uyarı kaydedilemedi! Lütfen daha sonra tekrar deneyin.',
                    ephemeral: true
                });
            }
            
            // Uyarı sayısını al
            const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
            const warningCount = warnings ? warnings.length : 1;
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** uyarıldı (${warningCount}. uyarı).\n**Sebep:** ${reason}`,
                ephemeral: false
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
            } catch (dmError) {
                console.error('DM gönderme hatası:', dmError);
            }
            
            // Log gönder
            await sendWarnLogEmbed(interaction, user, reason, warningCount, warnId);

        } catch (error) {
            console.error('Warn komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendWarnLogEmbed(interaction, targetUser, reason, warningCount, warnId) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ffcc00') // Sarı
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Uyarı ID', value: `#${warnId}`, inline: true },
                { name: 'Toplam Uyarı', value: `${warningCount}`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Warn log gönderme hatası:', error);
    }
}