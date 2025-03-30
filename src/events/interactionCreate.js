// src/events/interactionCreate.js
const { Events, InteractionResponseFlags, InteractionType } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const client = interaction.client;
        
        try {
            // Slash komutlarını işle
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.error(`Komut bulunamadı: ${interaction.commandName}`);
                    return interaction.reply({
                        content: 'Bu komut artık kullanılamıyor veya bulunamadı.',
                        ephemeral: true // flags yerine ephemeral kullanın
                    });
                }
                
                await command.execute(interaction);
                return;
            }
            
            // Buton etkileşimlerini işle
            if (interaction.isButton()) {
                const buttonId = interaction.customId;
                const button = client.buttons.get(buttonId) || 
                               client.buttons.find(btn => buttonId.startsWith(btn.customId));
                
                if (!button) {
                    return interaction.reply({
                        content: 'Bu buton artık kullanılamıyor veya bulunamadı.',
                        ephemeral: true // flags yerine ephemeral kullanın
                    });
                }
                
                await button.execute(interaction);
                return;
            }
            
            // Select menu etkileşimlerini işle
            if (interaction.isSelectMenu()) {
                const menuId = interaction.customId;
                const menu = client.selectMenus.get(menuId) || 
                             client.selectMenus.find(m => menuId.startsWith(m.customId));
                
                if (!menu) {
                    return interaction.reply({
                        content: 'Bu menü artık kullanılamıyor veya bulunamadı.',
                        ephemeral: true // flags yerine ephemeral kullanın
                    });
                }
                
                await menu.execute(interaction);
                return;
            }
            
            // Modal etkileşimlerini işle
            if (interaction.isModalSubmit()) {
                const modalId = interaction.customId;
                const modal = client.modals?.get(modalId) || 
                              client.modals?.find(m => modalId.startsWith(m.customId));
                
                if (modal) {
                    await modal.execute(interaction);
                }
                return;
            }
        } catch (error) {
            console.error('Komut çalıştırma hatası:', error);
            console.error('Hata kaynağı:', error.stack);
            
            // Hata mesajını gönder
            try {
                const errorMessage = 'Komut çalıştırılırken bir hata oluştu! Lütfen daha sonra tekrar deneyin.';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: errorMessage, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: errorMessage, 
                        ephemeral: true // flags yerine ephemeral kullanın
                    });
                }
                
                // Geliştiriciye veya log kanalına hata mesajını ilet
                try {
                    await client.logger.log(interaction.guild?.id, 'error', {
                        error: error.message,
                        command: interaction.isCommand() ? interaction.commandName : 'unknown',
                        user: {
                            id: interaction.user.id,
                            tag: interaction.user.tag
                        },
                        guild: interaction.guild ? {
                            id: interaction.guild.id,
                            name: interaction.guild.name
                        } : null,
                        timestamp: new Date().toISOString()
                    });
                } catch (logError) {
                    console.error('Hata log kaydı sırasında hata:', logError);
                }
            } catch (replyError) {
                console.error('Hata mesajı gönderirken hata:', replyError);
            }
        }
    }
};