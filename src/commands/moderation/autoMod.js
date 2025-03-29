// src/commands/moderation/automod.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Otomatik moderasyon ayarlarını yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Mevcut automod ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('spam')
                .setDescription('Spam koruması ayarlarını yönetir')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Spam korumasını etkinleştir/devre dışı bırak')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Kaç mesaj spam olarak sayılacak')
                        .setMinValue(3)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Saniye cinsinden zaman aralığı')
                        .setMinValue(1)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('raid')
                .setDescription('İstila koruması ayarlarını yönetir')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('İstila korumasını etkinleştir/devre dışı bırak')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Kaç yeni üye istila olarak sayılacak')
                        .setMinValue(5)
                        .setMaxValue(50))
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Saniye cinsinden zaman aralığı')
                        .setMinValue(5)
                        .setMaxValue(120)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('profanity')
                .setDescription('Küfür filtresini yönetir')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Küfür filtresini etkinleştir/devre dışı bırak')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('wordlist')
                .setDescription('Küfür listesini yönetir')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Yapılacak işlem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Listele', value: 'list' },
                            { name: 'Ekle', value: 'add' },
                            { name: 'Kaldır', value: 'remove' }
                        ))
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Eklenecek veya kaldırılacak kelime'))),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'settings':
                    await showSettings(interaction, client);
                    break;
                    
                case 'spam':
                    await updateSpamSettings(interaction, client);
                    break;
                    
                case 'raid':
                    await updateRaidSettings(interaction, client);
                    break;
                    
                case 'profanity':
                    await updateProfanitySettings(interaction, client);
                    break;
                    
                case 'wordlist':
                    await manageWordlist(interaction, client);
                    break;
            }
        } catch (error) {
            console.error(`AutoMod komutunda hata: ${error}`);
            await interaction.editReply({ 
                content: 'Komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                ephemeral: true 
            });
        }
    }
};

