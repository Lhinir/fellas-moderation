// src/commands/moderation/resetspam.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetspam')
        .setDescription('Kullanıcının spam seviyesini sıfırlar')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Spam seviyesi sıfırlanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Sıfırlama sebebi')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.editReply('Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!');
            }

            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            
            // Kullanıcının spam geçmişini kontrol et
            const spamHistory = await database.get(
                'SELECT * FROM spam_history WHERE guild_id = ? AND user_id = ?',
                [interaction.guild.id, user.id]
            );
            
            if (!spamHistory) {
                return interaction.editReply(`**${user.tag}** adlı kullanıcının spam geçmişi bulunamadı.`);
            }
            
            const currentLevel = spamHistory.spam_count;
            
            // Spam seviyesini sıfırla
            await database.run(
                'UPDATE spam_history SET spam_count = 1, reset_after = NULL WHERE guild_id = ? AND user_id = ?',
                [interaction.guild.id, user.id]
            );
            
            // Otomatik uyarıları temizle
            await database.warnings.clearAutomatedWarnings(interaction.guild.id, user.id);
            
            await interaction.editReply(`**${user.tag}** adlı kullanıcının spam seviyesi sıfırlandı. (Önceki seviye: ${currentLevel})`);
            
            // Log gönder
            try {
                const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
                
                if (logChannelId) {
                    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                    
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#00E676')
                            .setTitle('🧹 Spam Seviyesi Sıfırlandı')
                            .addFields(
                                { name: 'Kullanıcı', value: `${user.tag} (${user.id})`, inline: true },
                                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                { name: 'Önceki Seviye', value: `${currentLevel}`, inline: true },
                                { name: 'Sebep', value: reason, inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'AutoMod Spam Koruması' });
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (logError) {
                console.error('Log gönderme hatası:', logError);
            }
        } catch (error) {
            console.error('Reset spam komutu hatası:', error);
            await interaction.editReply('Komut çalıştırılırken bir hata oluştu!');
        }
    }
};