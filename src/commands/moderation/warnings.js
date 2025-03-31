// src/commands/moderation/warnings.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı')
        .setDescription('Kullanıcı uyarılarını yönetir')
        .addSubcommand(subcommand => 
            subcommand
                .setName('liste')
                .setDescription('Bir kullanıcının uyarılarını listeler')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarıları listelenecek kullanıcı')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('sil')
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
                .setName('temizle')
                .setDescription('Bir kullanıcının tüm uyarılarını temizler')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Uyarıları temizlenecek kullanıcı')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Önce yanıtı ertele - 3 saniye zaman aşımı sorununu engellemek için
        await interaction.deferReply({ ephemeral: true });
        
        try {
            console.log("warnings.js komutu çalıştırılıyor...");
            
            const subcommand = interaction.options.getSubcommand();
            console.log(`Seçilen alt komut: ${subcommand}`);
            
            const user = interaction.options.getUser('user');
            console.log(`Hedef kullanıcı: ${user.tag} (${user.id})`);
            
            // Alt komutlara göre işlemleri yap
            if (subcommand === 'liste') {
                // Yetkiyi kontrol et - normal üyeler de kullanabilir
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.editReply({ 
                        content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!' 
                    });
                }

                try {
                    console.log(`${user.tag} kullanıcısının uyarıları getiriliyor...`);
                    
                    // Uyarıları getir
                    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
                    console.log(`Bulunan uyarı sayısı: ${warnings ? warnings.length : 0}`);
                    
                    if (!warnings || warnings.length === 0) {
                        return interaction.editReply({
                            content: `**${user.tag}** adlı kullanıcının hiç uyarısı yok.`
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
                        console.log(`Uyarı #${warning.id} ekleniyor...`);
                        
                        const moderator = interaction.client.users.cache.get(warning.moderator_id)?.tag || 'Bilinmeyen Moderatör';
                        
                        // Tarih formatı
                        let warningDate;
                        try {
                            warningDate = new Date(warning.created_at).toLocaleDateString('tr-TR');
                        } catch (e) {
                            console.error('Tarih dönüştürme hatası:', e);
                            warningDate = 'Bilinmeyen Tarih';
                        }
                        
                        embed.addFields({
                            name: `#${warning.id} - ${warningDate}`,
                            value: `**Sebep:** ${warning.reason || 'Sebep belirtilmedi'}\n**Moderatör:** ${moderator}`,
                            inline: false
                        });
                    });
                    
                    await interaction.editReply({ embeds: [embed] });
                    console.log('Liste alt komutu başarıyla tamamlandı.');
                    
                } catch (error) {
                    console.error('Uyarıları getirme hatası:', error);
                    return interaction.editReply({
                        content: 'Uyarılar listelenirken bir hata oluştu!'
                    });
                }
            }
            else if (subcommand === 'sil') {
                // Yetkiyi kontrol et
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.editReply({ 
                        content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!'
                    });
                }
                
                const warningId = interaction.options.getInteger('id');
                console.log(`Silinecek uyarı ID: ${warningId}`);
                
                try {
                    // Uyarının varlığını kontrol et
                    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
                    const warningExists = warnings.some(w => w.id === warningId);
                    
                    if (!warningExists) {
                        return interaction.editReply({
                            content: `**${user.tag}** adlı kullanıcıda **#${warningId}** ID'li bir uyarı bulunamadı.`
                        });
                    }
                    
                    // Uyarıyı sil
                    await database.warnings.deleteWarning(warningId, interaction.guild.id);
                    console.log(`Uyarı #${warningId} silindi.`);
                    
                    await interaction.editReply({
                        content: `**${user.tag}** adlı kullanıcının **#${warningId}** numaralı uyarısı silindi.`
                    });
                    
                    // Log göndermeyi dene
                    try {
                        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
                        if (logChannelId) {
                            const logChannel = await interaction.guild.channels.fetch(logChannelId);
                            
                            if (logChannel) {
                                const logEmbed = new EmbedBuilder()
                                    .setColor('#00cc99')
                                    .setTitle('🗑️ Uyarı Silindi')
                                    .addFields(
                                        { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                                        { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                                        { name: 'Uyarı ID', value: `#${warningId}`, inline: true },
                                        { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                                    )
                                    .setFooter({ text: `Kullanıcı ID: ${user.id}` })
                                    .setTimestamp();
                                
                                await logChannel.send({ embeds: [logEmbed] });
                            }
                        }
                    } catch (logError) {
                        console.error('Uyarı silme log hatası:', logError);
                    }
                    
                } catch (error) {
                    console.error('Uyarı silme hatası:', error);
                    return interaction.editReply({
                        content: 'Uyarı silinirken bir hata oluştu!'
                    });
                }
            }
            else if (subcommand === 'temizle') {
                // Yetkiyi kontrol et
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.editReply({ 
                        content: 'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısın!'
                    });
                }
                
                try {
                    // Kullanıcının uyarılarını kontrol et
                    const warnings = await database.warnings.getWarnings(interaction.guild.id, user.id);
                    
                    if (!warnings || warnings.length === 0) {
                        return interaction.editReply({
                            content: `**${user.tag}** adlı kullanıcının zaten hiç uyarısı yok.`
                        });
                    }
                    
                    // Tüm uyarıları temizle
                    await database.warnings.clearWarnings(interaction.guild.id, user.id);
                    console.log(`${user.tag} kullanıcısının tüm uyarıları silindi.`);
                    
                    await interaction.editReply({
                        content: `**${user.tag}** adlı kullanıcının tüm uyarıları silindi.`
                    });
                    
                    // Log göndermeyi dene
                    try {
                        const logChannelId = await database.logs.getLogChannel(interaction.guild.id, 'moderation');
                        if (logChannelId) {
                            const logChannel = await interaction.guild.channels.fetch(logChannelId);
                            
                            if (logChannel) {
                                const logEmbed = new EmbedBuilder()
                                    .setColor('#00cc99')
                                    .setTitle('🧹 Tüm Uyarılar Temizlendi')
                                    .addFields(
                                        { name: 'Kullanıcı', value: `<@${user.id}> (${user.tag})`, inline: true },
                                        { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                                        { name: 'Temizlenen Uyarı Sayısı', value: `${warnings.length}`, inline: true },
                                        { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                                    )
                                    .setFooter({ text: `Kullanıcı ID: ${user.id}` })
                                    .setTimestamp();
                                
                                await logChannel.send({ embeds: [logEmbed] });
                            }
                        }
                    } catch (logError) {
                        console.error('Uyarı temizleme log hatası:', logError);
                    }
                    
                } catch (error) {
                    console.error('Uyarı temizleme hatası:', error);
                    return interaction.editReply({
                        content: 'Uyarılar temizlenirken bir hata oluştu!'
                    });
                }
            }
            else {
                // Bilinmeyen alt komut
                return interaction.editReply({ 
                    content: 'Bilinmeyen alt komut: ' + subcommand
                });
            }
            
        } catch (error) {
            console.error('Warnings komutu genel hatası:', error);
            
            // Kullanıcıya yanıt vermeye çalış
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ 
                        content: 'Komut çalıştırılırken bir hata oluştu!'
                    });
                } else {
                    await interaction.reply({ 
                        content: 'Komut çalıştırılırken bir hata oluştu!',
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('Yanıt verme hatası:', replyError);
            }
        }
    }
};