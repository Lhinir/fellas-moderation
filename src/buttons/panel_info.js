// src/buttons/panel_info.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require('discord.js');
const { version: botVersion } = require('../../package.json');
const os = require('os');

module.exports = {
    customId: 'panel_info',
    async execute(interaction) {
        // CPU ve RAM kullanımı hesaplama
        const cpuCount = os.cpus().length;
        const memoryTotal = Math.round(os.totalmem() / 1024 / 1024);
        const memoryUsed = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
        const memoryUsage = Math.round((memoryUsed / memoryTotal) * 100);
        
        // Uptime hesaplama
        const uptime = process.uptime();
        const uptimeString = formatUptime(uptime);
        
        // Bot istatistikleri
        const serverCount = interaction.client.guilds.cache.size;
        const userCount = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const channelCount = interaction.client.channels.cache.size;
        
        // Bot versiyon bilgileri
        const discordJsVersion = version;
        const nodeVersion = process.version;
        
        // Bilgi paneli
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('ℹ️ Bot Bilgileri')
            .setDescription('Bot hakkında teknik bilgiler ve istatistikler:')
            .addFields(
                { name: 'Bot Versiyonu', value: botVersion || 'v1.0.0', inline: true },
                { name: 'Discord.js', value: discordJsVersion, inline: true },
                { name: 'Node.js', value: nodeVersion, inline: true },
                { name: 'Çalışma Süresi', value: uptimeString, inline: true },
                { name: 'CPU Çekirdekleri', value: cpuCount.toString(), inline: true },
                { name: 'Bellek Kullanımı', value: `${memoryUsed}MB / ${memoryTotal}MB (${memoryUsage}%)`, inline: true },
                { name: 'Sunucu Sayısı', value: serverCount.toString(), inline: true },
                { name: 'Kullanıcı Sayısı', value: userCount.toString(), inline: true },
                { name: 'Kanal Sayısı', value: channelCount.toString(), inline: true }
            );
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Ana Menü')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
            );
            
        await interaction.update({ embeds: [embed], components: [row] });
    }
};

// Uptime formatı
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (secs > 0) parts.push(`${secs} saniye`);
    
    return parts.join(', ');
}