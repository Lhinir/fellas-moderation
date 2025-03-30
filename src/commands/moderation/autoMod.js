// src/commands/moderation/automod.js - SlashCommandBuilder'a yeni alt komut ekle

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('AutoMod ayarlarını yapılandırır')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('AutoMod durumunu görüntüler'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('AutoMod özelliğini açıp kapatır')
                .addStringOption(option =>
                    option.setName('state')
                        .setDescription('AutoMod durumu')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Aktif', value: 'enable' },
                            { name: 'Devre Dışı', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('words')
                .setDescription('Yasaklı kelime listesini yönetir')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Yapılacak işlem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Görüntüle', value: 'view' },
                            { name: 'Ekle', value: 'add' },
                            { name: 'Çıkar', value: 'remove' },
                            { name: 'Temizle', value: 'clear' }
                        ))
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Eklenecek veya çıkarılacak kelime')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('spam')
                .setDescription('Spam korumasını yapılandırır')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Yapılacak işlem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Durumu Göster', value: 'status' },
                            { name: 'Aktifleştir', value: 'enable' },
                            { name: 'Devre Dışı Bırak', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('spam-settings')
                .setDescription('Spam koruması ayarlarını yapılandırır')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Kaç mesaj spam olarak kabul edilecek (3-10)')
                        .setMinValue(3)
                        .setMaxValue(10)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Mesaj takip süresi - saniye (3-10)')
                        .setMinValue(3)
                        .setMaxValue(10)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('timeout')
                        .setDescription('Susturma süresi - dakika (1-60)')
                        .setMinValue(1)
                        .setMaxValue(60)
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        try {
            // Yetki kontrolü
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: 'Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();
            
            // Automod tablosunu kontrol et ve oluştur
            await createAutoModTableIfNotExists();
            
            // Sunucu konfigürasyonunu al veya oluştur
            const guildConfig = await getOrCreateAutoModConfig(interaction.guild.id);
            
            if (subcommand === 'status') {
                return showAutoModStatus(interaction, guildConfig);
            }
            else if (subcommand === 'toggle') {
                const state = interaction.options.getString('state');
                return toggleAutoMod(interaction, guildConfig, state);
            }
            else if (subcommand === 'words') {
                const action = interaction.options.getString('action');
                const word = interaction.options.getString('word');
                
                return handleBannedWords(interaction, guildConfig, action, word);
            }
            else if (subcommand === 'spam') {
                const action = interaction.options.getString('action');
                return handleSpamProtection(interaction, guildConfig, action);
            }
            else if (subcommand === 'spam-settings') {
                return configureSpamSettings(interaction, guildConfig);
            }
        } catch (error) {
            console.error('AutoMod komutunda hata:', error);
            return interaction.reply({
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            });
        }
    }
};

// Veritabanı fonksiyonları - getOrCreateAutoModConfig güncellenmesi gereken kısım
async function getOrCreateAutoModConfig(guildId) {
    try {
        // Önce mevcut konfigürasyonu al
        let config = await database.get(
            'SELECT * FROM automod_configs WHERE guild_id = ?',
            [guildId]
        );
        
        // Eğer konfig yoksa yeni oluştur
        if (!config) {
            await database.run(
                'INSERT INTO automod_configs (guild_id, enabled, banned_words, spam_protection, spam_threshold, spam_interval, spam_timeout) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildId, 0, '[]', 0, 5, 5000, 300000]
            );
            
            config = {
                guild_id: guildId,
                enabled: 0,
                banned_words: '[]',
                spam_protection: 0,
                spam_threshold: 5,
                spam_interval: 5000, // 5 saniye
                spam_timeout: 300000 // 5 dakika
            };
        }
        
        // JSON string'i parse et
        config.banned_words = JSON.parse(config.banned_words);
        
        return config;
    } catch (error) {
        console.error('AutoMod konfigürasyonu alınamadı:', error);
        throw error;
    }
}

