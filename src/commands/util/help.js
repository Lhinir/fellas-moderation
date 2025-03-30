// src/commands/util/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Bot komutları hakkında bilgi verir')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Belirli bir komut hakkında bilgi almak için')
                .setRequired(false)),

    async execute(interaction) {
        const client = interaction.client;
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            // Belirli bir komut hakkında bilgi
            const command = client.commands.get(commandName);
            
            if (!command) {
                return interaction.reply({ 
                    content: `❌ \`${commandName}\` adında bir komut bulunamadı.`,
                    ephemeral: true // flags yerine ephemeral kullanın
                });
            }
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📖 /${command.data.name} Komutu`)
                .setDescription(command.data.description)
                .setFooter({ text: 'Tüm komutları görmek için /help yazabilirsiniz' })
                .setTimestamp();
                
            // Eğer alt komutlar varsa ekle
            if (command.data.options && command.data.options.some(opt => opt.type === 1)) {
                const subcommands = command.data.options.filter(opt => opt.type === 1);
                
                let subcommandsText = '';
                subcommands.forEach(sub => {
                    subcommandsText += `**/${command.data.name} ${sub.name}:** ${sub.description}\n`;
                });
                
                embed.addFields({ name: '📑 Alt Komutlar', value: subcommandsText });
            }
                
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true // flags yerine ephemeral kullanın
            });
        }
        
        // Tüm komutları kategorilere göre listele
        const categories = {};
        
        client.commands.forEach(cmd => {
            // Komut dosya yolundan kategori adını çıkar
            let category;
            try {
                // Komut dosya yolunu bulmaya çalış
                const commandPath = require.cache[require.resolve(`../../commands/${cmd.data.name}.js`)]?.filename;
                if (commandPath) {
                    const pathParts = commandPath.split(/[\\/]/);
                    category = pathParts[pathParts.indexOf('commands') + 1];
                    // İlk harfi büyük yap
                    category = category.charAt(0).toUpperCase() + category.slice(1);
                }
            } catch (error) {
                // Dosya yolu bulunamazsa varsayılan kategori kullan
                category = null;
            }
            
            // Eğer kategori bulunamadıysa, komut isimlerine göre tahmin et
            if (!category) {
                category = cmd.data.name === 'help' ? 'Genel' : 
                          ['automod', 'ban', 'kick', 'warn', 'mute', 'logs'].includes(cmd.data.name) ? 'Moderasyon' : 'Diğer';
            }
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push(`**/${cmd.data.name}:** ${cmd.data.description}`);
        });
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 Moderasyon Botu Komutları')
            .setDescription('Aşağıda kullanabileceğiniz komutların listesi bulunmaktadır. Daha fazla bilgi için `/help <komut>` yazabilirsiniz.')
            .setTimestamp()
            .setFooter({ text: `Toplam ${client.commands.size} komut` });
            
        // Kategorileri embed'e ekle
        for (const [category, commands] of Object.entries(categories)) {
            let icon = '📚';
            
            switch (category) {
                case 'Moderasyon':
                    icon = '🛡️';
                    break;
                case 'Genel':
                    icon = '🔧';
                    break;
                case 'Util':
                    icon = '🛠️';
                    break;
                case 'Admin':
                    icon = '⚙️';
                    break;
            }
            
            embed.addFields({ name: `${icon} ${category}`, value: commands.join('\n') });
        }
            
        await interaction.reply({ 
            embeds: [embed], 
            ephemeral: true // flags yerine ephemeral kullanın
        });
    }
};