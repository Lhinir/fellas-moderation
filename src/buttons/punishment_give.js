// src/buttons/punishment_give.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../modules/database');

// Bir kere ve global olarak tanımlanmış bir listener flag'i
let modalListenerAdded = false;

module.exports = {
    customId: 'punishment_give',
    
    async execute(interaction) {
        // Yetkiyi kontrol et
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ 
                content: 'Bu özelliği kullanmak için Üyeleri Yönet yetkisine sahip olmalısınız.', 
                ephemeral: true 
            });
        }
        
        try {
            // Modal listener'ı henüz eklenmemişse, bir kere ekle
            if (!modalListenerAdded) {
                interaction.client.on('interactionCreate', async (modalInteraction) => {
                    if (!modalInteraction.isModalSubmit()) return;
                    
                    const modalCustomId = modalInteraction.customId;
                    if (!modalCustomId.startsWith('punishment_modal_')) return;
                    
                    // Modal etkileşimini hemen defer et
                    try {
                        await modalInteraction.deferReply({ ephemeral: true }).catch(err => {
                            console.error("Modal defer hatası:", err);
                            return; // Eğer defer edilemezse, işlemi durdur
                        });
                        
                        // Eğer deferReply başarısız olduysa, işlemi durdur
                        if (!modalInteraction.deferred) return;
                        
                        const punishmentType = modalCustomId.replace('punishment_modal_', '');
                        const userId = modalInteraction.fields.getTextInputValue('userId');
                        const reason = modalInteraction.fields.getTextInputValue('reason');
                        let duration = null;
                        let endTime = null;
                        
                        if (punishmentType === 'tempban' || punishmentType === 'mute') {
                            duration = modalInteraction.fields.getTextInputValue('duration');
                            
                            // Süreyi milisaniyeye çevir
                            const durationMs = parseDuration(duration);
                            if (durationMs === null) {
                                return modalInteraction.editReply({ content: 'Geçersiz süre formatı. Örnek: 1d (1 gün), 12h (12 saat), 30m (30 dakika)' });
                            }
                            
                            endTime = Date.now() + durationMs;
                        }
                        
                        // Kullanıcıyı kontrol et
                        const user = await modalInteraction.client.users.fetch(userId).catch(() => null);
                        
                        if (!user) {
                            return modalInteraction.editReply({ content: 'Geçerli bir kullanıcı ID\'si girmelisiniz.' });
                        }
                        
                        // Cezayı uygula
                        const success = await applyPunishment(
                            modalInteraction, 
                            punishmentType, 
                            user, 
                            reason,
                            duration,
                            endTime
                        );
                        
                        if (!success) {
                            return;
                        }
                        
                        // Cezayı veritabanına kaydet
                        await database.punishments.addPunishment(
                            modalInteraction.guild.id,
                            user.id,
                            modalInteraction.user.id,
                            punishmentType,
                            reason,
                            duration,
                            endTime
                        );
                        
                        // Başarılı mesajı
                        const successEmbed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('✅ Ceza Uygulandı')
                            .setDescription(`**${user.tag}** kullanıcısına başarıyla ceza uygulandı.`)
                            .addFields(
                                { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                                { name: 'Ceza Türü', value: getPunishmentTypeName(punishmentType), inline: true },
                                { name: 'Yetkili', value: `<@${modalInteraction.user.id}> (${modalInteraction.user.tag})`, inline: false },
                                { name: 'Sebep', value: reason, inline: false }
                            )
                            .setFooter({ text: 'Ceza Sistemi', iconURL: modalInteraction.guild.iconURL() })
                            .setTimestamp();
                        
                        if (duration) {
                            successEmbed.addFields({ name: 'Süre', value: duration, inline: true });
                            successEmbed.addFields({ name: 'Bitiş', value: `<t:${Math.floor(endTime / 1000)}:F>`, inline: true });
                        }
                        
                        // Butonlar
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('mod_punishment_system')
                                    .setLabel('Ceza Sistemine Dön')
                                    .setStyle(2) // ButtonStyle.Secondary
                                    .setEmoji('⬅️')
                            );
                        
                        await modalInteraction.editReply({ embeds: [successEmbed], components: [row] });
                        
                        // Log kanalına bildir
                        await sendPunishmentLog(modalInteraction, punishmentType, user, reason, duration, endTime);
                        
                    } catch (error) {
                        console.error('Ceza verme hatası:', error);
                        
                        if (modalInteraction.deferred) {
                            await modalInteraction.editReply({ 
                                content: 'Ceza uygulanırken bir hata oluştu: ' + error.message 
                            }).catch(console.error);
                        } else if (!modalInteraction.replied) {
                            await modalInteraction.reply({ 
                                content: 'Ceza uygulanırken bir hata oluştu: ' + error.message,
                                ephemeral: true 
                            }).catch(console.error);
                        }
                    }
                });
                
                // Flag'i true yap, böylece bir daha dinleyici eklenmez
                modalListenerAdded = true;
            }
            
            // Ceza verme seçeneklerini göster
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🚓 Ceza Ver')
                .setDescription('Vermek istediğiniz ceza türünü seçin:')
                .addFields(
                    { name: '🔨 Ban', value: 'Kullanıcıyı kalıcı olarak yasaklar.' },
                    { name: '⏱️ Geçici Ban', value: 'Kullanıcıyı belirli bir süre için yasaklar.' },
                    { name: '🔇 Susturma', value: 'Kullanıcıyı belirli bir süre için susturur.' },
                    { name: '⚠️ Uyarı', value: 'Kullanıcıya uyarı verir.' }
                )
                .setFooter({ text: 'Ceza Sistemi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            // Ceza türü seçim butonları - ButtonStyle enum'u yerine sayısal değerler kullanıyoruz
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('punishment_button_ban')
                        .setLabel('Ban')
                        .setStyle(4) // Danger (ButtonStyle.Danger)
                        .setEmoji('🔨'),
                    new ButtonBuilder()
                        .setCustomId('punishment_button_tempban')
                        .setLabel('Geçici Ban')
                        .setStyle(4) // Danger (ButtonStyle.Danger)
                        .setEmoji('⏱️')
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('punishment_button_mute')
                        .setLabel('Susturma')
                        .setStyle(1) // Primary (ButtonStyle.Primary)
                        .setEmoji('🔇'),
                    new ButtonBuilder()
                        .setCustomId('punishment_button_warn')
                        .setLabel('Uyarı')
                        .setStyle(3) // Success (ButtonStyle.Success)
                        .setEmoji('⚠️')
                );
            
            // Geri dön butonu
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_punishment_system')
                        .setLabel('Ceza Sistemine Dön')
                        .setStyle(2) // Secondary (ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            
            // Bilgi mesajı
            await interaction.reply({
                content: '⚠️ **Not:** Bu menü üzerinden ceza vermek yerine, daha gelişmiş seçenekler için aşağıdaki slash komutlarını kullanmanızı öneririz:\n• `/ban` - Kalıcı yasak\n• `/tempban` - Geçici yasak\n• `/mute` - Susturma\n• `/warn` - Uyarı',
                embeds: [embed],
                components: [row1, row2, row3],
                ephemeral: true
            });
            
            // Buton tıklamalarını tek bir fonksiyonla ele almak için bir collector
            const filter = i => 
                i.customId.startsWith('punishment_button_') && 
                i.user.id === interaction.user.id;
            
            const collector = interaction.channel.createMessageComponentCollector({ 
                filter, 
                time: 60000,
                max: 1 // Sadece bir tıklamaya izin ver
            });
            
            collector.on('collect', async (i) => {
                // Buton ID'sinden ceza türünü al
                const punishmentType = i.customId.replace('punishment_button_', '');
                
                // Ceza bilgilerini sormak için modal oluştur
                const modal = new ModalBuilder()
                    .setCustomId(`punishment_modal_${punishmentType}`)
                    .setTitle('Ceza Detayları');
                
                const userIdInput = new TextInputBuilder()
                    .setCustomId('userId')
                    .setLabel('Kullanıcı ID')
                    .setPlaceholder('Cezalandırılacak kullanıcının ID\'si')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel('Sebep')
                    .setPlaceholder('Cezalandırma sebebi')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                
                const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondActionRow = new ActionRowBuilder().addComponents(reasonInput);
                
                modal.addComponents(firstActionRow, secondActionRow);
                
                // Süre gerektiren cezalar için süre input'u ekle
                if (punishmentType === 'tempban' || punishmentType === 'mute') {
                    const durationInput = new TextInputBuilder()
                        .setCustomId('duration')
                        .setLabel('Süre (örn: 1d, 12h, 30m)')
                        .setPlaceholder('1d (1 gün), 12h (12 saat), 30m (30 dakika)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);
                    
                    const thirdActionRow = new ActionRowBuilder().addComponents(durationInput);
                    modal.addComponents(thirdActionRow);
                }
                
                // Modal'ı göster - deferUpdate olmadan
                await i.showModal(modal);
            });
        } catch (error) {
            console.error('Ceza verme paneli hatası:', error);
            await interaction.reply({
                content: 'Ceza verme paneli açılırken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};


// Süre formatını (1d, 12h, 30m) milisaniyeye çevirme fonksiyonu
function parseDuration(durationStr) {
    if (!durationStr) return null;
    
    const regex = /^(\d+)([dhm])$/;
    const match = durationStr.match(regex);
    
    if (!match) return null;
    
    const amount = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 'd': return amount * 24 * 60 * 60 * 1000; // gün -> ms
        case 'h': return amount * 60 * 60 * 1000;      // saat -> ms
        case 'm': return amount * 60 * 1000;           // dakika -> ms
        default: return null;
    }
}

// Ceza türünün görünen adını döndürme
function getPunishmentTypeName(type) {
    switch (type) {
        case 'ban': return '🔨 Ban';
        case 'tempban': return '⏱️ Geçici Ban';
        case 'mute': return '🔇 Susturma';
        case 'warn': return '⚠️ Uyarı';
        default: return type;
    }
}

// Cezayı uygulama fonksiyonu
async function applyPunishment(interaction, type, user, reason, duration, endTime) {
    const guild = interaction.guild;
    
    try {
        switch (type) {
            case 'ban':
                // Bot'un izinlerini kontrol et
                if (!guild.members.me.permissions.has('BanMembers')) {
                    await interaction.editReply({ content: 'Bot, üyeleri yasaklamak için gerekli izinlere sahip değil. Bota "Üyeleri Yasakla" izni verildiğinden emin olun.' });
                    return false;
                }
                
                try {
                    // Kullanıcı sunucuda mı kontrol et
                    const memberToBan = await guild.members.fetch(user.id).catch(() => null);
                    
                    // Kullanıcı sunucudaysa, banlanabilir mi kontrol et
                    if (memberToBan && !memberToBan.bannable) {
                        await interaction.editReply({ content: 'Bu kullanıcı bot tarafından yasaklanamaz. Kullanıcının rolü botun rolünden daha yüksek olabilir.' });
                        return false;
                    }
                    
                    await guild.members.ban(user.id, { reason: reason });
                    return true;
                } catch (banError) {
                    console.error('Ban hatası:', banError);
                    await interaction.editReply({ content: `Kullanıcıyı yasaklarken hata: ${banError.message}` });
                    return false;
                }
                
            case 'tempban':
                // Bot'un izinlerini kontrol et
                if (!guild.members.me.permissions.has('BanMembers')) {
                    await interaction.editReply({ content: 'Bot, üyeleri yasaklamak için gerekli izinlere sahip değil. Bota "Üyeleri Yasakla" izni verildiğinden emin olun.' });
                    return false;
                }
                
                try {
                    // Kullanıcı sunucuda mı kontrol et
                    const memberToBan = await guild.members.fetch(user.id).catch(() => null);
                    
                    // Kullanıcı sunucudaysa, banlanabilir mi kontrol et
                    if (memberToBan && !memberToBan.bannable) {
                        await interaction.editReply({ content: 'Bu kullanıcı bot tarafından yasaklanamaz. Kullanıcının rolü botun rolünden daha yüksek olabilir.' });
                        return false;
                    }
                    
                    await guild.members.ban(user.id, { reason: `${reason} (Süre: ${duration})` });
                    
                    // Zamanı gelince ban'ı kaldırmak için
                    setTimeout(async () => {
                        try {
                            await guild.members.unban(user.id, 'Geçici ban süresi doldu').catch(e => console.error('Unban hatası:', e));
                        } catch (err) {
                            console.error("Unban hatası:", err);
                        }
                    }, endTime - Date.now());
                    
                    return true;
                } catch (banError) {
                    console.error('Tempban hatası:', banError);
                    await interaction.editReply({ content: `Kullanıcıyı geçici olarak yasaklarken hata: ${banError.message}` });
                    return false;
                }
                
            case 'mute':
                const member = await guild.members.fetch(user.id).catch(() => null);
                
                if (!member) {
                    await interaction.editReply({ content: 'Kullanıcı bu sunucuda bulunamadı.' });
                    return false;
                }
                
                // Bot'un izinlerini kontrol et
                if (!guild.members.me.permissions.has('ModerateMembers')) {
                    await interaction.editReply({ content: 'Bot, üyeleri zaman aşımına uğratmak için gerekli izinlere sahip değil. Bota "Üyeleri Yönet" izni verildiğinden emin olun.' });
                    return false;
                }
                
                // Hedef üyenin bot veya rolleri nedeniyle zaman aşımına uğratılamaz olup olmadığını kontrol et
                if (!member.moderatable) {
                    await interaction.editReply({ content: 'Bu kullanıcı bot tarafından susturulamaz. Kullanıcının rolü botun rolünden daha yüksek olabilir.' });
                    return false;
                }
                
                const timeoutDuration = endTime - Date.now();
                
                const maxTimeout = 28 * 24 * 60 * 60 * 1000; // 28 gün
                if (timeoutDuration > maxTimeout) {
                    await interaction.editReply({ content: 'Discord API sınırlaması nedeniyle en fazla 28 gün susturma uygulayabilirsiniz.' });
                    return false;
                }
                
                await member.timeout(timeoutDuration, reason);
                return true;
                
            case 'warn':
                await database.warnings.addWarning(
                    interaction.guild.id,
                    user.id,
                    interaction.user.id,
                    reason
                );
                return true;
                
            default:
                await interaction.editReply({ content: 'Bilinmeyen ceza türü: ' + type });
                return false;
        }
    } catch (error) {
        console.error(`Ceza uygulama hatası (${type}):`, error);
        
        // Hata mesajını daha açıklayıcı yapın
        let errorMessage = `Ceza uygulanırken bir hata oluştu: ${error.message}`;
        
        if (error.code === 50013) {
            errorMessage = 'Bot, bu işlemi gerçekleştirmek için gerekli izinlere sahip değil. Lütfen bot rolünün izinlerini kontrol edin ve botun hedef kullanıcıdan daha yüksek bir role sahip olduğundan emin olun.';
        }
        
        await interaction.editReply({ content: errorMessage });
        return false;
    }
}

// Log kanalına ceza bilgisini gönderme
async function sendPunishmentLog(interaction, type, user, reason, duration, endTime) {
    try {
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        
        // Log embed'i oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`${getPunishmentTypeName(type)} | Ceza Uygulandı`)
            .setDescription(`**${user.tag}** kullanıcısına ceza uygulandı.`)
            .addFields(
                { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                { name: 'Yetkili', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Sebep', value: reason, inline: false }
            )
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: `Kullanıcı ID: ${user.id}` })
            .setTimestamp();
        
        if (duration) {
            logEmbed.addFields({ name: 'Süre', value: duration, inline: true });
            logEmbed.addFields({ name: 'Bitiş', value: `<t:${Math.floor(endTime / 1000)}:F>`, inline: true });
        }
        
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Ceza log gönderme hatası:', error);
    }
}