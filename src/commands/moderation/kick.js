// src/commands/moderation/kick.js
const { SlashCommandBuilder } = require('discord.js');

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
            .setRequired(false)),
    
    async execute(interaction) {
        // Yetkili kontrolleri
        if (!interaction.member.permissions.has('KickMembers')) {
            return interaction.reply({ 
                content: 'Bu komutu kullanma yetkiniz yok!', 
                ephemeral: true 
            });
        }

        const user = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        try {
            await user.kick(reason);
            
            await interaction.reply({
                content: `${user.user.tag} kullanıcısı sunucudan atıldı. Sebep: ${reason}`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Kick işleminde hata:', error);
            await interaction.reply({
                content: 'Kullanıcıyı atarken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};