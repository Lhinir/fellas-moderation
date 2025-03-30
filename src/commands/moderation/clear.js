// src/commands/clear.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler')
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın!', 
                    ephemeral: true 
                });
            }

            const amount = interaction.options.getInteger('miktar');
            const channel = interaction.channel;

            // Mesajları sil
            const messages = await channel.bulkDelete(amount, true)
                .catch(error => {
                    console.error(error);
                    interaction.reply({ 
                        content: 'Mesajları silerken bir hata oluştu! 14 günden eski mesajlar silinemez.', 
                        ephemeral: true 
                    });
                    return null;
                });

            if (!messages) return;

            // Başarılı yanıt
            await interaction.reply({ 
                content: `${messages.size} mesaj başarıyla silindi!`, 
                ephemeral: true 
            });

            // Logger modülü ile log gönder
            logger.log({
                type: 'MESSAGE_DELETE_BULK',
                guild: interaction.guild,
                moderator: interaction.user,
                channel: channel,
                count: messages.size,
                logMessage: `${interaction.user.tag} (${interaction.user.id}) tarafından ${channel.name} kanalında ${messages.size} mesaj silindi.`
            });

        } catch (error) {
            console.error('Clear komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};