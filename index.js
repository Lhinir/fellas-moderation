// index.js - Periyodik görevler eklenmiş

require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./src/modules/database');

// Intents ayarla
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Koleksiyonları tanımla
client.commands = new Collection();
client.buttons = new Collection();
client.cooldowns = new Collection();
client.selectMenus = new Collection();

// Komutları yükle
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        // Komutun gerekli özelliklere sahip olduğunu kontrol et
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Komut yüklendi: ${command.data.name}`);
        } else {
            console.log(`[UYARI] ${filePath} komutu "data" veya "execute" özelliğine sahip değil.`);
        }
    }
}

// Butonları yükle
const buttonsPath = path.join(__dirname, 'src/buttons');

// Klasörün var olup olmadığını kontrol et
if (fs.existsSync(buttonsPath)) {
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

    for (const file of buttonFiles) {
        const filePath = path.join(buttonsPath, file);
        const button = require(filePath);
        
        if ('customId' in button && 'execute' in button) {
            client.buttons.set(button.customId, button);
            console.log(`Buton yüklendi: ${button.customId}`);
        } else {
            console.log(`[UYARI] ${filePath} butonu "customId" veya "execute" özelliğine sahip değil.`);
        }
    }
    console.log('Butonlar yüklendi.');
} else {
    console.log('src/buttons klasörü bulunamadı, butonlar yüklenmedi.');
}

const regexHandlers = new Map();


// Butonları yükle
if (fs.existsSync(buttonsPath)) {
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
    
    for (const file of buttonFiles) {
        const filePath = path.join(buttonsPath, file);
        const button = require(filePath);
        
        if ('customId' in button && 'execute' in button) {
            if (button.customId instanceof RegExp) {
                regexHandlers.set(button.customId.toString(), {
                    type: 'button',
                    regex: button.customId,
                    execute: button.execute
                });
            } else {
                client.buttons.set(button.customId, button);
            }
            console.log(`Buton yüklendi: ${button.customId}`);
        } else {
            console.log(`[UYARI] ${filePath} butonu "customId" veya "execute" özelliğine sahip değil.`);
        }
    }
}

// Select menüleri yükle
const selectMenusPath = path.join(__dirname, 'src/selectMenus');
if (fs.existsSync(selectMenusPath)) {
    const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
    
    for (const file of selectMenuFiles) {
        const filePath = path.join(selectMenusPath, file);
        const selectMenu = require(filePath);
        
        if ('customId' in selectMenu && 'execute' in selectMenu) {
            if (selectMenu.customId instanceof RegExp) {
                regexHandlers.set(selectMenu.customId.toString(), {
                    type: 'selectMenu',
                    regex: selectMenu.customId,
                    execute: selectMenu.execute
                });
            } else {
                client.selectMenus.set(selectMenu.customId, selectMenu);
            }
            console.log(`Select Menu yüklendi: ${selectMenu.customId}`);
        } else {
            console.log(`[UYARI] ${filePath} select menü "customId" veya "execute" özelliğine sahip değil.`);
        }
    }
}

// Modal yükle
const modalsPath = path.join(__dirname, 'src/modals');
if (fs.existsSync(modalsPath)) {
    const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
    
    for (const file of modalFiles) {
        const filePath = path.join(modalsPath, file);
        const modal = require(filePath);
        
        if ('customId' in modal && 'execute' in modal) {
            if (modal.customId instanceof RegExp) {
                regexHandlers.set(modal.customId.toString(), {
                    type: 'modal',
                    regex: modal.customId,
                    execute: modal.execute
                });
            } else {
                client.modals.set(modal.customId, modal);
            }
            console.log(`Modal yüklendi: ${modal.customId}`);
        } else {
            console.log(`[UYARI] ${filePath} modal "customId" veya "execute" özelliğine sahip değil.`);
        }
    }
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        // ... mevcut komut işleme kodu ...
    } 
    else if (interaction.isButton()) {
        try {
            // Direkt ID eşleşmesi
            const button = client.buttons.get(interaction.customId);
            
            if (button) {
                await button.execute(interaction);
                return;
            }
            
            // Regex ID eşleşmesi
            for (const [key, handler] of regexHandlers.entries()) {
                if (handler.type === 'button' && handler.regex.test(interaction.customId)) {
                    await handler.execute(interaction);
                    return;
                }
            }
        } catch (error) {
            console.error(`Buton işleme hatası (${interaction.customId}):`, error);
            await safeReply(interaction, 'Buton işlenirken bir hata oluştu!');
        }
    }
    else if (interaction.isStringSelectMenu()) {
        try {
            // Direkt ID eşleşmesi
            const selectMenu = client.selectMenus.get(interaction.customId);
            
            if (selectMenu) {
                await selectMenu.execute(interaction);
                return;
            }
            
            // Regex ID eşleşmesi
            for (const [key, handler] of regexHandlers.entries()) {
                if (handler.type === 'selectMenu' && handler.regex.test(interaction.customId)) {
                    await handler.execute(interaction);
                    return;
                }
            }
        } catch (error) {
            console.error(`Select menu işleme hatası (${interaction.customId}):`, error);
            await safeReply(interaction, 'Select menu işlenirken bir hata oluştu!');
        }
    }
    else if (interaction.isModalSubmit()) {
        try {
            // Direkt ID eşleşmesi
            const modal = client.modals.get(interaction.customId);
            
            if (modal) {
                await modal.execute(interaction);
                return;
            }
            
            // Regex ID eşleşmesi
            for (const [key, handler] of regexHandlers.entries()) {
                if (handler.type === 'modal' && handler.regex.test(interaction.customId)) {
                    await handler.execute(interaction);
                    return;
                }
            }
        } catch (error) {
            console.error(`Modal işleme hatası (${interaction.customId}):`, error);
            await safeReply(interaction, 'Form işlenirken bir hata oluştu!');
        }
    }
});

// Güvenli yanıt fonksiyonu
async function safeReply(interaction, content) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: content,
                ephemeral: true
            });
        } else if (interaction.deferred) {
            await interaction.editReply({
                content: content
            });
        } else {
            await interaction.followUp({
                content: content,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Yanıt gönderme hatası:', error);
    }
}

// Event'leri yükle
const eventsPath = path.join(__dirname, 'src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    
    console.log(`Event yüklendi: ${event.name}`);
}

// Periyodik temizlik görevleri
async function setupPeriodicTasks() {
    // Her 6 saatte bir spam geçmişlerini kontrol et ve süresi dolmuş olanları sıfırla
    setInterval(async () => {
        try {
            const now = new Date().toISOString();
            
            // Süresi dolmuş spam geçmişlerini sıfırla
            const result = await database.run(
                'UPDATE spam_history SET spam_count = 1 WHERE reset_after < ?',
                [now]
            );
            
            if (result && result.changes > 0) {
                console.log(`${result.changes} kullanıcının spam geçmişi sıfırlandı.`);
            }
        } catch (error) {
            console.error('Periyodik temizlik hatası:', error);
        }
    }, 6 * 60 * 60 * 1000); // 6 saat
    
    console.log('Periyodik temizlik görevleri başlatıldı.');
}

// Bot başlangıç fonksiyonu
async function startBot() {
    try {
        // Veritabanını başlat
        await database.initialize();
        console.log('Veritabanı başarıyla başlatıldı!');
        
        // Botu başlat
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Bot başlatma hatası:', error);
        process.exit(1);
    }
}

// Bot hazır olduğunda
client.once('ready', async () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    
    // Durum mesajını ayarla
    client.user.setPresence({
        activities: [{ name: 'fellas gururla sunar', type: ActivityType.Playing }],
        status: 'online',
    });
    
    // Tüm sunucuları veritabanında başlat
    for (const guild of client.guilds.cache.values()) {
        await database.guilds.setupGuild(guild.id);
        console.log(`Guild hazırlandı: ${guild.name} (${guild.id})`);
    }
    
    console.log(`${client.guilds.cache.size} sunucu veritabanında hazırlandı.`);
    
    // Periyodik görevleri başlat
    setupPeriodicTasks();
});

// Yeni sunucu eklendiğinde
client.on('guildCreate', async (guild) => {
    // Yeni sunucuyu veritabanına ekle
    await database.guilds.setupGuild(guild.id);
    console.log(`Yeni sunucu eklendi ve veritabanına kaydedildi: ${guild.name} (${guild.id})`);
});

// Botu başlat
startBot();

// Güvenli çıkış (veritabanı bağlantısını kapat)
process.on('SIGINT', async () => {
    console.log('Bot kapatılıyor...');
    try {
        await database.close();
        console.log('Veritabanı bağlantısı güvenli bir şekilde kapatıldı.');
    } catch (err) {
        console.error('Veritabanı kapatma hatası:', err);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Bot kapatılıyor...');
    try {
        await database.close();
        console.log('Veritabanı bağlantısı güvenli bir şekilde kapatıldı.');
    } catch (err) {
        console.error('Veritabanı kapatma hatası:', err);
    }
    process.exit(0);
});

// Yakalanmamış hataları raporla
process.on('unhandledRejection', (error) => {
    console.error('Yakalanmamış Promise Reddi:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Yakalanmamış İstisna:', error);
    // Kritik hatalar için botu güvenli bir şekilde kapatmayı düşünebilirsiniz
    // process.exit(1);
});