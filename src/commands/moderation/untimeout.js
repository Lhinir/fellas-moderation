// src/commands/moderation/untimeout.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('susturmaac')
        .setDescription('Bir kullanıcının susturmasını kaldırır')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Susturması kaldırılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Susturmanın kaldırılma sebebi')
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
            
            // Timeout durumunu kontrol et
            if (!targetMember.communicationDisabledUntil) {
                return interaction.reply({
                    content: 'Bu kullanıcı zaten susturulmuş değil!',
                    ephemeral: true
                });
            }
            
            // Susturmayı kaldır - null değeri kaldırma işlemidir
            await targetMember.timeout(null, `${interaction.user.tag} tarafından susturma kaldırıldı: ${reason}`);
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${user.tag}** adlı kullanıcının susturması kaldırıldı.\n**Sebep:** ${reason}`,
                ephemeral: false
            });
            
            // Veritabanına işlemi kaydet
            try {
                await database.modActions.addAction(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    'untimeout',
                    reason,
                    null
                );
            } catch (dbError) {
                console.error('Untimeout işlemi veritabanına kaydedilemedi:', dbError);
            }
            
            // Log gönder
            await sendUntimeoutLogEmbed(interaction, user, reason);

        } catch (error) {
            console.error('Untimeout komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendUntimeoutLogEmbed(interaction, targetUser, reason) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#00e5ff') // Açık mavi
            .setTitle('🔊 Kullanıcı Susturması Kaldırıldı')
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
        console.error('Untimeout log gönderme hatası:', error);
    }
}