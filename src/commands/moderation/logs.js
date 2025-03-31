// src/commands/moderation/logs.js - Basitleştirilmiş

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loglar')
        .setDescription('Log kanallarını ayarla')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Bir log kanalı ayarla')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Log türü')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderasyon', value: 'moderation' },
                            { name: 'Sunucu', value: 'server' },
                            { name: 'Mesaj', value: 'message' },
                            { name: 'Üye', value: 'member' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Log kanalı')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Ayarlı log kanallarını görüntüle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Bir log kanalı ayarını sil')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Log türü')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderasyon', value: 'moderation' },
                            { name: 'Sunucu', value: 'server' },
                            { name: 'Mesaj', value: 'message' },
                            { name: 'Üye', value: 'member' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Alt komut kontrolü
            const subcommand = interaction.options.getSubcommand(false);
            
            if (!subcommand) {
                return interaction.reply({
                    content: 'Geçersiz alt komut. Lütfen set, view veya delete alt komutlarından birini kullanın.',
                    ephemeral: true
                });
            }
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                // Veritabanı işlemi - Başarıya kadar işlem yapmıyoruz
                await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                
                return interaction.reply({
                    content: `**${type}** log kanalı <#${channel.id}> olarak ayarlandı.`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'view') {
                // Tüm log kanallarını al
                const logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
                
                if (!logChannels || logChannels.length === 0) {
                    return interaction.reply({
                        content: 'Bu sunucuda hiç log kanalı ayarlanmamış.',
                        ephemeral: true
                    });
                }
                
                const channelList = logChannels.map(log => {
                    return `**${log.type}**: <#${log.channel_id}>`;
                }).join('\n');
                
                return interaction.reply({
                    content: `**Ayarlı Log Kanalları**\n${channelList}`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                // Log kanalı ayarını sil
                await database.logs.deleteLogChannel(interaction.guild.id, type);
                
                return interaction.reply({
                    content: `**${type}** log kanalı ayarı başarıyla silindi.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Log komutu hatası:', error);
            
            if (!interaction.replied) {
                return interaction.reply({
                    content: 'Komut çalıştırılırken bir hata oluştu.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
};