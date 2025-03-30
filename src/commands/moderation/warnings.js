// src/commands/moderation/warnings.js

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
    const user = interaction.options.getUser('user');
    
    // Uyarıları getir
    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
    
    if (!warnings || warnings.length === 0) {
        return interaction.reply({
            content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`,
            ephemeral: true
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
            .catch(() => 'Bilinmeyen Moderatör');
            
        const date = new Date(warning.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        embed.addFields({
            name: `#${warning.id} - ${date}`,
            value: `**Sebep:** ${warning.reason}\n**Moderatör:** ${moderator}`,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Belirli bir uyarıyı kaldır
async function handleRemoveWarning(interaction) {
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
        return interaction.reply({
            content: `#${warningId} ID'li bir uyarı bulunamadı veya bu sunucuya ait değil.`,
            ephemeral: true
        });
    }
    
    // Uyarıyı sil
    try {
        await database.warnings.deleteWarning(warningId, interaction.guild.id);
    } catch (dbError) {
        console.error('Uyarı silinemedi:', dbError);
        return interaction.reply({
            content: 'Uyarıyı silerken bir hata oluştu!',
            ephemeral: true
        });
    }
    
    // Başarılı yanıt
    await interaction.reply({
        content: `#${warningId} ID'li uyarı başarıyla silindi.`,
        ephemeral: false
    });
    
    // Hedef kullanıcıyı bulmaya çalış
    let targetUser;
    try {
        targetUser = await interaction.client.users.fetch(warning.user_id);
    } catch (fetchError) {
        console.error('Kullanıcı bulunamadı:', fetchError);
        targetUser = { id: warning.user_id, tag: 'Bilinmeyen Kullanıcı' };
    }
    
    // Log gönder
    await sendWarningRemoveLogEmbed(interaction, targetUser, warningId, reason);
}

// Tüm uyarıları temizle
async function handleClearWarnings(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
    
    // Uyarı sayısını al
    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
    
    if (!warnings || warnings.length === 0) {
        return interaction.reply({
            content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`,
            ephemeral: true
        });
    }
    
    const warningCount = warnings.length;
    
    // Uyarıları temizle
    try {
        await database.warnings.clearWarnings(interaction.guild.id, user.id);
    } catch (dbError) {
        console.error('Uyarılar temizlenemedi:', dbError);
        return interaction.reply({
            content: 'Uyarıları temizlerken bir hata oluştu!',
            ephemeral: true
        });
    }
    
    // Başarılı yanıt
    await interaction.reply({
        content: `**${user.tag}** adlı kullanıcının **${warningCount}** uyarısı temizlendi.`,
        ephemeral: false
    });
    
    // Log gönder
    await sendWarningClearLogEmbed(interaction, user, warningCount, reason);
}

// Uyarı kaldırma log mesajı
async function sendWarningRemoveLogEmbed(interaction, targetUser, warningId, reason) {
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
                { name: 'Sebep', value: reason, inline: false },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Uyarı silme log hatası:', error);
    }
}

// Tüm uyarıları temizleme log mesajı
async function sendWarningClearLogEmbed(interaction, targetUser, warningCount, reason) {
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
                { name: 'Sebep', value: reason, inline: false },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        // Logu gönder
        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    } catch (error) {
        console.error('Uyarı temizleme log hatası:', error);
    }
}