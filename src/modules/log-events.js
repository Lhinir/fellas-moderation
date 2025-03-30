// src/modules/log-events.js

const { EmbedBuilder } = require('discord.js');
const database = require('./database');

/**
 * Genel log gönderme fonksiyonu
 * @param {Object} guild - Discord Guild nesnesi
 * @param {String} type - Log türü (server, moderation, message, member, voice, audit)
 * @param {Object} embedData - Gönderilecek embed verisi
 */
async function sendLog(guild, type, embedData) {
    try {
        // Log kanalı ID'sini al
        const logChannels = await database.get(
            'SELECT channel_id FROM log_channels WHERE guild_id = ? AND type = ?',
            [guild.id, type]
        );
        
        if (!logChannels || !logChannels.channel_id) return false;
        
        const logChannelId = logChannels.channel_id;
        
        // Log kanalına eriş
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return false;
        
        // Embed'i oluştur
        const embed = new EmbedBuilder()
            .setColor(embedData.color || '#0099ff')
            .setTitle(embedData.title || 'Log')
            .setDescription(embedData.description || '')
            .setTimestamp();
        
        // Opsiyonel alanları ekle
        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(...embedData.fields);
        }
        
        if (embedData.thumbnail) {
            embed.setThumbnail(embedData.thumbnail);
        }
        
        if (embedData.image) {
            embed.setImage(embedData.image);
        }
        
        if (embedData.author) {
            embed.setAuthor(embedData.author);
        }
        
        if (embedData.footer) {
            embed.setFooter(embedData.footer);
        }
        
        // Log gönder
        await logChannel.send({ embeds: [embed] });
        return true;
    } catch (error) {
        console.error(`${type} log gönderme hatası:`, error);
        return false;
    }
}

module.exports = {
    sendLog
};