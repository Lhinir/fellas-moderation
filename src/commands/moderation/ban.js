// src/commands/moderation/ban.js
const { SlashCommandBuilder } = require('discord.js');

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
            .setRequired(false)),
    
    async execute(interaction) {
        // Yetkili kontrolleri
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ 
                content: 'Bu komutu kullanma yetkiniz yok!', 
                ephemeral: true 
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        try {
            await interaction.guild.members.ban(user, { reason });
            
            await interaction.reply({
                content: `${user.tag} kullanıcısı sunucudan yasaklandı. Sebep: ${reason}`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Ban işleminde hata:', error);
            await interaction.reply({
                content: 'Kullanıcıyı yasaklarken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};