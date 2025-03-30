// src/commands/moderation/clear.js - Hata düzeltmesi

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler')
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            // Yetkiyi kontrol et
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ 
                    content: 'Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın!', 
                    ephemeral: true 
                });
            }

            const amount = interaction.options.getInteger('miktar');
            const channel = interaction.channel;

            // Mesajları sil
            const messages = await channel.bulkDelete(amount, true)
                .catch(error => {
                    console.error(error);
                    interaction.reply({ 
                        content: 'Mesajları silerken bir hata oluştu! 14 günden eski mesajlar silinemez.', 
                        ephemeral: true 
                    });
                    return null;
                });

            // Eğer mesaj silme başarısız olduysa, fonksiyondan çık
            if (!messages) return;

            // Başarılı yanıt
            await interaction.reply({ 
                content: `${messages.size} mesaj başarıyla silindi!`, 
                ephemeral: true 
            });

            // Log gönder
            await sendLogEmbed(interaction, messages.size).catch(error => {
                console.error('Log gönderme hatası:', error);
                // Burada interaction.followUp kullanmıyoruz çünkü log hatası kullanıcıyı ilgilendirmiyor
            });

        } catch (error) {
            console.error('Clear komutu hatası:', error);
            
            // Eğer etkileşime henüz cevap verilmediyse cevap ver
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};

// Log mesajı gönderen yardımcı fonksiyon
async function sendLogEmbed(interaction, messageCount) {
    const guild = interaction.guild;
    
    // SQLite'dan log kanalını al
    const logChannelId = await database.logs.getLogChannel(guild.id, 'moderation');
    
    if (!logChannelId) {
        console.log('Bu sunucu için moderasyon log kanalı ayarlanmamış.');
        return;
    }
    
    // Log kanalını bul
    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) {
        console.error('Moderasyon log kanalı bulunamadı! ID:', logChannelId);
        return;
    }

    // Embed log mesajı oluştur
    const logEmbed = new EmbedBuilder()
        .setColor('#ff9900') // Turuncu
        .setTitle('⚠️ Mesaj Temizleme Logu')
        .setDescription(`**${messageCount}** mesaj silindi`)
        .addFields(
            { name: 'Moderatör', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
            { name: 'Kanal', value: `<#${interaction.channel.id}>`, inline: true },
            { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Moderatör ID: ${interaction.user.id} • Kanal ID: ${interaction.channel.id}` })
        .setTimestamp();

    // Logu gönder
    await logChannel.send({ embeds: [logEmbed] });
}