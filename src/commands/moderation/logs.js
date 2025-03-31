// src/commands/moderation/logs.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
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
                            { name: 'Üye', value: 'member' },
                            { name: 'Ayrılma', value: 'leave' } // Yeni eklenen log tipi
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
                            { name: 'Üye', value: 'member' },
                            { name: 'Ayrılma', value: 'leave' } // Yeni eklenen log tipi
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                // SQLite'a log kanalını kaydet
                await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                
                const typeNames = {
                    moderation: 'Moderasyon',
                    server: 'Sunucu',
                    message: 'Mesaj',
                    member: 'Üye',
                    leave: 'Ayrılma' // Yeni eklenen log tipi
                };
                
                await interaction.reply({
                    content: `**${typeNames[type] || type}** log kanalı <#${channel.id}> olarak ayarlandı.`,
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
                
                const typeNames = {
                    moderation: 'Moderasyon',
                    server: 'Sunucu',
                    message: 'Mesaj',
                    member: 'Üye',
                    leave: 'Ayrılma' // Yeni eklenen log tipi
                };
                
                const channelList = logChannels.map(log => {
                    const typeName = typeNames[log.type] || log.type;
                    return `**${typeName}**: <#${log.channel_id}>`;
                }).join('\n');
                
                await interaction.reply({
                    content: `**Ayarlı Log Kanalları**\n${channelList}`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                // Log kanalı ayarını sil
                await database.logs.deleteLogChannel(interaction.guild.id, type);
                
                const typeNames = {
                    moderation: 'Moderasyon',
                    server: 'Sunucu',
                    message: 'Mesaj',
                    member: 'Üye',
                    leave: 'Ayrılma' // Yeni eklenen log tipi
                };
                
                await interaction.reply({
                    content: `**${typeNames[type] || type}** log kanalı ayarı başarıyla silindi.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Logs komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};