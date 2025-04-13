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
                .setRequired(false))
        .addStringOption(option => 
            option.setName('userid')
                .setDescription('Yasaklanacak kullanıcının ID\'si (Sunucuda olmayan kullanıcılar için)')
                .setRequired(false))
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
            if (!interaction.member.permissions.has('BanMembers')) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın!', 
                    ephemeral: true 
                });
            }

            const userId = interaction.options.getString('userid');
            const mentionedUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
            const days = interaction.options.getInteger('days') || 0;
            
            let targetId;
            let targetUser;
            
            if (!userId && !mentionedUser) {
                return interaction.reply({
                    content: 'Ban işlemi için bir kullanıcı veya kullanıcı ID\'si belirtmelisiniz.',
                    ephemeral: true
                });
            }
            
            if (userId) {
                // ID ile banlama
                targetId = userId;
                try {
                    targetUser = await interaction.client.users.fetch(userId).catch(() => null);
                } catch (error) {
                    targetUser = null; // Kullanıcı bulunamadı
                }
            } else {
                // Mention ile banlama
                targetId = mentionedUser.id;
                targetUser = mentionedUser;
            }
            
            // Kullanıcı bilgisi gösterme
            const userDisplay = targetUser ? `${targetUser.tag} (${targetId})` : `ID: ${targetId} (Kullanıcı bilgisi alınamadı)`;
            
            // Hedef kullanıcıyı kontrol et (eğer sunucudaysa)
            if (targetUser) {
                const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
                
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
            }
            
            // Ban işlemi
            try {
                await interaction.guild.members.ban(targetId, { reason: reason, deleteMessageDays: days });
                
                // İlk yanıt mesajı
                await interaction.reply({
                    content: `**${userDisplay}** başarıyla yasaklandı. Sebep: ${reason}`,
                    ephemeral: true
                });
                
                // Log gönder
                if (targetUser) {
                    await sendBanLogEmbed(interaction, targetUser, reason, days);
                } else {
                    // Kullanıcı bilgisi alınamadıysa basitleştirilmiş log
                    await sendSimpleBanLogEmbed(interaction, targetId, reason, days);
                }
                
            } catch (error) {
                console.error('Ban hatası:', error);
                await interaction.reply({
                    content: `Ban işlemi sırasında bir hata oluştu: ${error.message}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Ban komutu hatası:', error);
            
            // Eğer yanıt verildiyse veya yol içinde bir hata olduysa followUp kullan
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon (normal ban)
async function sendBanLogEmbed(interaction, targetUser, reason, days) {
    try {
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

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

// Log mesajı gönderen yardımcı fonksiyon (ID için)
async function sendSimpleBanLogEmbed(interaction, userId, reason, days) {
    try {
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#ff0000') // Kırmızı
            .setTitle('🔨 Kullanıcı Yasaklandı')
            .addFields(
                { name: 'Kullanıcı ID', value: userId, inline: true },
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false },
                { name: 'Silinen Mesaj Günü', value: `${days} gün`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${userId}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Ban log gönderme hatası:', error);
    }
}