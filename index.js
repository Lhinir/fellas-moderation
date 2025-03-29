const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const DiscordLogger = require('logger');



// Ortam değişkenlerini yükle
dotenv.config();

// Bot client'ını oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Komutları ve event'leri yönetmek için Collection oluştur
client.commands = new Collection();
client.events = new Collection();

// Komutları yükleme fonksiyonu
function loadCommands(commandsPath) {
    console.log('🤖 Komutlar yükleniyor...');
    const commandFolders = fs.readdirSync(commandsPath);
    
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(commandsPath, folder))
            .filter(file => file.endsWith('.js'));
        
        console.log(`📂 ${folder} klasöründen komutlar yükleniyor:`);
        
        for (const file of commandFiles) {
            const commandPath = path.join(commandsPath, folder, file);
            const command = require(commandPath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`   ✅ ${command.data.name} komutu yüklendi`);
            }
        }
    }
    
    console.log(`✨ Toplam ${client.commands.size} komut yüklendi.`);
}

// Event'leri yükleme fonksiyonu
function loadEvents(eventsPath) {
    console.log('🎉 Event\'ler yükleniyor...');
    const eventFiles = fs.readdirSync(eventsPath)
        .filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const eventPath = path.join(eventsPath, file);
        const event = require(eventPath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
            console.log(`   🔔 Tek seferlik ${event.name} event'i yüklendi`);
        } else {
            client.on(event.name, (...args) => event.execute(...args));
            console.log(`   🔔 Sürekli ${event.name} event'i yüklendi`);
        }
    }
    
    console.log(`✨ Toplam ${eventFiles.length} event yüklendi.`);
}

// Komut ve event'leri yükle
loadCommands(path.join(__dirname, 'src', 'commands'));
loadEvents(path.join(__dirname, 'src', 'events'));

client.on('ready', () => {
    // Log kanalının ID'sini buraya girin
    const logger = new DiscordLogger(client, '936756672377012235');
});

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Bot başarıyla giriş yaptı!'))
    .catch(error => {
        console.error('Bot giriş hatası:', error);
        console.log('Token:', process.env.DISCORD_TOKEN);
    });