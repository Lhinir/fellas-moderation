// src/commands/moderation/logs.js - Zamanaşımı düzeltmesi

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
        // Hemen yanıtı ertele (3 saniyelik zaman aşımını önle)
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                // SQLite'a log kanalını kaydet
                await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                
                await interaction.editReply({
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
                
                await interaction.editReply({
                    content: `**Ayarlı Log Kanalları**\n${channelList}`
                });
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                // Log kanalı ayarını sil
                await database.logs.deleteLogChannel(interaction.guild.id, type);
                
                await interaction.editReply({
                    content: `**${type}** log kanalı ayarı başarıyla silindi.`
                });
            }
        } catch (error) {
            console.error('Log kanalı yönetim hatası:', error);
            await interaction.editReply({
                content: 'Log kanalı ayarları yönetilirken bir hata oluştu.'
            }).catch(err => console.error('Hata mesajı gönderirken hata:', err));
        }
    }
};