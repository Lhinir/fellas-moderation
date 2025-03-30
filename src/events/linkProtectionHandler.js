// src/events/linkProtectionHandler.js

const { EmbedBuilder } = require('discord.js');
const database = require('../modules/database');

// URL tespit etmek için regex
const URL_REGEX = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        try {
            // Bot mesajlarını yoksay
            if (message.author.bot) return;
            
            // DM mesajlarını yoksay
            if (!message.guild) return;
            
            // Link koruması konfigürasyonunu al
            const config = await database.get(
                'SELECT * FROM link_protection WHERE guild_id = ?',
                [message.guild.id]
            );
            
            // Link koruması aktif değilse çık
            if (!config || !config.enabled) return;
            
            // Whitelist kanalları ve rolleri parse et
            let whitelistChannels = [];
            let whitelistRoles = [];
            let whitelistDomains = [];
            
            try {
                whitelistChannels = JSON.parse(config.whitelist_channels || '[]');
                whitelistRoles = JSON.parse(config.whitelist_roles || '[]');
                whitelistDomains = JSON.parse(config.whitelist_domains || '[]');
            } catch (e) {
                console.error('Whitelist parse hatası:', e);
            }
            
            // Kanal beyaz listede mi kontrol et
            if (whitelistChannels.includes(message.channel.id)) {
                return;
            }
            
            // Kullanıcının rolleri beyaz listede mi kontrol et
            const memberRoles = message.member.roles.cache.map(r => r.id);
            if (memberRoles.some(role => whitelistRoles.includes(role))) {
                return;
            }
            
            // Mesaj içinde URL var mı kontrol et
            const urls = message.content.match(URL_REGEX);
            if (!urls) return;
            
            // Tespit edilen URL'leri kontrol et
            let blockedUrls = [];
            
            for (const url of urls) {
                const domain = extractDomain(url);
                
                // Domain beyaz listede değilse engelle
                if (!whitelistDomains.includes(domain)) {
                    blockedUrls.push(url);
                }
            }
            
            // Engellenen URL yoksa çık
            if (blockedUrls.length === 0) return;
            
            // Mesajı sil
            try {
                await message.delete();
            } catch (deleteError) {
                console.error('Link engelleme mesaj silme hatası:', deleteError);
                return;
            }
            
            // Uyarı embedini oluştur
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 Link Engellendi')
                .setDescription(`<@${message.author.id}>, link paylaşımı bu kanalda yasaktır!`)
                .addFields(
                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Link Koruma Sistemi' });
            
            // Uyarıyı kanala gönder
            const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
            
            // Uyarı mesajını belirli bir süre sonra sil (8 saniye)
            setTimeout(() => {
                warningMessage.delete().catch(err => {
                    console.error('Uyarı mesajı silme hatası:', err);
                });
            }, 8000); // 8 saniye
            
            // Log kanalına bildir
            await logLinkRemoval(message.guild, message.author, message.channel, blockedUrls);
            
            console.log(`Link Koruma: ${message.author.tag} tarafından gönderilen link engellendi.`);
            
        } catch (error) {
            console.error('Link koruma hatası:', error);
        }
    }
};

// URL'den domain'i çıkar
function extractDomain(url) {
    let domain = url.toLowerCase();
    
    // http:// veya https:// kaldır
    domain = domain.replace(/^https?:\/\//, '');
    
    // www. kaldır
    domain = domain.replace(/^www\./, '');
    
    // İlk slash'a kadar olan kısmı al
    domain = domain.split('/')[0];
    
    // Parametreleri kaldır
    domain = domain.split('?')[0];
    
    return domain;
}

// Log kanalına link engelleme bildirimi gönder
async function logLinkRemoval(guild, user, channel, blockedUrls) {
    try {
        // Log kanalı ID'sini al
        const logChannels = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, 'moderation']
        );
        
        if (!logChannels || !logChannels.channel_id) return;
        
        const logChannelId = logChannels.channel_id;
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Engellenen linkleri formatla (özel karakterleri escape ederek)
        const blockedUrlsText = blockedUrls.map(url => {
            // Discord özel karakterlerini escape et
            return url.replace(/(\*|_|`|~|\\|\|)/g, '\\$1');
        }).join('\n');
        
        // Log embedini oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('🔗 Link Engellendi')
            .setDescription(`<@${user.id}> kullanıcısının paylaştığı link engellendi.`)
            .addFields(
                { name: 'Kullanıcı', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
                { name: 'Engellenen Linkler', value: blockedUrlsText || 'Gösterilemiyor', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Link Koruma Sistemi' });
        
        // Log gönder
        await logChannel.send({ embeds: [logEmbed] });
        
    } catch (error) {
        console.error('Link engelleme log hatası:', error);
    }
}