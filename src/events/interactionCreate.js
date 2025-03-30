// src/events/interactionCreate.js - Optimize edilmiş

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        // Etkileşimi logla
        console.log(`[${new Date().toISOString()}] Etkileşim alındı: ${interaction.commandName || interaction.customId || 'Bilinmeyen'}`);
        
        // Sadece slash komutlarını işle
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command) {
                console.log(`Komut bulunamadı: ${interaction.commandName}`);
                return;
            }
            
            try {
                console.log(`Komut çalıştırılıyor: ${interaction.commandName}`);
                await command.execute(interaction);
                console.log(`Komut tamamlandı: ${interaction.commandName}`);
            } catch (error) {
                console.error(`Komut hatası (${interaction.commandName}):`, error);
                
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Komut çalıştırılırken bir hata oluştu!',
                            flags: { ephemeral: true }
                        });
                    }
                } catch (replyError) {
                    console.error('Yanıt hatası:', replyError);
                }
            }
        }
    }
};