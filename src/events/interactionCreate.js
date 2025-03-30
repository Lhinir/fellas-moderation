// src/events/interactionCreate.js
// Bu dosyanın SADECE BİR tane olduğundan emin olun

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        // Saniye cinsinden başlangıç zamanını kaydet (hata ayıklama için)
        const startTime = Date.now();
        
        console.log(`[${new Date().toISOString()}] Etkileşim başladı: ${interaction.commandName || interaction.customId || 'Bilinmeyen'}`);
        
        // Komutları işle
        if (interaction.isChatInputCommand()) {
            try {
                const command = interaction.client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.log(`${interaction.commandName} komutu bulunamadı.`);
                    return;
                }
                
                // ÖNEMLİ: Her zaman önce deferReply yap
                await interaction.deferReply({ ephemeral: true }).catch(err => {
                    console.log(`${interaction.commandName} için defer hatası:`, err.message);
                });
                
                console.log(`[${new Date().toISOString()}] Defer edildi, komutu çalıştırıyorum: ${interaction.commandName}`);
                
                // Komutu deferReply'dan SONRA çalıştır
                await command.execute(interaction);
                
                console.log(`[${new Date().toISOString()}] Komut tamamlandı: ${interaction.commandName}, süre: ${(Date.now() - startTime) / 1000}s`);
            } catch (error) {
                console.error(`Komut çalıştırma hatası (${interaction.commandName}):`, error);
                
                try {
                    if (interaction.deferred && !interaction.replied) {
                        await interaction.editReply({
                            content: 'Komut çalıştırılırken bir hata oluştu!'
                        }).catch(err => {
                            console.error('Edit Reply hatası:', err);
                        });
                    } else if (!interaction.replied) {
                        await interaction.reply({
                            content: 'Komut çalıştırılırken bir hata oluştu!',
                            ephemeral: true
                        }).catch(err => {
                            console.error('Reply hatası:', err);
                        });
                    }
                } catch (replyError) {
                    console.error('Hata mesajı yanıtlama hatası:', replyError);
                }
            }
        }
        
        // Butonları işle
        else if (interaction.isButton()) {
            try {
                const button = interaction.client.buttons.get(interaction.customId);
                
                if (!button) return;
                
                await button.execute(interaction);
            } catch (error) {
                console.error(`Buton işleme hatası (${interaction.customId}):`, error);
                
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Buton işlenirken bir hata oluştu!',
                            ephemeral: true
                        }).catch(console.error);
                    }
                } catch (replyError) {
                    console.error('Buton hata mesajı gönderme hatası:', replyError);
                }
            }
        }
    }
};