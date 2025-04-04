const { Client, EmbedBuilder, Events, GuildMember, Message, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const path = require('path');

class DiscordLogger {
    constructor(client, logChannelId) {
        this.client = client;
        this.logChannelId = logChannelId;
        this.setupLogEvents();
    }

    setupLogEvents() {
        // Üye katılma log'u
        this.client.on(Events.GuildMemberAdd, async (member) => {
            await this.logMemberJoin(member);
        });

        // Üye ayrılma log'u
        this.client.on(Events.GuildMemberRemove, async (member) => {
            await this.logMemberLeave(member);
        });

        // Rol değişikliği log'u
        this.client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            await this.logRoleChanges(oldMember, newMember);
        });
    }

    async getLogChannel() {
        return this.client.channels.cache.get(this.logChannelId);
    }

    async logMemberJoin(member) {
        const logChannel = await this.getLogChannel();
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Üye Sunucuya Katıldı')
            .setDescription(`${member.user.tag} sunucuya katıldı!`)
            .addFields(
                { name: 'Kullanıcı ID', value: member.id },
                { name: 'Hesap Oluşturulma Tarihi', value: member.user.createdAt.toLocaleString() }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        this.writeToLogFile('member_join', { 
            userId: member.id, 
            username: member.user.tag, 
            joinedAt: new Date().toISOString() 
        });
    }

    async logMemberLeave(member) {
        const logChannel = await this.getLogChannel();
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Üye Sunucudan Ayrıldı')
            .setDescription(`${member.user.tag} sunucudan ayrıldı!`)
            .addFields(
                { name: 'Kullanıcı ID', value: member.id },
                { name: 'Sunucudaki Son Zamanı', value: new Date().toLocaleString() }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        this.writeToLogFile('member_leave', { 
            userId: member.id, 
            username: member.user.tag, 
            leftAt: new Date().toISOString() 
        });
    }

    async logRoleChanges(oldMember, newMember) {
        const logChannel = await this.getLogChannel();
        if (!logChannel) return;

        // Rol ekleme
        const addedRoles = newMember.roles.cache
            .filter(role => !oldMember.roles.cache.has(role.id))
            .map(role => role.name);

        // Rol çıkarma
        const removedRoles = oldMember.roles.cache
            .filter(role => !newMember.roles.cache.has(role.id))
            .map(role => role.name);

        if (addedRoles.length === 0 && removedRoles.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('Rol Değişikliği')
            .setDescription(`${newMember.user.tag} kullanıcısının rolleri güncellendi`)
            .addFields(
                { name: 'Eklenen Roller', value: addedRoles.length > 0 ? addedRoles.join(', ') : 'Yok' },
                { name: 'Çıkarılan Roller', value: removedRoles.length > 0 ? removedRoles.join(', ') : 'Yok' }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        this.writeToLogFile('role_change', {
            userId: newMember.id,
            userTag: newMember.user.tag,
            addedRoles: addedRoles,
            removedRoles: removedRoles,
            changedAt: new Date().toISOString()
        });
    }
// logger.js içinde:
async log(guildId, type, data) {
    try {
        // Karmaşık objeyi JSON'a dönüştür
        const jsonData = JSON.stringify(data);
        
        await this.db.run(
            'INSERT INTO logs (guild_id, type, data, timestamp) VALUES (?, ?, ?, ?)',
            [guildId, type, jsonData, Date.now()]
        );
        
        // Log kanalına mesaj gönderme...
    } catch (error) {
        console.error('Log kaydı sırasında hata:', error);
    }
}
    writeToLogFile(logType, data) {
        const logDir = path.join(__dirname, 'logs');
        
        // Log dizinini oluştur
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        const logFileName = `${logType}_${new Date().toISOString().split('T')[0]}.json`;
        const logFilePath = path.join(logDir, logFileName);

        // Mevcut log dosyasını oku
        let logs = [];
        try {
            if (fs.existsSync(logFilePath)) {
                logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
            }
        } catch (error) {
            console.error('Log dosyası okunurken hata:', error);
        }

        // Yeni log kaydını ekle
        logs.push(data);

        // Log dosyasına yaz
        try {
            fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Log dosyasına yazılırken hata:', error);
        }
    }
}

module.exports = DiscordLogger;