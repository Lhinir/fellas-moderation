// src/commands/moderation/ban.js
const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı sunucudan yasaklar')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('Yasaklanacak kullanıcı')
            .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Yasaklama sebebi')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // Yetkili kontrolleri
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: 'Bu komutu kullanma yetkiniz yok!', 
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        // Bot'un yetki kontrolü
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: 'Bu işlemi gerçekleştirmek için yeterli yetkiye sahip değilim!',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        // Hedef kullanıcının yasaklanabilir olup olmadığını kontrol et
        const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (targetMember && !targetMember.bannable) {
            return interaction.reply({
                content: 'Bu kullanıcıyı yasaklayamam. Hedef kullanıcı benden daha yüksek bir role sahip olabilir.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        try {
            await interaction.guild.members.ban(user, { reason });
            
            await interaction.reply({
                content: `${user.tag} kullanıcısı sunucudan yasaklandı. Sebep: ${reason}`
                // Normal mesaj olduğu için flags belirtmeye gerek yok
            });

            // Log kaydı
            try {
                await interaction.client.logger.log(interaction.guild.id, 'moderation', {
                    action: 'ban',
                    moderator: {
                        id: interaction.user.id,
                        tag: interaction.user.tag
                    },
                    target: {
                        id: user.id,
                        tag: user.tag
                    },
                    reason: reason
                });
            } catch (logError) {
                console.error('Log kaydı sırasında hata:', logError);
            }
        } catch (error) {
            console.error('Ban işleminde hata:', error);
            await interaction.reply({
                content: `Kullanıcıyı yasaklarken bir hata oluştu: ${error.message}`,
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    }
};