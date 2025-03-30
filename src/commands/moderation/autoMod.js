// src/commands/moderation/automod.js - Düzeltilmiş versiyon

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

// Veritabanı fonksiyonları
async function createAutoModTableIfNotExists() {
    try {
        // Tablo var mı kontrol et
        const tableExists = await database.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='automod_configs'"
        );
        
        if (!tableExists) {
            // Eğer tablo yoksa oluştur
            await database.run(`
                CREATE TABLE IF NOT EXISTS automod_configs (
                    guild_id TEXT PRIMARY KEY,
                    enabled INTEGER DEFAULT 0,
                    banned_words TEXT DEFAULT '[]',
                    spam_protection INTEGER DEFAULT 0,
                    spam_threshold INTEGER DEFAULT 5,
                    spam_interval INTEGER DEFAULT 5000,
                    spam_timeout INTEGER DEFAULT 300000,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('AutoMod tablosu oluşturuldu.');
        }
    } catch (error) {
        console.error('AutoMod tablosu oluşturma hatası:', error);
        throw error;
    }
}

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
                'INSERT OR IGNORE INTO automod_configs (guild_id, enabled, banned_words, spam_protection, spam_threshold, spam_interval, spam_timeout) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildId, 0, '[]', 0, 5, 5000, 300000]
            );
            
            config = await database.get(
                'SELECT * FROM automod_configs WHERE guild_id = ?',
                [guildId]
            );
            
            if (!config) {
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
        }
        
        // JSON string'i parse et
        try {
            config.banned_words = JSON.parse(config.banned_words || '[]');
        } catch (e) {
            config.banned_words = [];
            console.error('Yasaklı kelime listesi parse hatası:', e);
        }
        
        return config;
    } catch (error) {
        console.error('AutoMod konfigürasyonu alınamadı:', error);
        throw error;
    }
}

// Komut işlevleri
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

async function toggleAutoMod(interaction, config, state) {
    const newState = state === 'enable';
    
    try {
        await database.run(
            'UPDATE automod_configs SET enabled = ? WHERE guild_id = ?',
            [newState ? 1 : 0, interaction.guild.id]
        );
        
        return interaction.reply({
            content: `AutoMod **${newState ? 'Aktif' : 'Devre Dışı'}** durumuna getirildi.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('AutoMod toggle hatası:', error);
        throw error;
    }
}

async function handleBannedWords(interaction, config, action, word) {
    if (action === 'view') {
        if (config.banned_words.length === 0) {
            return interaction.reply({
                content: 'Yasaklı kelime listesi boş.',
                ephemeral: true
            });
        }
        
        const wordsList = config.banned_words.join(', ');
        return interaction.reply({
            content: `**Yasaklı Kelimeler**:\n${wordsList}`,
            ephemeral: true
        });
    }
    else if (action === 'add') {
        if (!word) {
            return interaction.reply({
                content: 'Eklenecek kelimeyi belirtmelisiniz.',
                ephemeral: true
            });
        }
        
        if (config.banned_words.includes(word)) {
            return interaction.reply({
                content: `"${word}" zaten yasaklı kelime listesinde.`,
                ephemeral: true
            });
        }
        
        // Kelimeyi ekle
        config.banned_words.push(word);
        
        // Veritabanını güncelle
        try {
            await database.run(
                'UPDATE automod_configs SET banned_words = ? WHERE guild_id = ?',
                [JSON.stringify(config.banned_words), interaction.guild.id]
            );
            
            return interaction.reply({
                content: `"${word}" yasaklı kelime listesine eklendi.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Yasaklı kelime ekleme hatası:', error);
            throw error;
        }
    }
    else if (action === 'remove') {
        if (!word) {
            return interaction.reply({
                content: 'Çıkarılacak kelimeyi belirtmelisiniz.',
                ephemeral: true
            });
        }
        
        const index = config.banned_words.indexOf(word);
        if (index === -1) {
            return interaction.reply({
                content: `"${word}" yasaklı kelime listesinde bulunamadı.`,
                ephemeral: true
            });
        }
        
        // Kelimeyi çıkar
        config.banned_words.splice(index, 1);
        
        // Veritabanını güncelle
        try {
            await database.run(
                'UPDATE automod_configs SET banned_words = ? WHERE guild_id = ?',
                [JSON.stringify(config.banned_words), interaction.guild.id]
            );
            
            return interaction.reply({
                content: `"${word}" yasaklı kelime listesinden çıkarıldı.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Yasaklı kelime çıkarma hatası:', error);
            throw error;
        }
    }
    else if (action === 'clear') {
        // Listeyi temizle
        config.banned_words = [];
        
        // Veritabanını güncelle
        try {
            await database.run(
                'UPDATE automod_configs SET banned_words = ? WHERE guild_id = ?',
                ['[]', interaction.guild.id]
            );
            
            return interaction.reply({
                content: 'Yasaklı kelime listesi temizlendi.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Yasaklı kelime listesi temizleme hatası:', error);
            throw error;
        }
    }
}

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
        try {
            await database.run(
                'UPDATE automod_configs SET spam_protection = 1 WHERE guild_id = ?',
                [interaction.guild.id]
            );
            
            return interaction.reply({
                content: `Spam koruması **aktifleştirildi**. ${config.spam_interval / 1000} saniye içinde ${config.spam_threshold} mesaj gönderenler ${config.spam_timeout / 60000} dakika susturulacak.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Spam koruması etkinleştirme hatası:', error);
            throw error;
        }
    }
    else if (action === 'disable') {
        try {
            await database.run(
                'UPDATE automod_configs SET spam_protection = 0 WHERE guild_id = ?',
                [interaction.guild.id]
            );
            
            return interaction.reply({
                content: 'Spam koruması **devre dışı bırakıldı**.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Spam koruması devre dışı bırakma hatası:', error);
            throw error;
        }
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
    
    // Değişecek değerleri güncelle
    const updates = {};
    const changes = [];
    
    if (threshold) {
        updates.spam_threshold = threshold;
        changes.push(`Eşik değeri: ${threshold} mesaj`);
    }
    
    if (interval) {
        updates.spam_interval = interval * 1000; // Saniyeyi milisaniyeye çevir
        changes.push(`Kontrol süresi: ${interval} saniye`);
    }
    
    if (timeout) {
        updates.spam_timeout = timeout * 60000; // Dakikayı milisaniyeye çevir
        changes.push(`Susturma süresi: ${timeout} dakika`);
    }
    
    // SQL sorgusunu ve parametreleri oluştur
    let sql = 'UPDATE automod_configs SET ';
    const setClauses = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
    }
    
    sql += setClauses.join(', ');
    sql += ' WHERE guild_id = ?';
    params.push(interaction.guild.id);
    
    try {
        await database.run(sql, params);
        
        return interaction.reply({
            content: `Spam koruması ayarları güncellendi:\n${changes.join('\n')}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Spam ayarları güncelleme hatası:', error);
        throw error;
    }
}