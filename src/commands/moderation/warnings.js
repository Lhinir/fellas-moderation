// src/commands/moderation/warnings.js - Güncellenmiş versiyon

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Kullanıcı uyarılarını yönetir')
        .addSubcommand(subcommand => 
            subcommand
                .setName('list')
                .setDescription('Bir kullanıcının uyarılarını listeler')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarıları listelenecek kullanıcı')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('remove')
                .setDescription('Belirli bir uyarıyı kaldırır')
                .addIntegerOption(option => 
                    option.setName('id')
                        .setDescription('Kaldırılacak uyarının ID\'si')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Uyarının kaldırılma sebebi')
                        .setRequired(false)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('clear')
                .setDescription('Bir kullanıcının tüm uyarılarını temizler')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarıları temizlenecek kullanıcı')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Uyarıların temizlenme sebebi')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'list') {
                return await handleListWarnings(interaction);
            }
            else if (subcommand === 'remove') {
                // ModerateMembers yetkisi kontrol
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({
                        content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!',
                        ephemeral: true
                    });
                }
                
                return await handleRemoveWarning(interaction);
            }
            else if (subcommand === 'clear') {
                // ModerateMembers yetkisi kontrol
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({
                        content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!',
                        ephemeral: true
                    });
                }
                
                return await handleClearWarnings(interaction);
            }
        } catch (error) {
            console.error('Warnings komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!',
                ephemeral: true
            }).catch(console.error);
        }
    }
};

// Uyarıları listele
async function handleListWarnings(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const user = interaction.options.getUser('user');
    
    // Uyarıları getir
    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
    
    // Spam geçmişini de getir
    const spamHistory = await database.get(
        'SELECT * FROM spam_history WHERE guild_id = ? AND user_id = ?',
        [interaction.guild.id, user.id]
    );
    
    if (!warnings || warnings.length === 0) {
        return interaction.editReply({
            content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`
        });
    }
    
    // Uyarıları listele
    const embed = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle(`${user.tag} - Uyarılar`)
        .setDescription(`**${user.tag}** adlı kullanıcının toplam **${warnings.length}** uyarısı var.`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
        
    // Her bir uyarı için alan ekle
    for (const warning of warnings) {
        const moderator = await interaction.client.users.fetch(warning.moderator_id)
            .then(user => user.tag)
            .catch(() => warning.moderator_id === interaction.client.user.id ? 
                `${interaction.client.user.username} (AutoMod)` : 'Bilinmeyen Moderatör');
                
        const date = new Date(warning.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Otomatik oluşturulan uyarıları vurgula
        if (warning.automated === 1) {
            embed.addFields({
                name: `#${warning.id} - ${date} 🤖 [Otomatik]`,
                value: `**Sebep:** ${warning.reason}\n**Moderatör:** ${moderator}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: `#${warning.id} - ${date}`,
                value: `**Sebep:** ${warning.reason}\n**Moderatör:** ${moderator}`,
                inline: false
            });
        }
    }
    
    // Spam seviyesi bilgisini ekle (eğer varsa)
    if (spamHistory && spamHistory.spam_count > 1) {
        const resetDate = new Date(spamHistory.reset_after).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        embed.addFields({
            name: '⚠️ Mevcut Spam Seviyesi',
            value: `Seviye: **${spamHistory.spam_count}** (${resetDate} tarihinde sıfırlanacak)`,
            inline: false
        });
    }
    
    await interaction.editReply({ embeds: [embed] });
}

