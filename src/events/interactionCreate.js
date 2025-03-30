// src/events/interactionCreate.js - Düzeltilmiş

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        // Komut türüne göre loglama
        const interactionType = interaction.isCommand() ? 'Command' : 
                               interaction.isButton() ? 'Button' :
                               interaction.isStringSelectMenu() ? 'Select Menu' :
                               interaction.isModalSubmit() ? 'Modal' : 'Other';
        
        console.log(`[${interactionType}] ${interaction.user.tag} used: ${interaction.commandName || interaction.customId || 'Unknown'}`);
        
        try {
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.error(`${interaction.commandName} adlı komut bulunamadı.`);
                    return;
                }
                
                await command.execute(interaction);
            } 
            else if (interaction.isButton()) {
                // Button işleme
                const button = interaction.client.buttons.get(interaction.customId);
                
                // Eğer buton varsa çalıştır
                if (button) {
                    await button.execute(interaction);
                    return;
                }
                
                // Regex butonları için eşleşme kontrol et
                for (const [key, handler] of interaction.client.regexHandlers?.entries() || []) {
                    if (handler.type === 'button' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`[UYARI] ${interaction.customId} ID'li buton için işleyici bulunamadı.`);
            }
            else if (interaction.isStringSelectMenu()) {
                // Select Menu işleme
                const selectMenu = interaction.client.selectMenus.get(interaction.customId);
                
                if (selectMenu) {
                    await selectMenu.execute(interaction);
                    return;
                }
                
                // Regex select menüler için eşleşme kontrol et
                for (const [key, handler] of interaction.client.regexHandlers?.entries() || []) {
                    if (handler.type === 'selectMenu' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`[UYARI] ${interaction.customId} ID'li select menu için işleyici bulunamadı.`);
            }
            else if (interaction.isModalSubmit()) {
                // Modal işleme
                const modal = interaction.client.modals.get(interaction.customId);
                
                if (modal) {
                    await modal.execute(interaction);
                    return;
                }
                
                // Regex modaller için eşleşme kontrol et
                for (const [key, handler] of interaction.client.regexHandlers?.entries() || []) {
                    if (handler.type === 'modal' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`[UYARI] ${interaction.customId} ID'li modal için işleyici bulunamadı.`);
            }
        } catch (error) {
            console.error(`İşleme hatası (${interaction.commandName || interaction.customId || 'Bilinmeyen Etkileşim'}):`, error);
            
            try {
                // Güvenli yanıt
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'İşlem sırasında bir hata oluştu!',
                        ephemeral: true
                    }).catch(console.error);
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: 'İşlem sırasında bir hata oluştu!'
                    }).catch(console.error);
                } else {
                    await interaction.followUp({
                        content: 'İşlem sırasında bir hata oluştu!',
                        ephemeral: true
                    }).catch(console.error);
                }
            } catch (replyError) {
                console.error('Hata yanıtı gönderme hatası:', replyError);
            }
        }
    }
};