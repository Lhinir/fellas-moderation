// src/buttons/mod_automod.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../modules/database');

module.exports = {
    customId: 'mod_automod',
    async execute(interaction) {
        try {
            // AutoMod konfigürasyonunu al
            const config = await database.get(
                'SELECT * FROM automod_configs WHERE guild_id = ?',
                [interaction.guild.id]
            );
            
            const isEnabled = config?.enabled ? true : false;
            const spamProtection = config?.spam_protection ? true : false;
            
            let bannedWords = [];
            if (config?.banned_words) {
                try {
                    bannedWords = JSON.parse(config.banned_words);
                } catch (e) {
                    bannedWords = [];
                }
            }
            
            // AutoMod panel
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🤖 AutoMod Ayarları')
                .setDescription('AutoMod modülünü yapılandırın:')
                .addFields(
                    { name: 'Durum', value: isEnabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
                    { name: 'Spam Koruması', value: spamProtection ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
                    { name: 'Yasaklı Kelimeler', value: bannedWords.length > 0 ? `${bannedWords.length} kelime` : 'Yok', inline: true }
                );
                
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_toggle')
                        .setLabel(isEnabled ? 'Devre Dışı Bırak' : 'Aktifleştir')
                        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji(isEnabled ? '🔴' : '🟢'),
                    new ButtonBuilder()
                        .setCustomId('automod_spam')
                        .setLabel(spamProtection ? 'Spam Korumasını Kapat' : 'Spam Korumasını Aç')
                        .setStyle(spamProtection ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji('🚫')
                );
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_moderation')
                        .setLabel('Ana Panale Dön')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('◀️')
                );
                
            await interaction.update({ embeds: [embed], components: [row1, row2] });
        } catch (error) {
            console.error('AutoMod panel hatası:', error);
            await interaction.reply({ content: 'AutoMod ayarları yüklenirken bir hata oluştu.', ephemeral: true });
        }
    }
};