// Belirli bir uyarıyı kaldır
async function handleRemoveWarning(interaction) {
    await interaction.deferReply();
    
    const warningId = interaction.options.getInteger('id');
    const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
    
    // Uyarıyı veritabanında kontrol et
    let warning;
    try {
        warning = await database.get(
            'SELECT * FROM warnings WHERE id = ? AND guild_id = ?',
            [warningId, interaction.guild.id]
        );
    } catch (dbError) {
        console.error('Uyarı bulunamadı:', dbError);
    }
    
    if (!warning) {
        return interaction.editReply({
            content: `#${warningId} ID'li bir uyarı bulunamadı veya bu sunucuya ait değil.`
        });
    }
    
    // Uyarıyı sil
    try {
        await database.warnings.deleteWarning(warningId, interaction.guild.id);
        
        // Eğer bu bir otomatik uyarıysa, spam_history'yi de sıfırla
        if (warning.automated === 1) {
            await database.run(
                'UPDATE spam_history SET spam_count = 1 WHERE guild_id = ? AND user_id = ?',
                [interaction.guild.id, warning.user_id]
            );
            console.log(`Kullanıcının spam seviyesi sıfırlandı: ${warning.user_id}`);
        }
    } catch (dbError) {
        console.error('Uyarı silinemedi:', dbError);
        return interaction.editReply({
            content: 'Uyarıyı silerken bir hata oluştu!'
        });
    }
    
    // Hedef kullanıcıyı bulmaya çalış
    let targetUser;
    try {
        targetUser = await interaction.client.users.fetch(warning.user_id);
    } catch (fetchError) {
        console.error('Kullanıcı bulunamadı:', fetchError);
        targetUser = { id: warning.user_id, tag: 'Bilinmeyen Kullanıcı' };
    }
    
    // Başarılı yanıt
    await interaction.editReply({
        content: `#${warningId} ID'li uyarı başarıyla silindi${warning.automated === 1 ? ' ve spam seviyesi sıfırlandı' : ''}.`
    });
    
    // Log gönder
    await sendWarningRemoveLogEmbed(interaction, targetUser, warningId, reason, warning.automated === 1);
}

// Tüm uyarıları temizle
async function handleClearWarnings(interaction) {
    await interaction.deferReply();
    
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
    
    // Uyarıları getir
    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
    
    if (!warnings || warnings.length === 0) {
        return interaction.editReply({
            content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`
        });
    }
    
    const warningCount = warnings.length;
    const hasAutomatedWarnings = warnings.some(w => w.automated === 1);
    
    // Uyarıları temizle
    try {
        await database.warnings.clearWarnings(interaction.guild.id, user.id);
        
        // Spam geçmişini de sıfırla
        if (hasAutomatedWarnings) {
            await database.run(
                'UPDATE spam_history SET spam_count = 1 WHERE guild_id = ? AND user_id = ?',
                [interaction.guild.id, user.id]
            );
            console.log(`Kullanıcının spam seviyesi sıfırlandı: ${user.id}`);
        }
    } catch (dbError) {
        console.error('Uyarılar temizlenemedi:', dbError);
        return interaction.editReply({
            content: 'Uyarıları temizlerken bir hata oluştu!'
        });
    }
    
    // Başarılı yanıt
    await interaction.editReply({
        content: `**${user.tag}** adlı kullanıcının **${warningCount}** uyarısı temizlendi${hasAutomatedWarnings ? ' ve spam seviyesi sıfırlandı' : ''}.`
    });
    
    // Log gönder
    await sendWarningClearLogEmbed(interaction, user, warningCount, reason, hasAutomatedWarnings);
}

// Uyarı kaldırma log mesajı
async function sendWarningRemoveLogEmbed(interaction, targetUser, warningId, reason, spamReset = false) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#00ccff') // Mavi
            .setTitle('🗑️ Uyarı Silindi')
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Uyarı ID', value: `#${warningId}`, inline: true },
                { name: 'Sebep', value: reason, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();
            
        if (spamReset) {
            logEmbed.addFields({ name: 'Spam Seviyesi', value: 'Sıfırlandı ✅', inline: true });
        }

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Uyarı silme log hatası:', error);
    }
}

// Tüm uyarıları temizleme log mesajı
async function sendWarningClearLogEmbed(interaction, targetUser, warningCount, reason, spamReset = false) {
    try {
        // Log kanalını al
        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation')
            .catch(() => null);
        
        if (!logChannelId) return;
        
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        // Embed log mesajı oluştur
        const logEmbed = new EmbedBuilder()
            .setColor('#00ccff') // Mavi
            .setTitle('🧹 Tüm Uyarılar Temizlendi')
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderatör', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Temizlenen Uyarı Sayısı', value: `${warningCount}`, inline: true },
                { name: 'Sebep', value: reason, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();
            
        if (spamReset) {
            logEmbed.addFields({ name: 'Spam Seviyesi', value: 'Sıfırlandı ✅', inline: true });
        }

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Uyarı temizleme log hatası:', error);
    }
}