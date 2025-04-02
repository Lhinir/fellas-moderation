// src/utils/panel_navigation.js

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Panel navigasyon butonlarını oluşturur
 * @param {string} currentPanel - Şu anki panel türü (main, moderation, roles, rewards, settings)
 * @param {Array} additionalButtons - Ek butonlar
 * @returns {ActionRowBuilder} Buton satırı
 */
function createNavigationButtons(currentPanel = 'main', additionalButtons = []) {
    const row = new ActionRowBuilder();
    
    // Eğer ana panelde değilsek, "Ana Panele Dön" butonu ekle
    if (currentPanel !== 'main') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('panel_main')
                .setLabel('Ana Panele Dön')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠')
        );
    }
    
    // Eğer moderasyon panelindeyken alt menüdeyse, "Moderasyon Paneline Dön" butonu ekle
    if (currentPanel === 'mod_submenu') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('panel_moderation')
                .setLabel('Moderasyon Paneline Dön')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );
    }
    // Eğer ayarlar panelindeyken alt menüdeyse, "Ayarlar Paneline Dön" butonu ekle
    if (currentPanel === 'settings_submenu') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('panel_settings')
                .setLabel('Ayarlar Paneline Dön')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );
    }
    
    // Ek butonları ekle
    if (additionalButtons && additionalButtons.length > 0) {
        for (const button of additionalButtons) {
            row.addComponents(button);
        }
    }
    
    return row;
}

module.exports = { createNavigationButtons };