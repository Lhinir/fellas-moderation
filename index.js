// index.js
const { Client, Collection, GatewayIntentBits, Partials, Events } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
require('dotenv').config();

// Modülleri içe aktar
const Database = require('./src/modules/database.js');
const Logger = require('./src/modules/logger.js');
const AutoMod = require('./src/modules/automod.js');

// Client oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
        Partials.User
    ]
});

// Client koleksiyonları
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();

// Modülleri client'a ekle
client.database = new Database();
client.logger = new Logger(client);
client.automod = new AutoMod(client);

// Komutları yükle
const commandFolders = readdirSync(path.join(__dirname, 'src/commands'));

for (const folder of commandFolders) {
    const commandFiles = readdirSync(path.join(__dirname, `src/commands/${folder}`))
        .filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(`./src/commands/${folder}/${file}`);
        client.commands.set(command.data.name, command);
        console.log(`Komut yüklendi: ${command.data.name}`);
    }
}

// Eventları yükle
const eventFiles = readdirSync(path.join(__dirname, 'src/events'))
    .filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./src/events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`Event yüklendi: ${event.name}`);
}

// AutoMod Olayları
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    try {
        // Küfür kontrolü
        const hasProfanity = await client.automod.handleProfanityDetection(message);
        if (hasProfanity) {
            await client.automod.punishProfanity(message);
            return;
        }
        
        // Spam kontrolü
        const isSpam = await client.automod.handleSpamDetection(message);
        if (isSpam) {
            await client.automod.punishSpam(message);
            return;
        }
    } catch (error) {
        console.error('AutoMod MessageCreate olayında hata:', error);
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Raid kontrolü
        const isRaid = await client.automod.handleRaidDetection(member);
        if (isRaid) {
            await client.automod.punishRaid(member.guild);
        }
    } catch (error) {
        console.error('AutoMod GuildMemberAdd olayında hata:', error);
    }
});

// Hata yönetimi
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});