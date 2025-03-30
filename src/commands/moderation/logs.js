// src/commands/moderation/logs.js - Basitleştirilmiş

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        // ... tüm command builder kodu aynı kalır ...
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Alt komut kontrolü
            let subcommand;
            try {
                subcommand = interaction.options.getSubcommand();
            } catch (error) {
                return interaction.editReply({
                    content: 'Geçersiz alt komut. Lütfen set, view veya delete alt komutlarından birini kullanın.'
                });
            }
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                // SQLite'a log kanalını kaydet
                await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                
                return interaction.editReply({
                    content: `**${type}** log kanalı <#${channel.id}> olarak ayarlandı.`
                });
            }
            else if (subcommand === 'view') {
                // Tüm log kanallarını al
                const logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
                
                if (!logChannels || logChannels.length === 0) {
                    return interaction.editReply({
                        content: 'Bu sunucuda hiç log kanalı ayarlanmamış.'
                    });
                }
                
                const channelList = logChannels.map(log => {
                    return `**${log.type}**: <#${log.channel_id}>`;
                }).join('\n');
                
                return interaction.editReply({
                    content: `**Ayarlı Log Kanalları**\n${channelList}`
                });
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                // Log kanalı ayarını sil
                await database.logs.deleteLogChannel(interaction.guild.id, type);
                
                return interaction.editReply({
                    content: `**${type}** log kanalı ayarı başarıyla silindi.`
                });
            }
        } catch (error) {
            console.error('Log komutu hatası:', error);
            return interaction.editReply({
                content: 'Komut çalıştırılırken bir hata oluştu.'
            });
        }
    }
};