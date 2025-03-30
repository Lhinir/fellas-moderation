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
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarısı kaldırılacak kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('id')
                        .setDescription('Kaldırılacak uyarının ID\'si')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('clear')
                .setDescription('Bir kullanıcının tüm uyarılarını temizler')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarıları temizlenecek kullanıcı')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const user = interaction.options.getUser('user');
            
            // Yetkiyi kontrol et (list için normal üye de kullanabilir)
            if ((subcommand === 'remove' || subcommand === 'clear') && 
                !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!', 
                    ephemeral: true 
                });
            }

            if (subcommand === 'list') {
                // Kullanıcının uyarılarını getir
                const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
                
                if (warnings.length === 0) {
                    return interaction.reply({
                        content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`,
                        ephemeral: true
                    });
                }
                
                // Uyarıları bir embed içinde listele
                const embed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle(`${user.tag} - Uyarılar`)
                    .setDescription(`**${user.tag}** adlı kullanıcının toplam **${warnings.length}** uyarısı var.`)
                    .setThumbnail(user.displayAvatarURL())
                    .setTimestamp();
                
                // Her bir uyarıyı embed'e ekle
                warnings.forEach((warning, index) => {
                    const moderator = interaction.client.users.cache.get(warning.moderator_id)?.tag || 'Bilinmeyen Moderatör';
                    const date = new Date(warning.created_at).toLocaleDateString('tr-TR');
                    
                    embed.addFields({
                        name: `#${warning.id} - ${date}`,
                        value: `**Sebep:** ${warning.reason}\n**Moderatör:** ${moderator}`,
                        inline: false
                    });
                });
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else if (subcommand === 'remove') {
                const warningId = interaction.options.getInteger('id');
                
                // Uyarıyı sil
                await database.warnings.deleteWarning(warningId, interaction.guild.id);
                
                await interaction.reply({
                    content: `**${user.tag}** adlı kullanıcının **#${warningId}** numaralı uyarısı silindi.`,
                    ephemeral: true
                });
                
                // Log gönder
                await sendWarningRemoveLogEmbed(interaction, user, warningId);
            }
            else if (subcommand === 'clear') {
                // Tüm uyarıları temizle
                await database.warnings.clearWarnings(interaction.guild.id, user.id);
                
                await interaction.reply({
                    content: `**${user.tag}** adlı kullanıcının tüm uyarıları silindi.`,
                    ephemeral: true
                });
                
                // Log gönder
                await sendWarningClearLogEmbed(interaction, user);
            }
        } catch (error) {
            console.error('Warnings komutu hatası:', error);
            await interaction.reply({ 
                content: 'Komut çalıştırılırken bir hata oluştu!', 
                ephemeral: true 
            });
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyonlar
async function sendWarningRemoveLogEmbed(interaction, targetUser, warningId) {
    try {
        const guild = interaction.guild;
        
        // SQLite'dan log kanalını al
        const logChannelId = await database.logs.getLogChannel(guild.id, 'moderation');
        
        if (!logChannelId) return;
        
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#00cc99') // Turkuaz
            .setTitle('🗑️ Uyarı Silindi')
            .addFields(
                { name: 'Kullanıcı', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Uyarı ID', value: `#${warningId}`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Warning remove log gönderme hatası:', error);
    }
}

async function sendWarningClearLogEmbed(interaction, targetUser) {
    try {
        const guild = interaction.guild;
        const logChannelId = await database.logs.getLogChannel(guild.id, 'moderation');
        if (!logChannelId) return;
        
        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#00cc99') // Turkuaz
            .setTitle('🧹 Tüm Uyarılar Temizlendi')
            .addFields(
                { name: 'Kullanıcı', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Warning clear log gönderme hatası:', error);
    }
}