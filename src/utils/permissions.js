// src/utils/permissions.js

// Botun komutlarını kullanma yetkisine sahip rollerin ID'leri
const AUTHORIZED_ROLE_IDS = [
    process.env.AUTHORIZED_ROLE_ID_1,
    process.env.AUTHORIZED_ROLE_ID_2
].filter(Boolean); // null/undefined değerleri temizler


// Bazı komutlar için bypass edilecek kullanıcı ID'leri (ör. bot sahibi)
const BYPASSED_USER_IDS = [
    '33333333333333333333' // Bot sahibinin ID'si
];

/**
 * Kullanıcının botu kullanma yetkisine sahip olup olmadığını kontrol eder
 * @param {GuildMember} member Discord.js GuildMember objesi
 * @returns {boolean} Yetki durumu
 */
function hasBotPermission(member) {
    // Bot sahibi veya bypass listesindeki kullanıcılar her zaman yetkilendirilmiştir
    if (BYPASSED_USER_IDS.includes(member.user.id)) {
        return true;
    }
    
    // Sunucu sahibi her zaman yetkilendirilmiştir
    if (member.id === member.guild.ownerId) {
        return true;
    }
    
    // Yetkilendirilmiş rollere sahip mi kontrol et
    return member.roles.cache.some(role => AUTHORIZED_ROLE_IDS.includes(role.id));
}

module.exports = {
    AUTHORIZED_ROLE_IDS,
    BYPASSED_USER_IDS,
    hasBotPermission
};