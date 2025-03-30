// src/commands/moderation/logs.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

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
    
    async execute(interaction) {
        const client = interaction.client;
        await interaction.deferReply({ flags: 64 }); // 64 = ephemeral flag değeri        
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
                content: 'Komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
            });
        }
    }
};

async function setupLogChannel(interaction, client) {
    try {
        const channel = interaction.options.getChannel('channel');
        
        // Kanal türünü kontrol et
        if (channel.type !== 0) { // 0 = TextChannel
            return await interaction.editReply({ 
                content: 'Lütfen bir metin kanalı seçin.'
            });
        }
        
        console.log(`Log kanalı ayarlanıyor: ${channel.name} (${channel.id})`);
        
        // Botun kanala mesaj gönderme yetkisini kontrol et
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.SendMessages) || 
            !permissions.has(PermissionFlagsBits.EmbedLinks)) {
            
            return await interaction.editReply({ 
                content: 'Bot seçilen kanalda mesaj gönderme veya embed gönderme yetkisine sahip değil.'
            });
        }
        
        console.log('Bot kanalda gerekli izinlere sahip, veritabanı güncelleniyor...');
        
        // DOĞRU GÜNCELLEME: Doğrudan SQL kullan
        const result = await client.database.run(
            'INSERT OR REPLACE INTO guild_config (guild_id, log_channel_id, updated_at) VALUES (?, ?, ?)',
            [interaction.guild.id, channel.id, Math.floor(Date.now() / 1000)]
        );
        
        console.log('Veritabanı güncellendi, test log mesajı gönderiliyor...');
        
        // Doğrudan test mesajı gönder
        const testEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Log Sistemi Test Mesajı')
            .setDescription('Log sistemi başarıyla yapılandırıldı!')
            .addFields(
                { name: 'Yapılandıran', value: `${interaction.user.tag}` },
                { name: 'Tarih', value: new Date().toLocaleString('tr-TR') }
            )
            .setTimestamp();
            
        await channel.send({ embeds: [testEmbed] })
            .then(() => console.log('Direkt test mesajı gönderildi'))
            .catch(e => console.error('Direkt test mesajı hatası:', e));
        
        // Logger ile log göndermeyi dene
        console.log('Logger.log çağrılıyor...');
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
            
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('setupLogChannel fonksiyonunda hata:', error);
        await interaction.editReply({ 
            content: `Log kanalı ayarlanırken bir hata oluştu: ${error.message}`
        });
    }
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
        
    await interaction.editReply({ embeds: [embed] });

    client.database.run(`
        ALTER TABLE guild_config 
        RENAME COLUMN logChannelId TO log_channel_id;
    `).catch(() => {
        console.log('Sütun zaten log_channel_id olarak adlandırılmış');
    });
}