// src/buttons/mod_linkprotect.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'mod_linkprotect',
    async execute(interaction) {
        try {
            // Link koruma konfigürasyonunu al
            const config = await database.get(
                'SELECT * FROM link_protection WHERE guild_id = ?',
                [interaction.guild.id]
            );
            
            const isEnabled = config?.enabled ? true : false;
            
            let whitelistChannels = [];
            let whitelistRoles = [];
            let whitelistDomains = [];
            
            if (config) {
                try {
                    whitelistChannels = JSON.parse(config.whitelist_channels || '[]');
                    whitelistRoles = JSON.parse(config.whitelist_roles || '[]');
                    whitelistDomains = JSON.parse(config.whitelist_domains || '[]');
                } catch (e) {
                    console.error('Link koruma whitelist parse hatası:', e);
                }
            }
            
            // Link koruma panel
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🔗 Link Engelleme Ayarları')
                .setDescription('Link engelleme modülünü yapılandırın:')
                .addFields(
                    { name: 'Durum', value: isEnabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
                    { name: 'Beyaz Liste Kanalları', value: whitelistChannels.length > 0 ? `${whitelistChannels.length} kanal` : 'Yok', inline: true },
                    { name: 'Beyaz Liste Rolleri', value: whitelistRoles.length > 0 ? `${whitelistRoles.length} rol` : 'Yok', inline: true },
                    { name: 'Beyaz Liste Domainleri', value: whitelistDomains.length > 0 ? `${whitelistDomains.length} domain` : 'Yok', inline: true }
                );
                
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('linkprotect_toggle')
                        .setLabel(isEnabled ? 'Devre Dışı Bırak' : 'Aktifleştir')
                        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji(isEnabled ? '🔴' : '🟢')
                );
                
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('linkprotect_channels')
                        .setLabel('Kanal Beyaz Listesi')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝'),
                    new ButtonBuilder()
                        .setCustomId('linkprotect_roles')
                        .setLabel('Rol Beyaz Listesi')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👥'),
                    new ButtonBuilder()
                        .setCustomId('linkprotect_domains')
                        .setLabel('Domain Beyaz Listesi')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🌐')
                );
                
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_moderation')
                        .setLabel('Ana Panele Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('◀️')
                );
                
            await interaction.update({ embeds: [embed], components: [row1] });
        } catch (error) {
            console.error('Link koruma panel hatası:', error);
            await interaction.reply({ content: 'Link koruma ayarları yüklenirken bir hata oluştu.', ephemeral: true });
        }
    }
};