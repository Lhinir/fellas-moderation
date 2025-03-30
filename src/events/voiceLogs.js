// src/events/voiceLogs.js

const { Events } = require('discord.js');
const logEvents = require('../modules/log-events');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('Ses log dinleyicileri başlatılıyor...');
        
        // Ses durumu değişikliği
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            try {
                const member = newState.member || oldState.member;
                if (!member || member.user.bot) return; // Bot olmayan üyeler için
                
                const guild = newState.guild || oldState.guild;
                
                // Kullanıcı ses kanalına katıldı
                if (!oldState.channel && newState.channel) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#00ff00',
                        title: '🔊 Ses Kanalına Katıldı',
                        description: `**${member.user.tag}** ses kanalına katıldı`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Kanal', value: `<#${newState.channel.id}> (${newState.channel.name})`, inline: true }
                        ]
                    });
                }
                
                // Kullanıcı ses kanalından ayrıldı
                else if (oldState.channel && !newState.channel) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#ff0000',
                        title: '🔇 Ses Kanalından Ayrıldı',
                        description: `**${member.user.tag}** ses kanalından ayrıldı`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Kanal', value: `<#${oldState.channel.id}> (${oldState.channel.name})`, inline: true }
                        ]
                    });
                }
                
                // Kullanıcı ses kanalını değiştirdi
                else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#ffaa00',
                        title: '↔️ Ses Kanalı Değiştirildi',
                        description: `**${member.user.tag}** ses kanalını değiştirdi`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Önceki Kanal', value: `<#${oldState.channel.id}> (${oldState.channel.name})`, inline: true },
                            { name: 'Yeni Kanal', value: `<#${newState.channel.id}> (${newState.channel.name})`, inline: true }
                        ]
                    });
                }
                
                // Kullanıcı kendini susturdu/susturmayı kaldırdı
                else if (oldState.selfMute !== newState.selfMute) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#ffaa00',
                        title: newState.selfMute ? '🔇 Kendi Mikrofonunu Kapattı' : '🔊 Kendi Mikrofonunu Açtı',
                        description: `**${member.user.tag}** ${newState.selfMute ? 'kendi mikrofonunu kapattı' : 'kendi mikrofonunu açtı'}`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Kanal', value: `<#${newState.channel.id}> (${newState.channel.name})`, inline: true }
                        ]
                    });
                }
                
                // Kullanıcı kulaklığını kapattı/açtı
                else if (oldState.selfDeaf !== newState.selfDeaf) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#ffaa00',
                        title: newState.selfDeaf ? '🔇 Kendi Kulaklığını Kapattı' : '🔊 Kendi Kulaklığını Açtı',
                        description: `**${member.user.tag}** ${newState.selfDeaf ? 'kendi kulaklığını kapattı' : 'kendi kulaklığını açtı'}`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Kanal', value: `<#${newState.channel.id}> (${newState.channel.name})`, inline: true }
                        ]
                    });
                }
                
                // Sunucu tarafından susturuldu/susturma kaldırıldı
                else if (oldState.serverMute !== newState.serverMute) {
                    await logEvents.sendLog(guild, 'voice', {
                        color: '#ffaa00',
                        title: newState.serverMute ? '🔇 Sunucu Tarafından Susturuldu' : '🔊 Sunucu Susturması Kaldırıldı',
                        description: `**${member.user.tag}** ${newState.serverMute ? 'sunucu tarafından susturuldu' : 'sunucu susturması kaldırıldı'}`,
                        fields: [
                            { name: 'Kullanıcı', value: `<@${member.id}> (${member.id})`, inline: true },
                            { name: 'Kanal', value: `<#${newState.channel.id}> (${newState.channel.name})`, inline: true }
                        ]
                    });
                }
                
            } catch (error) {
                console.error('Ses durumu log hatası:', error);
            }
        });
        
        console.log('Ses log dinleyicileri başlatıldı!');
    }
};