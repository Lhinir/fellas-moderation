// src/commands/general/aktif.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { duyuruKaydet, sonDuyuruyuGetir } = require('../../utils/duyuruManager');

// Otomatik etiketlenecek rolün ID'si
const AKTIF_DUYURU_ROLU_ID = '1267646750789861537'; // Sizin rol ID'niz

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aktif')
        .setDescription('Sunucu aktif duyurusu yapar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sadece yöneticiler kullanabilir
    
    async execute(interaction) {
        try {
            // Hemen yanıt ver
            await interaction.reply({ content: "Aktif duyurusu hazırlanıyor...", ephemeral: true });
            
            // Sabit aktif mesajı ve resim URL'si
            const activeMessage = 'Sunucumuz şu anda aktiftir. İyi roller dileriz.';
            
            // Kendi resim URL'niz
            const imageUrl = 'https://cdn.discordapp.com/attachments/1356388669874770072/1356581410684534866/fellas_banner.png?ex=680428a4&is=6802d724&hm=ee371c5eb8145765c8b7e6e1f6089a08140c34a4df65eb350f58978cf7214fb7&';
            
            // Embed mesaj oluştur
            const embed = new EmbedBuilder()
                .setColor('#2ECC71') // Yeşil renk
                .setTitle(' **SUNUCU AKTİF** ')
                .setDescription(activeMessage)
                .addFields(
                    { name: 'Bilgilendirme', value: 'Sunucumuz tam kapasite ile hizmetinizde. Keyifli vakit geçirmeniz dileğiyle!' },
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
                content: `<@&${AKTIF_DUYURU_ROLU_ID}>`, // Otomatik olarak belirlenen rolü etiketle
                embeds: [embed],
                allowedMentions: { 
                    // parse: ['roles'],  // Bu satırı kaldırın
                    roles: [AKTIF_DUYURU_ROLU_ID] // Sadece belirli rolleri kullanın
                }
            };
            
            // Yeni mesajı gönder
            const sentMessage = await interaction.channel.send(messageOptions);
            
            // Gönderilen mesajı kaydet
            duyuruKaydet(interaction.guild.id, 'aktif', sentMessage.id, interaction.channelId);
            
            // Başarılı mesajını güncelle
            await interaction.editReply({ content: "✅ Aktif duyurusu başarıyla gönderildi!", ephemeral: true });
            
        } catch (error) {
            console.error('Aktif komutu hatası:', error);
            
            try {
                await interaction.editReply({ 
                    content: 'Aktif duyurusu gönderilirken bir hata oluştu!',
                    ephemeral: true
                });
            } catch (followupError) {
                console.error('Follow-up error:', followupError);
                try {
                    await interaction.reply({ 
                        content: 'Aktif duyurusu gönderilirken bir hata oluştu!',
                        ephemeral: true 
                    });
                } catch (finalError) {
                    console.error('Final reply error:', finalError);
                }
            }
        }
    }
};