// src/commands/moderation/unban.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Yasaklı bir kullanıcının yasağını kaldırır')
        .addStringOption(option => 
            option.setName('userid')
                .setDescription('Yasağı kaldırılacak kullanıcının ID\'si')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Yasağın kaldırılma sebebi')
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

            const userId = interaction.options.getString('userid');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            
            // Geçerli bir ID mi kontrol et
            if (!/^\d{17,19}$/.test(userId)) {
                return interaction.reply({ 
                    content: 'Geçersiz kullanıcı ID\'si. Lütfen geçerli bir Discord kullanıcı ID\'si girin.',
                    ephemeral: true
                });
            }
            
            // Ban listesini kontrol et
            const banList = await interaction.guild.bans.fetch().catch(error => {
                console.error('Ban listesi alınamadı:', error);
                return null;
            });
            
            if (!banList) {
                return interaction.reply({
                    content: 'Ban listesi alınırken bir hata oluştu!',
                    ephemeral: true
                });
            }
            
            const bannedUser = banList.get(userId);
            
            if (!bannedUser) {
                return interaction.reply({
                    content: 'Bu kullanıcı sunucuda yasaklı değil!',
                    ephemeral: true
                });
            }
            
            // Yasağı kaldır
            await interaction.guild.members.unban(userId, `${interaction.user.tag} tarafından yasak kaldırıldı: ${reason}`);
            
            // Başarılı yanıt
            await interaction.reply({ 
                content: `**${bannedUser.user.tag}** (${userId}) adlı kullanıcının yasağı kaldırıldı.\n**Sebep:** ${reason}`,
                ephemeral: false
            });
            
            // Veritabanına işlemi kaydet
            try {
                await database.modActions.addAction(
                    interaction.guild.id,
                    userId,
                    interaction.user.id,
                    'unban',
                    reason,
                    null
                );
            } catch (dbError) {
                console.error('Unban işlemi veritabanına kaydedilemedi:', dbError);
            }
            
            // Log gönder
            await sendUnbanLogEmbed(interaction, bannedUser.user, reason);

        } catch (error) {
            console.error('Unban komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendUnbanLogEmbed(interaction, targetUser, reason) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#00e676') // Yeşil
            .setTitle('🔓 Kullanıcı Yasağı Kaldırıldı')
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
        console.error('Unban log gönderme hatası:', error);
    }
}