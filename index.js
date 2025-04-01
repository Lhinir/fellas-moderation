// index.js - Güncellenmiş ve iyileştirilmiş versiyonu

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
client.selectMenus = new Collection();
client.modals = new Collection();
client.cooldowns = new Collection();

// Regex işleyicileri için map
const regexHandlers = new Map();

// Komutları yükle
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    
    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                
                // Komutun gerekli özelliklere sahip olduğunu kontrol et
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`Komut yüklendi: ${command.data.name}`);
                } else {
                    console.log(`[UYARI] ${filePath} komutu "data" veya "execute" özelliğine sahip değil.`);
                }
            } catch (fileError) {
                console.error(`Komut dosyası yükleme hatası (${file}):`, fileError);
            }
        }
    } catch (dirError) {
        console.error(`Komut dizini okuma hatası (${folder}):`, dirError);
    }
}

// Butonları yükle
const buttonsPath = path.join(__dirname, 'src/buttons');
if (fs.existsSync(buttonsPath)) {
    try {
        const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
        
        for (const file of buttonFiles) {
            try {
                const filePath = path.join(buttonsPath, file);
                const button = require(filePath);
                
                if ('customId' in button && 'execute' in button) {
                    if (button.customId instanceof RegExp) {
                        // Regex customId için özel işleme
                        regexHandlers.set(button.customId.toString(), {
                            type: 'button',
                            regex: button.customId,
                            execute: button.execute
                        });
                        console.log(`Regex buton yüklendi: ${button.customId}`);
                    } else {
                        // Normal string customId için
                        client.buttons.set(button.customId, button);
                        console.log(`Buton yüklendi: ${button.customId}`);
                    }
                } else {
                    console.log(`[UYARI] ${filePath} butonu "customId" veya "execute" özelliğine sahip değil.`);
                }
            } catch (fileError) {
                console.error(`Buton dosyası yükleme hatası (${file}):`, fileError);
            }
        }
    } catch (dirError) {
        console.error('Buton dizini okuma hatası:', dirError);
    }
} else {
    console.log('src/buttons klasörü bulunamadı, butonlar yüklenmedi.');
}

// Select menüleri yükle
const selectMenusPath = path.join(__dirname, 'src/selectMenus');
if (fs.existsSync(selectMenusPath)) {
    try {
        const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
        
        for (const file of selectMenuFiles) {
            try {
                const filePath = path.join(selectMenusPath, file);
                const selectMenu = require(filePath);
                
                if ('customId' in selectMenu && 'execute' in selectMenu) {
                    if (selectMenu.customId instanceof RegExp) {
                        // Regex customId için özel işleme
                        regexHandlers.set(selectMenu.customId.toString(), {
                            type: 'selectMenu',
                            regex: selectMenu.customId,
                            execute: selectMenu.execute
                        });
                        console.log(`Regex select menu yüklendi: ${selectMenu.customId}`);
                    } else {
                        // Normal string customId için
                        client.selectMenus.set(selectMenu.customId, selectMenu);
                        console.log(`Select menu yüklendi: ${selectMenu.customId}`);
                    }
                } else {
                    console.log(`[UYARI] ${filePath} select menu "customId" veya "execute" özelliğine sahip değil.`);
                }
            } catch (fileError) {
                console.error(`Select menu dosyası yükleme hatası (${file}):`, fileError);
            }
        }
    } catch (dirError) {
        console.error('Select menu dizini okuma hatası:', dirError);
    }
} else {
    console.log('src/selectMenus klasörü bulunamadı, select menüler yüklenmedi.');
}

// Modalları yükle
const modalsPath = path.join(__dirname, 'src/modals');
if (fs.existsSync(modalsPath)) {
    try {
        const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
        
        for (const file of modalFiles) {
            try {
                const filePath = path.join(modalsPath, file);
                const modal = require(filePath);
                
                if ('customId' in modal && 'execute' in modal) {
                    if (modal.customId instanceof RegExp) {
                        // Regex customId için özel işleme
                        regexHandlers.set(modal.customId.toString(), {
                            type: 'modal',
                            regex: modal.customId,
                            execute: modal.execute
                        });
                        console.log(`Regex modal yüklendi: ${modal.customId}`);
                    } else {
                        // Normal string customId için
                        client.modals.set(modal.customId, modal);
                        console.log(`Modal yüklendi: ${modal.customId}`);
                    }
                } else {
                    console.log(`[UYARI] ${filePath} modal "customId" veya "execute" özelliğine sahip değil.`);
                }
            } catch (fileError) {
                console.error(`Modal dosyası yükleme hatası (${file}):`, fileError);
            }
        }
    } catch (dirError) {
        console.error('Modal dizini okuma hatası:', dirError);
    }
} else {
    console.log('src/modals klasörü bulunamadı, modallar yüklenmedi.');
}

