// src/commands/general/bakım.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { duyuruKaydet, sonDuyuruyuGetir } = require('../../utils/duyuruManager');

// Otomatik etiketlenecek rolün ID'si
const BAKIM_DUYURU_ROLU_ID = '1267646750789861537'; // Sizin rol ID'niz

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bakım')
        .setDescription('Sunucu bakım duyurusu yapar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sadece yöneticiler kullanabilir
    
    async execute(interaction) {
        try {
            // Hemen yanıt ver
            await interaction.reply({ content: "Bakım duyurusu hazırlanıyor...", ephemeral: true });
            
            // Sabit bakım mesajı ve resim URL'si
            const maintenanceMessage = 'Sunucumuz şu anda bakımdadır. Anlayışınız ve sabrınız için teşekkür ederiz.';
            
            // Kendi resim URL'niz
            const imageUrl = 'https://cdn.discordapp.com/attachments/1356388669874770072/1356581410684534866/fellas_banner.png?ex=680428a4&is=6802d724&hm=ee371c5eb8145765c8b7e6e1f6089a08140c34a4df65eb350f58978cf7214fb7&';
            
            // Embed mesaj oluştur
            const embed = new EmbedBuilder()
                .setColor('#FF5733') // Turuncu-kırmızı arası bir renk
                .setTitle(' **SUNUCU BAKIMDA** ')
                .setDescription(maintenanceMessage)
                .addFields(
                    { name: 'Bilgilendirme', value: 'Bakım sürecinin tamamlanmasının ardından sunucumuz normal işleyişine dönecektir.' },
                    { name: 'İletişim', value: 'Herhangi bir sorun veya sorunuz için <#1354815501619957934> kanalından ticket açabilirsiniz.' },
                )
                .setImage(imageUrl)
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL() });
            
            // İyileştirilmiş mesaj silme mantığı
            // Önce bir önceki duyuruyu sil (bakım veya aktif)
            const sonBakimDuyurusu = sonDuyuruyuGetir(interaction.guild.id, 'bakım');
            const sonAktifDuyurusu = sonDuyuruyuGetir(interaction.guild.id, 'aktif');
            
            // Son bakım duyurusu varsa silmeyi dene, ama hatalardan etkilenme
            if (sonBakimDuyurusu) {
                try {
                    const eskiKanal = await interaction.guild.channels.fetch(sonBakimDuyurusu.channelId).catch(() => null);
                    if (eskiKanal) {
                        // Mesajı silmeyi dene, ama hata olursa sakince devam et
                        await eskiKanal.messages.fetch(sonBakimDuyurusu.messageId)
                            .then(message => message.delete().catch(() => console.log(`Bakım mesajı silinemedi (yetki yok veya çok eski): ${sonBakimDuyurusu.messageId}`)))
                            .catch(() => console.log(`Bakım mesajı bulunamadı: ${sonBakimDuyurusu.messageId}`));
                    }
                } catch (error) {
                    console.log('Eski bakım duyurusu silinirken bir hata oluştu:', error.message);
                }
            }
            
            // Son aktif duyurusu varsa silmeyi dene, ama hatalardan etkilenme
            if (sonAktifDuyurusu) {
                try {
                    const eskiKanal = await interaction.guild.channels.fetch(sonAktifDuyurusu.channelId).catch(() => null);
                    if (eskiKanal) {
                        // Mesajı silmeyi dene, ama hata olursa sakince devam et
                        await eskiKanal.messages.fetch(sonAktifDuyurusu.messageId)
                            .then(message => message.delete().catch(() => console.log(`Aktif mesajı silinemedi (yetki yok veya çok eski): ${sonAktifDuyurusu.messageId}`)))
                            .catch(() => console.log(`Aktif mesajı bulunamadı: ${sonAktifDuyurusu.messageId}`));
                    }
                } catch (error) {
                    console.log('Eski aktif duyurusu silinirken bir hata oluştu:', error.message);
                }
            }
            
            // Rol etiketleme için mesaj içeriğini oluştur - DÜZELTİLDİ
            const messageOptions = { 
                content: `<@&${BAKIM_DUYURU_ROLU_ID}>`, // Otomatik olarak belirlenen rolü etiketle
                embeds: [embed],
                allowedMentions: { 
                    // parse: ['roles'],  // Bu satırı kaldırın
                    roles: [BAKIM_DUYURU_ROLU_ID] // Sadece belirli rolleri kullanın
                }
            };
            
            // Yeni mesajı gönder
            const sentMessage = await interaction.channel.send(messageOptions);
            
            // Gönderilen mesajı kaydet
            duyuruKaydet(interaction.guild.id, 'bakım', sentMessage.id, interaction.channelId);
            
            // Başarılı mesajını güncelle
            await interaction.editReply({ content: "✅ Bakım duyurusu başarıyla gönderildi!", ephemeral: true });
            
        } catch (error) {
            console.error('Bakım komutu hatası:', error);
            
            try {
                await interaction.editReply({ 
                    content: 'Bakım duyurusu gönderilirken bir hata oluştu!',
                    ephemeral: true
                });
            } catch (followupError) {
                console.error('Follow-up error:', followupError);
                try {
                    await interaction.reply({ 
                        content: 'Bakım duyurusu gönderilirken bir hata oluştu!',
                        ephemeral: true 
                    });
                } catch (finalError) {
                    console.error('Final reply error:', finalError);
                }
            }
        }
    }
};