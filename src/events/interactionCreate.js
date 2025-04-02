// src/events/interactionCreate.js

// Botun komutlarını kullanma yetkisine sahip rollerin ID'leri
const AUTHORIZED_ROLE_IDS = [
    process.env.AUTHORIZED_ROLE_ID_1,
    process.env.AUTHORIZED_ROLE_ID_2
].filter(Boolean); // null, undefined veya boş string'leri filtrele

// Bypass edilecek kullanıcı ID'leri (.env'den)
const BYPASSED_USER_IDS = [
    process.env.BOT_OWNER_ID  // Bot sahibinin ID'si
].filter(Boolean);

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
    name: 'interactionCreate',
    async execute(interaction) {
        // Bot'un yeterli izinleri olup olmadığını kontrol et
        if (interaction.guild && interaction.guild.members.me && 
            !interaction.guild.members.me.permissions.has('SendMessages')) {
            // Eğer bot mesaj gönderme yetkisine sahip değilse çık
            return;
        }

        // ////////////////////////////////////////////////////////////
        // Slash komutları işle
        if (interaction.isChatInputCommand()) {
            // Yetki kontrolü yap
            if (!hasBotPermission(interaction.member)) {
                // Yetkili rolleri kullanıcı dostu şekilde listele
                const authorizedRoles = AUTHORIZED_ROLE_IDS.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `<@&${id}>` : 'Bilinmeyen Rol';
                }).join(' veya ');
                
                return interaction.reply({ 
                    content: `Bu botu kullanma yetkiniz bulunmuyor. Sadece ${authorizedRoles} rolüne sahip kullanıcılar bu botu kullanabilir.`, 
                    ephemeral: true 
                });
            }

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`${interaction.commandName} komutuna karşılık gelen bir komut bulunamadı.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true });
                }
            }
        }
        // ////////////////////////////////////////////////////////////
        // Butonları işle
        else if (interaction.isButton()) {
            // Yetki kontrolü yap
            if (!hasBotPermission(interaction.member)) {
                // Yetkili rolleri kullanıcı dostu şekilde listele
                const authorizedRoles = AUTHORIZED_ROLE_IDS.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `<@&${id}>` : 'Bilinmeyen Rol';
                }).join(' veya ');
                
                return interaction.reply({ 
                    content: `Bu botu kullanma yetkiniz bulunmuyor. Sadece ${authorizedRoles} rolüne sahip kullanıcılar bu botu kullanabilir.`, 
                    ephemeral: true 
                });
            }

            console.log(`[Button] ${interaction.user.tag} used: ${interaction.customId}`);
            
            // Ceza butonları için özel işleme
            if (interaction.customId.startsWith('punishment_button_')) {
                const punishmentGive = interaction.client.buttons.get('punishment_give');
                if (punishmentGive && typeof punishmentGive.handlePunishmentButton === 'function') {
                    await punishmentGive.handlePunishmentButton(interaction);
                    return;
                }
            }
            
            // Diğer butonlar için normal işleme
            const button = interaction.client.buttons.get(interaction.customId);
            
            if (!button) {
                console.log(`[UYARI] ${interaction.customId} ID'li buton için işleyici bulunamadı.`);
                return;
            }
            
            try {
                await button.execute(interaction);
            } catch (error) {
                console.error(`${interaction.customId} butonu işlenirken hata:`, error);
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'Bu butonu işlerken bir hata oluştu.', 
                        ephemeral: true 
                    }).catch(console.error);
                }
            }
        }
        // ////////////////////////////////////////////////////////////
        // Context menu işle
        else if (interaction.isContextMenuCommand()) {
            // Yetki kontrolü yap
            if (!hasBotPermission(interaction.member)) {
                // Yetkili rolleri kullanıcı dostu şekilde listele
                const authorizedRoles = AUTHORIZED_ROLE_IDS.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `<@&${id}>` : 'Bilinmeyen Rol';
                }).join(' veya ');
                
                return interaction.reply({ 
                    content: `Bu botu kullanma yetkiniz bulunmuyor. Sadece ${authorizedRoles} rolüne sahip kullanıcılar bu botu kullanabilir.`, 
                    ephemeral: true 
                });
            }

            const contextCommand = interaction.client.commands.get(interaction.commandName);

            if (!contextCommand) return;

            try {
                await contextCommand.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Bu context menu\'yü çalıştırırken bir hata oluştu!',
                    ephemeral: true
                });
            }
        }
        // ////////////////////////////////////////////////////////////
        // Modal işle
        else if (interaction.isModalSubmit()) {
            // Yetki kontrolü yap - bu örnekte modaller için
            if (!hasBotPermission(interaction.member)) {
                // Yetkili rolleri kullanıcı dostu şekilde listele
                const authorizedRoles = AUTHORIZED_ROLE_IDS.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `<@&${id}>` : 'Bilinmeyen Rol';
                }).join(' veya ');
                
                return interaction.reply({ 
                    content: `Bu botu kullanma yetkiniz bulunmuyor. Sadece ${authorizedRoles} rolüne sahip kullanıcılar bu botu kullanabilir.`, 
                    ephemeral: true 
                });
            }

            console.log(`[Modal] ${interaction.user.tag} submitted: ${interaction.customId}`);
            // Modal işleme kodunuz...
        }
        // ////////////////////////////////////////////////////////////
        // Select menu işle
        else if (interaction.isStringSelectMenu()) {
            // Yetki kontrolü yap
            if (!hasBotPermission(interaction.member)) {
                // Yetkili rolleri kullanıcı dostu şekilde listele
                const authorizedRoles = AUTHORIZED_ROLE_IDS.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `<@&${id}>` : 'Bilinmeyen Rol';
                }).join(' veya ');
                
                return interaction.reply({ 
                    content: `Bu botu kullanma yetkiniz bulunmuyor. Sadece ${authorizedRoles} rolüne sahip kullanıcılar bu botu kullanabilir.`, 
                    ephemeral: true 
                });
            }

            console.log(`[Select] ${interaction.user.tag} selected: ${interaction.customId}`);
            // Select menu işleme kodunuz...
        }
    },
};