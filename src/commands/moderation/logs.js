// src/commands/moderation/logs.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Log ayarlarını yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Log kanalını ayarlar')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Logların gönderileceği kanal')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Mevcut log ayarlarını gösterir')),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'setup':
                    await setupLogChannel(interaction, client);
                    break;
                    
                case 'view':
                    await viewLogSettings(interaction, client);
                    break;
            }
        } catch (error) {
            console.error(`Logs komutunda hata: ${error}`);
            await interaction.editReply({ 
                content: 'Komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                ephemeral: true 
            });
        }
    }
};

async function setupLogChannel(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    
    // Kanal türünü kontrol et
    if (channel.type !== 0) { // 0 = TextChannel
        await interaction.editReply({ 
            content: 'Lütfen bir metin kanalı seçin.',
            ephemeral: true 
        });
        return;
    }
    
    // Botun kanala mesaj gönderme yetkisini kontrol et
    const permissions = channel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has(PermissionFlagsBits.SendMessages) || 
        !permissions.has(PermissionFlagsBits.AttachFiles) || 
        !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        
        await interaction.editReply({ 
            content: 'Bot seçilen kanalda mesaj gönderme, dosya ekleme veya embed gönderme yetkisine sahip değil. Lütfen bu yetkileri verdikten sonra tekrar deneyin.',
            ephemeral: true 
        });
        return;
    }
    
    // Sunucu ayarlarını güncelle
    await client.database.updateGuildConfig(interaction.guild.id, {
        log_channel_id: channel.id
    });
    
    // Test logu gönder
    await client.logger.log(interaction.guild.id, 'system', {
        description: 'Log sistemi kurulumu tamamlandı',
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag
        },
        channel: {
            id: channel.id,
            name: channel.name
        }
    });
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Log Kanalı Ayarlandı')
        .setDescription(`Log kanalı ${channel} olarak ayarlandı. Test log mesajı kanala gönderildi.`)
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function viewLogSettings(interaction, client) {
    const guildConfig = await client.database.getGuildConfig(interaction.guild.id);
    
    let logChannelInfo = '❌ Ayarlanmamış';
    
    if (guildConfig.log_channel_id) {
        const channel = interaction.guild.channels.cache.get(guildConfig.log_channel_id);
        logChannelInfo = channel ? `✅ <#${channel.id}>` : '❓ Kanal bulunamadı';
    }
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Log Ayarları')
        .addFields(
            { name: '📢 Log Kanalı', value: logChannelInfo }
        )
        .setFooter({ text: 'Log kanalını ayarlamak için /logs setup komutunu kullanın' })
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}