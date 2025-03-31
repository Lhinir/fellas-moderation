// src/commands/moderation/logs.js (Birleştirilmiş versiyon)

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const database = require('../../modules/database');

// Log türleri ve görünen adları
const LOG_TYPES = {
    moderation: 'Moderasyon',
    server: 'Sunucu',
    message: 'Mesaj',
    member: 'Üye',
    leave: 'Ayrılma',
    // LogChannel sisteminden alınan ek türler
    action: 'Aksiyon',
    voice: 'Ses',
    join: 'Katılma'
};

// Tip eşleştirme - logchannel sisteminden gelen talepleri logs sistemine yönlendirir
const TYPE_MAPPING = {
    // logchannel sistemi -> logs sistemi
    mod: 'moderation',
    modlog: 'moderation',
    action: 'action',
    voice: 'voice',
    message: 'message',
    msg: 'message',
    member: 'member',
    user: 'member',
    join: 'join',
    leave: 'leave',
    exit: 'leave'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Log kanallarını yapılandır')
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
                            { name: 'Ayrılma', value: 'leave' },
                            { name: 'Aksiyon', value: 'action' },
                            { name: 'Ses', value: 'voice' },
                            { name: 'Katılma', value: 'join' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Log kanalı')
                        .addChannelTypes(ChannelType.GuildText)
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
                            { name: 'Ayrılma', value: 'leave' },
                            { name: 'Aksiyon', value: 'action' },
                            { name: 'Ses', value: 'voice' },
                            { name: 'Katılma', value: 'join' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                // SQLite'a log kanalını kaydet
                await database.logs.setLogChannel(interaction.guild.id, type, channel.id);
                
                // GUI için daha iyi görünen ad kullan
                const typeName = LOG_TYPES[type] || type;
                
                const embed = new EmbedBuilder()
                    .setColor('#4CAF50')
                    .setTitle('✅ Log Kanalı Ayarlandı')
                    .setDescription(`**${typeName}** log kanalı <#${channel.id}> olarak ayarlandı.`)
                    .setFooter({ text: 'Logs Sistemi' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'view') {
                // Tüm log kanallarını al
                const logChannels = await database.logs.getAllLogChannels(interaction.guild.id);
                
                if (!logChannels || logChannels.length === 0) {
                    return interaction.editReply({
                        content: 'Bu sunucuda hiç log kanalı ayarlanmamış.',
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor('#2196F3')
                    .setTitle('📋 Log Kanalları')
                    .setDescription('Bu sunucuda ayarlanmış log kanalları:')
                    .setFooter({ text: 'Logs Sistemi' })
                    .setTimestamp();
                
                // Kanalları türlerine göre sırala
                const sortedChannels = logChannels.sort((a, b) => {
                    const nameA = LOG_TYPES[a.type] || a.type;
                    const nameB = LOG_TYPES[b.type] || b.type;
                    return nameA.localeCompare(nameB);
                });
                
                // Log kanallarını embed'e ekle
                sortedChannels.forEach(log => {
                    const typeName = LOG_TYPES[log.type] || log.type;
                    embed.addFields({
                        name: typeName,
                        value: `<#${log.channel_id}>`,
                        inline: true
                    });
                });
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'delete') {
                const type = interaction.options.getString('type');
                
                // Log kanalı varlığını kontrol et
                const existingChannel = await database.logs.getLogChannel(interaction.guild.id, type);
                if (!existingChannel) {
                    return interaction.editReply({
                        content: `Bu sunucuda **${LOG_TYPES[type] || type}** log kanalı ayarlanmamış.`,
                        ephemeral: true
                    });
                }
                
                // Log kanalı ayarını sil
                await database.logs.deleteLogChannel(interaction.guild.id, type);
                
                const embed = new EmbedBuilder()
                    .setColor('#F44336')
                    .setTitle('🗑️ Log Kanalı Silindi')
                    .setDescription(`**${LOG_TYPES[type] || type}** log kanalı ayarı başarıyla silindi.`)
                    .setFooter({ text: 'Logs Sistemi' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Logs komutu hatası:', error);
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    },
    
    // logchannel sisteminden gelen istekler için uyumluluk katmanı
    // database.js içinde kullanım için
    getLogChannel: async function(guildId, typeFromLogChannel) {
        // Log tipini normalize et
        let normalizedType = typeFromLogChannel.toLowerCase();
        
        // Eşleştirme tablosunda varsa, doğru tipe dönüştür
        if (TYPE_MAPPING[normalizedType]) {
            normalizedType = TYPE_MAPPING[normalizedType];
        }
        
        // Logs sisteminden log kanalını al
        try {
            return await database.logs.getLogChannel(guildId, normalizedType);
        } catch (error) {
            console.error(`Log kanalı getirme hatası (${normalizedType}):`, error);
            return null;
        }
    }
};