// updateAutoModConfig fonksiyonunu güncelle
async function updateAutoModConfig(guildId, config) {
    try {
        const bannedWordsJson = JSON.stringify(config.banned_words);
        
        await database.run(
            `UPDATE automod_configs SET 
             enabled = ?, banned_words = ?, 
             spam_protection = ?, spam_threshold = ?, 
             spam_interval = ?, spam_timeout = ?,
             updated_at = CURRENT_TIMESTAMP 
             WHERE guild_id = ?`,
            [
                config.enabled ? 1 : 0, 
                bannedWordsJson,
                config.spam_protection ? 1 : 0,
                config.spam_threshold,
                config.spam_interval,
                config.spam_timeout,
                guildId
            ]
        );
    } catch (error) {
        console.error('AutoMod konfigürasyonu güncellenemedi:', error);
        throw error;
    }
}
async function createAutoModTableIfNotExists() {
    try {
        // AutoMod tablosunu güncellenmiş alanlarla oluştur
        await database.run(`
            CREATE TABLE IF NOT EXISTS automod_configs (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                banned_words TEXT DEFAULT '[]',
                spam_protection INTEGER DEFAULT 0,
                spam_threshold INTEGER DEFAULT 5,
                spam_interval INTEGER DEFAULT 5000,
                spam_timeout INTEGER DEFAULT 300000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        console.error('AutoMod tablosu oluşturma hatası:', error);
        throw error;
    }
}

// Spam koruma fonksiyonları
async function handleSpamProtection(interaction, config, action) {
    if (action === 'status') {
        const embed = new EmbedBuilder()
            .setColor(config.spam_protection ? '#00ff00' : '#ff0000')
            .setTitle('Spam Koruması Durumu')
            .setDescription(`Spam koruması şu anda **${config.spam_protection ? 'Aktif' : 'Devre Dışı'}**`)
            .addFields(
                { name: 'Eşik Değeri', value: `${config.spam_threshold} mesaj`, inline: true },
                { name: 'Kontrol Süresi', value: `${config.spam_interval / 1000} saniye`, inline: true },
                { name: 'Susturma Süresi', value: `${config.spam_timeout / 60000} dakika`, inline: true }
            )
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (action === 'enable') {
        config.spam_protection = true;
        await updateAutoModConfig(interaction.guild.id, config);
        
        return interaction.reply({
            content: `Spam koruması **aktifleştirildi**. ${config.spam_interval / 1000} saniye içinde ${config.spam_threshold} mesaj gönderenler ${config.spam_timeout / 60000} dakika susturulacak.`,
            ephemeral: true
        });
    }
    else if (action === 'disable') {
        config.spam_protection = false;
        await updateAutoModConfig(interaction.guild.id, config);
        
        return interaction.reply({
            content: 'Spam koruması **devre dışı bırakıldı**.',
            ephemeral: true
        });
    }
}

async function configureSpamSettings(interaction, config) {
    const threshold = interaction.options.getInteger('threshold');
    const interval = interaction.options.getInteger('interval');
    const timeout = interaction.options.getInteger('timeout');
    
    if (!threshold && !interval && !timeout) {
        return interaction.reply({
            content: 'En az bir ayar belirtmelisiniz (threshold, interval veya timeout).',
            ephemeral: true
        });
    }
    
    let changes = [];
    
    if (threshold) {
        config.spam_threshold = threshold;
        changes.push(`Eşik değeri: ${threshold} mesaj`);
    }
    
    if (interval) {
        config.spam_interval = interval * 1000; // Saniyeyi milisaniyeye çevir
        changes.push(`Kontrol süresi: ${interval} saniye`);
    }
    
    if (timeout) {
        config.spam_timeout = timeout * 60000; // Dakikayı milisaniyeye çevir
        changes.push(`Susturma süresi: ${timeout} dakika`);
    }
    
    await updateAutoModConfig(interaction.guild.id, config);
    
    return interaction.reply({
        content: `Spam koruması ayarları güncellendi:\n${changes.join('\n')}`,
        ephemeral: true
    });
}

// showAutoModStatus fonksiyonunu da güncelleyelim
async function showAutoModStatus(interaction, config) {
    const embed = new EmbedBuilder()
        .setColor(config.enabled ? '#00ff00' : '#ff0000')
        .setTitle('AutoMod Durumu')
        .setDescription(`AutoMod şu anda **${config.enabled ? 'Aktif' : 'Devre Dışı'}**`)
        .addFields(
            { name: 'Yasaklı Kelime Sayısı', value: `${config.banned_words.length}`, inline: true },
            { name: 'Spam Koruması', value: `${config.spam_protection ? 'Aktif' : 'Devre Dışı'}`, inline: true }
        )
        .setTimestamp();
    
    if (config.spam_protection) {
        embed.addFields(
            { name: 'Spam Eşiği', value: `${config.spam_threshold} mesaj / ${config.spam_interval / 1000} saniye`, inline: true },
            { name: 'Susturma Süresi', value: `${config.spam_timeout / 60000} dakika`, inline: true }
        );
    }
    
    if (config.banned_words.length > 0) {
        const wordsList = config.banned_words.join(', ');
        embed.addFields({ name: 'Yasaklı Kelimeler', value: wordsList });
    }
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
}