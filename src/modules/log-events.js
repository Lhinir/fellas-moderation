// src/modules/log-events.js

const { EmbedBuilder } = require('discord.js');
const database = require('./database');

async function sendLog(guild, type, description, options = {}) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(guild.id, type);
        if (!logChannelId) return;

        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Eğer description bir nesne ise (eski versiyon uyumluluğu için)
        // bu nesneyi options'a taşı ve description'ı belirlenen değere ayarla
        if (typeof description === 'object' && description !== null) {
            options = { ...description, ...options };
            description = options.description || 'Log kaydı oluşturuldu.';
        }

        // Description boş string olarak gelirse, varsayılan değer ver
        if (description === '') {
            description = 'Log kaydı oluşturuldu.';
        }

        const embed = new EmbedBuilder()
            .setColor(options.color || '#3498db')
            .setTitle(options.title || `${type.charAt(0).toUpperCase() + type.slice(1)} Log`);
        
        // Description ayarla
        embed.setDescription(description);

        // Ek alanlar
        if (options.fields && Array.isArray(options.fields)) {
            for (const field of options.fields) {
                if (field.name && field.value) {
                    embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
                }
            }
        }

        // Footer ve timestamp
        if (options.footer) {
            embed.setFooter({ text: options.footer });
        }

        if (options.timestamp) {
            embed.setTimestamp(options.timestamp);
        } else {
            embed.setTimestamp();
        }

        // Thumbnail
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }

        // Logu gönder
        await logChannel.send({ embeds: [embed] });
        return true;
    } catch (error) {
        console.error('Log gönderme hatası:', error);
        return false;
    }
}

module.exports = {
    sendLog
};