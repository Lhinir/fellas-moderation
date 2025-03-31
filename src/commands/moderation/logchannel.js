// src/commands/moderation/logchannel.js
/*
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logkanal')
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
                            { name: 'Ses', value: 'voice' }
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
                            { name: 'Ses', value: 'voice' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Hemen yanıtı ertele
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                try {
                    // SQLite'a log kanalını kaydet
                    await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                    
                    await interaction.editReply({
                        content: `**${type}** log kanalı <#${channel.id}> olarak ayarlandı.`
                    });
                } catch (dbError) {
                    console.error('Log kanalı ayarlama hatası:', dbError);
                    await interaction.editReply({
                        content: 'Log kanalı ayarlanırken veritabanı hatası oluştu.'
                    });
                }
            }
            else if (subcommand === 'view') {
                try {
                    // Tüm log kanallarını al
                    const logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
                    
                    if (!logChannels || logChannels.length === 0) {
                        return interaction.editReply({
                            content: 'Bu sunucuda hiç log kanalı ayarlanmamış.'
                        });
                    }
                    
                    // Log kanal türlerini daha anlaşılır göster
                    const logTypeNames = {
                        'moderation': 'Moderasyon',
                        'server': 'Sunucu',
                        'message': 'Mesaj',
                        'member': 'Üye',
                        'voice': 'Ses'
                    };
                    
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📊 Log Kanalları')
                        .setDescription('Ayarlı tüm log kanalları:')
                        .setTimestamp();
                    
                    logChannels.forEach(log => {
                        const typeName = logTypeNames[log.type] || log.type;
                        embed.addFields({ name: typeName, value: `<#${log.channel_id}>`, inline: true });
                    });
                    
                    await interaction.editReply({ embeds: [embed] });
                } catch (dbError) {
                    console.error('Log kanalları getirme hatası:', dbError);
                    await interaction.editReply({
                        content: 'Log kanalları görüntülenirken veritabanı hatası oluştu.'
                    });
                }
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                try {
                    // Log kanalı ayarını sil
                    await database.logs.deleteLogChannel(interaction.guild.id, type);
                    
                    await interaction.editReply({
                        content: `**${type}** log kanalı ayarı başarıyla silindi.`
                    });
                } catch (dbError) {
                    console.error('Log kanalı silme hatası:', dbError);
                    await interaction.editReply({
                        content: 'Log kanalı silinirken veritabanı hatası oluştu.'
                    });
                }
            }
        } catch (error) {
            console.error('Log komutu hatası:', error);
            await interaction.editReply({
                content: 'Komut çalıştırılırken bir hata oluştu.'
            }).catch(console.error);
        }
    }
};
*/