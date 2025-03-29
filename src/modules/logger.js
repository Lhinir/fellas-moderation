// src/modules/logger.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(client) {
        this.client = client;
        this.logFolderPath = path.join(__dirname, '../../logs');
        this.ensureLogFolder();
    }

    ensureLogFolder() {
        if (!fs.existsSync(this.logFolderPath)) {
            fs.mkdirSync(this.logFolderPath, { recursive: true });
        }
    }

    async log(guildId, type, content) {
        try {
            // Log dosyasına kaydet
            const logFilePath = path.join(this.logFolderPath, `${guildId}_${type}_log.txt`);
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${JSON.stringify(content)}\n`;
            
            fs.appendFileSync(logFilePath, logEntry);
            
            // Discord kanalına gönder (eğer ayarlanmışsa)
            const guild = this.client.guilds.cache.get(guildId);
            if (guild) {
                const guildConfig = await this.client.database.getGuildConfig(guildId);
                if (guildConfig && guildConfig.logChannelId) {
                    const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        // HTML formatında log dosyası oluştur
                        const htmlContent = this.generateHtmlLog(type, content);
                        const htmlFilePath = path.join(this.logFolderPath, `${guildId}_${type}_log.html`);
                        fs.writeFileSync(htmlFilePath, htmlContent);
                        
                        // HTML dosyasını gönder
                        await logChannel.send({
                            content: `📋 ${type.toUpperCase()} Log - ${timestamp}`,
                            files: [{
                                attachment: htmlFilePath,
                                name: `${type}_log.html`
                            }]
                        });
                        
                        // Ayrıca bir embed olarak da özet bilgi gönder
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`${type.toUpperCase()} Log`)
                            .setDescription(`${content.description || 'Log kaydı oluşturuldu.'}`)
                            .setTimestamp();
                        
                        // İçeriğe bağlı olarak embed'e farklı alanlar ekle
                        if (content.user) {
                            embed.addFields({ name: 'Kullanıcı', value: `<@${content.user.id}>`, inline: true });
                        }
                        if (content.channel) {
                            embed.addFields({ name: 'Kanal', value: `<#${content.channel.id}>`, inline: true });
                        }
                        if (content.reason) {
                            embed.addFields({ name: 'Sebep', value: content.reason });
                        }
                        
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            }
        } catch (error) {
            console.error('Log kaydı oluşturulurken hata:', error);
        }
    }

    generateHtmlLog(type, content) {
        const timestamp = new Date().toISOString();
        let detailsHtml = '';
        
        // İçeriğe göre detayları oluştur
        Object.entries(content).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                detailsHtml += `<tr><td><strong>${key}</strong></td><td>${JSON.stringify(value)}</td></tr>`;
            } else {
                detailsHtml += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`;
            }
        });
        
        return `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${type.toUpperCase()} Log - ${timestamp}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #0066cc; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                tr:hover { background-color: #f5f5f5; }
                .timestamp { color: #666; font-style: italic; }
            </style>
        </head>
        <body>
            <h1>${type.toUpperCase()} Log</h1>
            <p class="timestamp">Oluşturulma Zamanı: ${timestamp}</p>
            <table>
                <thead>
                    <tr>
                        <th>Alan</th>
                        <th>Değer</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailsHtml}
                </tbody>
            </table>
        </body>
        </html>
        `;
    }
}

module.exports = Logger;