// src/commands/moderation/linkprotect.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkkoruma')
        .setDescription('Link koruma ayarlarını yönetir')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Link koruma durumunu görüntüler'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Link korumayı açıp kapatır')
                .addStringOption(option =>
                    option.setName('state')
                        .setDescription('Koruma durumu')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Aktif', value: 'enable' },
                            { name: 'Devre Dışı', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist-channel')
                .setDescription('Kanal beyaz listeye ekler/çıkarır')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Kanal')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Eylem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ekle', value: 'add' },
                            { name: 'Çıkar', value: 'remove' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist-role')
                .setDescription('Rol beyaz listeye ekler/çıkarır')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Rol')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Eylem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ekle', value: 'add' },
                            { name: 'Çıkar', value: 'remove' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist-domain')
                .setDescription('Domain beyaz listeye ekler/çıkarır')
                .addStringOption(option =>
                    option.setName('domain')
                        .setDescription('Domain (örn: discord.com)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Eylem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ekle', value: 'add' },
                            { name: 'Çıkar', value: 'remove' }
                        )))
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
            
            // Link koruması yapılandırmasını al veya oluştur
            const config = await getLinkProtectionConfig(interaction.guild.id);
            
            if (subcommand === 'status') {
                return showLinkProtectionStatus(interaction, config);
            }
            else if (subcommand === 'toggle') {
                const state = interaction.options.getString('state');
                return toggleLinkProtection(interaction, config, state);
            }
            else if (subcommand === 'whitelist-channel') {
                const channel = interaction.options.getChannel('channel');
                const action = interaction.options.getString('action');
                return handleWhitelistChannel(interaction, config, channel, action);
            }
            else if (subcommand === 'whitelist-role') {
                const role = interaction.options.getRole('role');
                const action = interaction.options.getString('action');
                return handleWhitelistRole(interaction, config, role, action);
            }
            else if (subcommand === 'whitelist-domain') {
                const domain = interaction.options.getString('domain');
                const action = interaction.options.getString('action');
                return handleWhitelistDomain(interaction, config, domain, action);
            }
        } catch (error) {
            console.error('LinkProtect komutunda hata:', error);
            return interaction.reply({
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            });
        }
    }
};

// Link koruma yapılandırmasını al
async function getLinkProtectionConfig(guildId) {
    try {
        // Önce mevcut konfigürasyonu al
        let config = await database.get(
            'SELECT * FROM link_protection WHERE guild_id = ?',
            [guildId]
        );
        
        // Eğer konfig yoksa yeni oluştur
        if (!config) {
            await database.run(
                'INSERT OR IGNORE INTO link_protection (guild_id, enabled, whitelist_channels, whitelist_roles, whitelist_domains) VALUES (?, ?, ?, ?, ?)',
                [guildId, 0, '[]', '[]', '[]']
            );
            
            config = await database.get(
                'SELECT * FROM link_protection WHERE guild_id = ?',
                [guildId]
            );
        }
        
        // JSON string'leri parse et
        try {
            config.whitelist_channels = JSON.parse(config.whitelist_channels || '[]');
            config.whitelist_roles = JSON.parse(config.whitelist_roles || '[]');
            config.whitelist_domains = JSON.parse(config.whitelist_domains || '[]');
        } catch (e) {
            config.whitelist_channels = [];
            config.whitelist_roles = [];
            config.whitelist_domains = [];
        }
        
        return config;
    } catch (error) {
        console.error('Link koruma konfigürasyonu alınamadı:', error);
        throw error;
    }
}

// Durumu göster
async function showLinkProtectionStatus(interaction, config) {
    const embed = new EmbedBuilder()
        .setColor(config.enabled ? '#00ff00' : '#ff0000')
        .setTitle('🔗 Link Koruma Durumu')
        .setDescription(`Link koruma şu anda **${config.enabled ? 'Aktif' : 'Devre Dışı'}**`)
        .setTimestamp();
    
    // Beyaz liste kanalları
    if (config.whitelist_channels && config.whitelist_channels.length > 0) {
        const channelList = config.whitelist_channels.map(id => `<#${id}>`).join(', ');
        embed.addFields({ name: 'Beyaz Liste Kanalları', value: channelList });
    } else {
        embed.addFields({ name: 'Beyaz Liste Kanalları', value: 'Hiç kanal eklenmemiş' });
    }
    
    // Beyaz liste rolleri
    if (config.whitelist_roles && config.whitelist_roles.length > 0) {
        const roleList = config.whitelist_roles.map(id => `<@&${id}>`).join(', ');
        embed.addFields({ name: 'Beyaz Liste Rolleri', value: roleList });
    } else {
        embed.addFields({ name: 'Beyaz Liste Rolleri', value: 'Hiç rol eklenmemiş' });
    }
    
    // Beyaz liste domainleri
    if (config.whitelist_domains && config.whitelist_domains.length > 0) {
        const domainList = config.whitelist_domains.join(', ');
        embed.addFields({ name: 'Beyaz Liste Domainleri', value: domainList });
    } else {
        embed.addFields({ name: 'Beyaz Liste Domainleri', value: 'Hiç domain eklenmemiş' });
    }
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
}