// Event'leri yükle
const eventsPath = path.join(__dirname, 'src/events');
try {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            
            console.log(`Event yüklendi: ${event.name}`);
        } catch (fileError) {
            console.error(`Event dosyası yükleme hatası (${file}):`, fileError);
        }
    }
} catch (dirError) {
    console.error('Event dizini okuma hatası:', dirError);
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
    
// İzlenecek rol ID'si (.env dosyasından veya doğrudan belirtin)
// İstatistik bazlı aktivite durumları
let activityIndex = 0; // Mevcut aktivite indeksi

updateServerStats();
setInterval(updateServerStats, 1 * 30 * 1000); // Her 10 dakikada bir güncelle

function updateServerStats() {
    try {
        // Tüm sunucu ve üye sayılarını topla
        const guildCount = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        // Rastgele bir durum seç
        const statuses = [
            { type: ActivityType.Watching, text: `${totalMembers} oyuncuyu` },
            { type: ActivityType.Playing, text: `Fellas Roleplay` }
        ];
        
        const currentStatus = statuses[activityIndex];
        
        client.user.setPresence({
            activities: [{ 
                name: currentStatus.text, 
                type: currentStatus.type 
            }],
            status: 'online',
        });
        
         // Sıradaki indekse geç (döngüsel olarak)
         activityIndex = (activityIndex + 1) % statuses.length;
    } catch (error) {
        console.error('İstatistik güncellenirken hata:', error);
    }
}


    // Tüm sunucuları veritabanında başlat
    try {
        for (const guild of client.guilds.cache.values()) {
            await database.guilds.setupGuild(guild.id).catch(err => {
                console.error(`${guild.name} (${guild.id}) sunucusu için veritabanı hatası:`, err);
            });
            console.log(`Guild hazırlandı: ${guild.name} (${guild.id})`);
        }
        
        console.log(`${client.guilds.cache.size} sunucu veritabanında hazırlandı.`);
    } catch (dbError) {
        console.error('Sunucu hazırlama hatası:', dbError);
    }
    
    // Periyodik görevleri başlat
    setupPeriodicTasks();
});

// Yeni sunucu eklendiğinde
client.on('guildCreate', async (guild) => {
    try {
        // Yeni sunucuyu veritabanına ekle
        await database.guilds.setupGuild(guild.id);
        console.log(`Yeni sunucu eklendi ve veritabanına kaydedildi: ${guild.name} (${guild.id})`);
    } catch (error) {
        console.error(`Yeni sunucu ekleme hatası (${guild.id}):`, error);
    }
});

// Slash komut ve diğer etkileşimler için handler
/*
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`${interaction.commandName} adlı komut bulunamadı.`);
                return;
            }
            
            try {
                await command.execute(interaction);
            } catch (cmdError) {
                console.error(`Komut çalıştırma hatası (${interaction.commandName}):`, cmdError);
                await safeReply(interaction, 'Komut çalıştırılırken bir hata oluştu!');
            }
        } 
        else if (interaction.isButton()) {
            try {
                // Önce doğrudan eşleşme kontrolü
                const button = client.buttons.get(interaction.customId);
                
                if (button) {
                    await button.execute(interaction);
                    return;
                }
                
                // Sonra regex eşleşmeleri kontrolü
                for (const [key, handler] of regexHandlers.entries()) {
                    if (handler.type === 'button' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`Uygun buton işleyici bulunamadı: ${interaction.customId}`);
            } catch (btnError) {
                console.error(`Buton işleme hatası (${interaction.customId}):`, btnError);
                await safeReply(interaction, 'Buton işlenirken bir hata oluştu!');
            }
        }
        else if (interaction.isStringSelectMenu()) {
            try {
                // Önce doğrudan eşleşme kontrolü
                const selectMenu = client.selectMenus.get(interaction.customId);
                
                if (selectMenu) {
                    await selectMenu.execute(interaction);
                    return;
                }
                
                // Sonra regex eşleşmeleri kontrolü
                for (const [key, handler] of regexHandlers.entries()) {
                    if (handler.type === 'selectMenu' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`Uygun select menu işleyici bulunamadı: ${interaction.customId}`);
            } catch (selectError) {
                console.error(`Select menu işleme hatası (${interaction.customId}):`, selectError);
                await safeReply(interaction, 'Select menu işlenirken bir hata oluştu!');
            }
        }
        else if (interaction.isModalSubmit()) {
            try {
                // Önce doğrudan eşleşme kontrolü
                const modal = client.modals.get(interaction.customId);
                
                if (modal) {
                    await modal.execute(interaction);
                    return;
                }
                
                // Sonra regex eşleşmeleri kontrolü
                for (const [key, handler] of regexHandlers.entries()) {
                    if (handler.type === 'modal' && handler.regex.test(interaction.customId)) {
                        await handler.execute(interaction);
                        return;
                    }
                }
                
                console.log(`Uygun modal işleyici bulunamadı: ${interaction.customId}`);
            } catch (modalError) {
                console.error(`Modal işleme hatası (${interaction.customId}):`, modalError);
                await safeReply(interaction, 'Form işlenirken bir hata oluştu!');
            }
        }
    } catch (globalError) {
        console.error('Global interaction işleme hatası:', globalError);
    }
});
*/
// Güvenli yanıt fonksiyonu
async function safeReply(interaction, content) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            // Henüz yanıt verilmemiş ve askıya alınmamış
            await interaction.reply({
                content: content,
                ephemeral: true
            });
        } else if (interaction.deferred && !interaction.replied) {
            // Askıya alınmış ama henüz yanıt verilmemiş
            await interaction.editReply({
                content: content
            });
        } else {
            // Zaten yanıt verilmiş
            await interaction.followUp({
                content: content,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Yanıt gönderme hatası:', error);
    }
}

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