async function showSettings(interaction, client) {
    const settings = await client.automod.getGuildSettings(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 AutoMod Ayarları')
        .addFields(
            { 
                name: '🔄 Spam Koruması', 
                value: settings.spam_protection ? '✅ Aktif' : '❌ Devre Dışı',
                inline: true 
            },
            { 
                name: '⚡ Spam Eşiği', 
                value: `${settings.spam_threshold} mesaj / ${settings.spam_interval / 1000} saniye`,
                inline: true 
            },
            { name: '\u200B', value: '\u200B', inline: true },
            { 
                name: '🛡️ İstila Koruması', 
                value: settings.raid_protection ? '✅ Aktif' : '❌ Devre Dışı',
                inline: true 
            },
            { 
                name: '🔔 İstila Eşiği', 
                value: `${settings.raid_threshold} üye / ${settings.raid_interval / 1000} saniye`,
                inline: true 
            },
            { name: '\u200B', value: '\u200B', inline: true },
            { 
                name: '🤬 Küfür Filtresi', 
                value: settings.profanity_filter ? '✅ Aktif' : '❌ Devre Dışı',
                inline: true 
            }
        )
        .setFooter({ text: 'Ayarları değiştirmek için /automod komutlarını kullanabilirsiniz' })
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function updateSpamSettings(interaction, client) {
    const active = interaction.options.getBoolean('active');
    const threshold = interaction.options.getInteger('threshold');
    const intervalSeconds = interaction.options.getInteger('interval');
    
    // Mevcut ayarları al
    const settings = await client.automod.getGuildSettings(interaction.guild.id);
    
    // Ayarları güncelle
    const updatedSettings = {
        ...settings,
        spam_protection: active ? 1 : 0
    };
    
    if (threshold) updatedSettings.spam_threshold = threshold;
    if (intervalSeconds) updatedSettings.spam_interval = intervalSeconds * 1000; // Milisaniyeye çevir
    
    // Veritabanına kaydet
    await client.automod.updateGuildSettings(interaction.guild.id, updatedSettings);
    
    // Log oluştur
    await client.logger.log(interaction.guild.id, 'config', {
        description: 'Spam koruması ayarları güncellendi',
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag
        },
        changes: {
            active: active,
            threshold: threshold || settings.spam_threshold,
            interval: (intervalSeconds ? intervalSeconds : settings.spam_interval / 1000) + ' saniye'
        }
    });
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Spam Koruması Ayarları Güncellendi')
        .setDescription(`Spam koruması ${active ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`)
        .addFields(
            { 
                name: '⚡ Spam Eşiği', 
                value: `${threshold || settings.spam_threshold} mesaj`, 
                inline: true 
            },
            { 
                name: '⏱️ Zaman Aralığı', 
                value: `${intervalSeconds || settings.spam_interval / 1000} saniye`, 
                inline: true 
            }
        )
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function updateRaidSettings(interaction, client) {
    const active = interaction.options.getBoolean('active');
    const threshold = interaction.options.getInteger('threshold');
    const intervalSeconds = interaction.options.getInteger('interval');
    
    // Mevcut ayarları al
    const settings = await client.automod.getGuildSettings(interaction.guild.id);
    
    // Ayarları güncelle
    const updatedSettings = {
        ...settings,
        raid_protection: active ? 1 : 0
    };
    
    if (threshold) updatedSettings.raid_threshold = threshold;
    if (intervalSeconds) updatedSettings.raid_interval = intervalSeconds * 1000; // Milisaniyeye çevir
    
    // Veritabanına kaydet
    await client.automod.updateGuildSettings(interaction.guild.id, updatedSettings);
    
    // Log oluştur
    await client.logger.log(interaction.guild.id, 'config', {
        description: 'İstila koruması ayarları güncellendi',
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag
        },
        changes: {
            active: active,
            threshold: threshold || settings.raid_threshold,
            interval: (intervalSeconds ? intervalSeconds : settings.raid_interval / 1000) + ' saniye'
        }
    });
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ İstila Koruması Ayarları Güncellendi')
        .setDescription(`İstila koruması ${active ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`)
        .addFields(
            { 
                name: '🔔 İstila Eşiği', 
                value: `${threshold || settings.raid_threshold} üye`, 
                inline: true 
            },
            { 
                name: '⏱️ Zaman Aralığı', 
                value: `${intervalSeconds || settings.raid_interval / 1000} saniye`, 
                inline: true 
            }
        )
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function updateProfanitySettings(interaction, client) {
    const active = interaction.options.getBoolean('active');
    
    // Mevcut ayarları al
    const settings = await client.automod.getGuildSettings(interaction.guild.id);
    
    // Ayarları güncelle
    const updatedSettings = {
        ...settings,
        profanity_filter: active ? 1 : 0
    };
    
    // Veritabanına kaydet
    await client.automod.updateGuildSettings(interaction.guild.id, updatedSettings);
    
    // Küfür listesini yeniden yükle
    client.automod.loadProfanityList();
    
    // Log oluştur
    await client.logger.log(interaction.guild.id, 'config', {
        description: 'Küfür filtresi ayarları güncellendi',
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag
        },
        changes: {
            active: active
        }
    });
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Küfür Filtresi Ayarları Güncellendi')
        .setDescription(`Küfür filtresi ${active ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`)
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function manageWordlist(interaction, client) {
    const action = interaction.options.getString('action');
    const word = interaction.options.getString('word');
    
    switch (action) {
        case 'list':
            const wordList = await client.automod.getProfanityList();
            
            if (wordList.length === 0) {
                await interaction.editReply({ 
                    content: 'Küfür listesinde hiç kelime bulunmuyor.',
                    ephemeral: true 
                });
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔍 Küfür Listesi')
                .setDescription('Aşağıdaki kelimeler filtrelenmektedir:')
                .addFields(
                    { name: 'Kelimeler', value: wordList.join(', ') }
                )
                .setFooter({ text: `Toplam ${wordList.length} kelime` })
                .setTimestamp();
                
            await interaction.editReply({ embeds: [embed], ephemeral: true });
            break;
            
        case 'add':
            if (!word) {
                await interaction.editReply({ 
                    content: 'Eklemek istediğiniz kelimeyi belirtmelisiniz.',
                    ephemeral: true 
                });
                return;
            }
            
            const added = await client.automod.addProfanityWord(word);
            
            if (added) {
                // Log oluştur
                await client.logger.log(interaction.guild.id, 'config', {
                    description: 'Küfür listesine kelime eklendi',
                    user: {
                        id: interaction.user.id,
                        tag: interaction.user.tag
                    },
                    word: word
                });
                
                // Küfür listesini yeniden yükle
                client.automod.loadProfanityList();
                
                await interaction.editReply({ 
                    content: `✅ "${word}" kelimesi küfür listesine eklendi.`,
                    ephemeral: true 
                });
            } else {
                await interaction.editReply({ 
                    content: `❌ "${word}" kelimesi zaten listede mevcut.`,
                    ephemeral: true 
                });
            }
            break;
            
        case 'remove':
            if (!word) {
                await interaction.editReply({ 
                    content: 'Kaldırmak istediğiniz kelimeyi belirtmelisiniz.',
                    ephemeral: true 
                });
                return;
            }
            
            const removed = await client.automod.removeProfanityWord(word);
            
            if (removed) {
                // Log oluştur
                await client.logger.log(interaction.guild.id, 'config', {
                    description: 'Küfür listesinden kelime kaldırıldı',
                    user: {
                        id: interaction.user.id,
                        tag: interaction.user.tag
                    },
                    word: word
                });
                
                // Küfür listesini yeniden yükle
                client.automod.loadProfanityList();
                
                await interaction.editReply({ 
                    content: `✅ "${word}" kelimesi küfür listesinden kaldırıldı.`,
                    ephemeral: true 
                });
            } else {
                await interaction.editReply({ 
                    content: `❌ "${word}" kelimesi listede bulunamadı.`,
                    ephemeral: true 
                });
            }
            break;
    }
}