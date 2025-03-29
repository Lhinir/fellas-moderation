// src/events/interactionCreate.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Slash komutu değilse işleme
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Komut bulunamadı: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Komut çalıştırma hatası:', error);
            
            // Hata mesajını gönder
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Komut çalıştırılırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }
};