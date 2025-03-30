// clear-global-commands.js adlı yeni bir dosya oluşturun

require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Global komutlar temizleniyor...');
    
    // Global komutları boş bir dizi ile değiştirerek temizle
    await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: [] },
    );

    console.log('Global komutlar başarıyla temizlendi!');
  } catch (error) {
    console.error('Komut temizleme sırasında hata oluştu:', error);
  }
})();