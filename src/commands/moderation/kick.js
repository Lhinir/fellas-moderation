// src/commands/moderation/kick.js
const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir kullanıcıyı sunucudan atar')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('Atılacak kullanıcı')
            .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Atılma sebebi')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        // Yetkili kontrolleri
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ 
                content: 'Bu komutu kullanma yetkiniz yok!', 
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        // Bot'un yetki kontrolü
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                content: 'Bu işlemi gerçekleştirmek için yeterli yetkiye sahip değilim!',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        // Kullanıcının sunucu üyesi olduğundan emin olalım
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({
                content: 'Belirtilen kullanıcı bu sunucuda bulunamadı.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        // Hedef kullanıcının atılabilir olup olmadığını kontrol et
        if (!member.kickable) {
            return interaction.reply({
                content: 'Bu kullanıcıyı atamam. Hedef kullanıcı benden daha yüksek bir role sahip olabilir.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        try {
            await member.kick(reason);
            
            await interaction.reply({
                content: `${user.tag} kullanıcısı sunucudan atıldı. Sebep: ${reason}`
                // Normal mesaj olduğu için flags belirtmeye gerek yok
            });

            // Log kaydı
            try {
                await interaction.client.logger.log(interaction.guild.id, 'moderation', {
                    action: 'kick',
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
            console.error('Kick işleminde hata:', error);
            await interaction.reply({
                content: `Kullanıcıyı atarken bir hata oluştu: ${error.message}`,
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    }
};