// Link korumayı aç/kapat
async function toggleLinkProtection(interaction, config, state) {
    const newState = state === 'enable';
    
    try {
        await database.run(
            'UPDATE link_protection SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
            [newState ? 1 : 0, interaction.guild.id]
        );
        
        return interaction.reply({
            content: `Link koruma **${newState ? 'Aktif' : 'Devre Dışı'}** durumuna getirildi.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Link koruma toggle hatası:', error);
        throw error;
    }
}

// Kanal beyaz listeye ekle/çıkar
async function handleWhitelistChannel(interaction, config, channel, action) {
    if (action === 'add') {
        // Kanal zaten listedeyse
        if (config.whitelist_channels.includes(channel.id)) {
            return interaction.reply({
                content: `<#${channel.id}> zaten beyaz listede!`,
                ephemeral: true
            });
        }
        
        // Kanalı ekle
        config.whitelist_channels.push(channel.id);
    } else if (action === 'remove') {
        // Kanal listede yoksa
        if (!config.whitelist_channels.includes(channel.id)) {
            return interaction.reply({
                content: `<#${channel.id}> beyaz listede değil!`,
                ephemeral: true
            });
        }
        
        // Kanalı çıkar
        config.whitelist_channels = config.whitelist_channels.filter(id => id !== channel.id);
    }
    
    // Veritabanını güncelle
    try {
        await database.run(
            'UPDATE link_protection SET whitelist_channels = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
            [JSON.stringify(config.whitelist_channels), interaction.guild.id]
        );
        
        return interaction.reply({
            content: `<#${channel.id}> beyaz listeden ${action === 'add' ? 'eklendi' : 'çıkarıldı'}.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Beyaz liste kanal güncelleme hatası:', error);
        throw error;
    }
}

// Rol beyaz listeye ekle/çıkar
async function handleWhitelistRole(interaction, config, role, action) {
    if (action === 'add') {
        // Rol zaten listedeyse
        if (config.whitelist_roles.includes(role.id)) {
            return interaction.reply({
                content: `<@&${role.id}> zaten beyaz listede!`,
                ephemeral: true
            });
        }
        
        // Rolü ekle
        config.whitelist_roles.push(role.id);
    } else if (action === 'remove') {
        // Rol listede yoksa
        if (!config.whitelist_roles.includes(role.id)) {
            return interaction.reply({
                content: `<@&${role.id}> beyaz listede değil!`,
                ephemeral: true
            });
        }
        
        // Rolü çıkar
        config.whitelist_roles = config.whitelist_roles.filter(id => id !== role.id);
    }
    
    // Veritabanını güncelle
    try {
        await database.run(
            'UPDATE link_protection SET whitelist_roles = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
            [JSON.stringify(config.whitelist_roles), interaction.guild.id]
        );
        
        return interaction.reply({
            content: `<@&${role.id}> beyaz listeden ${action === 'add' ? 'eklendi' : 'çıkarıldı'}.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Beyaz liste rol güncelleme hatası:', error);
        throw error;
    }
}

// Domain beyaz listeye ekle/çıkar
async function handleWhitelistDomain(interaction, config, domain, action) {
    // Domain'i normalize et (http://, https://, www. kısımlarını kaldır)
    const normalizedDomain = normalizeDomain(domain);
    
    if (action === 'add') {
        // Domain zaten listedeyse
        if (config.whitelist_domains.includes(normalizedDomain)) {
            return interaction.reply({
                content: `\`${normalizedDomain}\` zaten beyaz listede!`,
                ephemeral: true
            });
        }
        
        // Domain'i ekle
        config.whitelist_domains.push(normalizedDomain);
    } else if (action === 'remove') {
        // Domain listede yoksa
        if (!config.whitelist_domains.includes(normalizedDomain)) {
            return interaction.reply({
                content: `\`${normalizedDomain}\` beyaz listede değil!`,
                ephemeral: true
            });
        }
        
        // Domain'i çıkar
        config.whitelist_domains = config.whitelist_domains.filter(d => d !== normalizedDomain);
    }
    
    // Veritabanını güncelle
    try {
        await database.run(
            'UPDATE link_protection SET whitelist_domains = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
            [JSON.stringify(config.whitelist_domains), interaction.guild.id]
        );
        
        return interaction.reply({
            content: `\`${normalizedDomain}\` beyaz listeden ${action === 'add' ? 'eklendi' : 'çıkarıldı'}.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Beyaz liste domain güncelleme hatası:', error);
        throw error;
    }
}

// Domain'i normalize et
function normalizeDomain(domain) {
    let normalizedDomain = domain.toLowerCase();
    
    // http:// veya https:// kaldır
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    
    // www. kaldır
    normalizedDomain = normalizedDomain.replace(/^www\./, '');
    
    // Sondaki slash'ı kaldır
    normalizedDomain = normalizedDomain.replace(/\/$/, '');
    
    // Parametreleri kaldır (? sonrası)
    normalizedDomain = normalizedDomain.split('?')[0];
    
    // Path kısmını kaldır (/ sonrası, eğer domain'in kendisindeki ilk / değilse)
    const pathStart = normalizedDomain.indexOf('/', normalizedDomain.indexOf('.') + 1);
    if (pathStart !== -1) {
        normalizedDomain = normalizedDomain.substring(0, pathStart);
    }
    
    return normalizedDomain;
}