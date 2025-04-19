// src/utils/duyuruManager.js

// Son duyuru mesajlarını sunucu ID'sine göre saklayan nesne
const sonDuyurular = new Map();

/**
 * Son duyuru mesajını kaydeder
 * @param {string} guildId Sunucu ID'si
 * @param {string} type Duyuru tipi ('bakım' veya 'aktif')
 * @param {string} messageId Mesaj ID'si
 * @param {string} channelId Kanal ID'si
 */
function duyuruKaydet(guildId, type, messageId, channelId) {
    if (!sonDuyurular.has(guildId)) {
        sonDuyurular.set(guildId, {});
    }
    
    sonDuyurular.get(guildId)[type] = {
        messageId,
        channelId,
        timestamp: Date.now()
    };
}

/**
 * Son duyuru mesaj bilgilerini getirir
 * @param {string} guildId Sunucu ID'si
 * @param {string} type Duyuru tipi ('bakım' veya 'aktif')
 * @returns {Object|null} Mesaj bilgileri veya null
 */
function sonDuyuruyuGetir(guildId, type) {
    if (!sonDuyurular.has(guildId) || !sonDuyurular.get(guildId)[type]) {
        return null;
    }
    
    return sonDuyurular.get(guildId)[type];
}

module.exports = {
    duyuruKaydet,
    sonDuyuruyuGetir
};