// database.js - Güncellenmiş Versiyon
const SQLite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    // Ana data klasörü oluştur (tüm veritabanları için tek klasör)
    this.dataDir = path.join(__dirname, '../../data');
    console.log(`Veri dizini: ${this.dataDir}`);

    // Veri dizinini oluştur
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`Veri dizini oluşturuldu: ${this.dataDir}`);
    }

    // Ana veritabanı dosyası
    this.mainDbFile = path.join(this.dataDir, 'bot.db');
    console.log(`Ana veritabanı: ${this.mainDbFile}`);

    try {
      // Ana veritabanına bağlan
      this.db = new SQLite(this.mainDbFile);
      console.log(`Ana veritabanına başarıyla bağlanıldı: ${this.mainDbFile}`);
      
      // WAL modunu ayarla
      this.db.pragma('journal_mode = WAL');
      
      // Tabloları oluştur
      this.setupTables();
      
      // Bağlantıyı test et
      const test = this.db.prepare('SELECT 1 AS test').get();
      if (test && test.test === 1) {
        console.log('Ana veritabanı bağlantısı doğrulandı');
      }
    } catch (error) {
      console.error('Veritabanı bağlantı hatası:', error);
      
      // Fallback olarak bellek içi veritabanı kullan
      try {
        this.db = new SQLite(':memory:');
        console.log('Bellek içi veritabanı oluşturuldu');
        this.setupTables();
        console.warn('UYARI: Bellekte veritabanı kullanılıyor - tüm veriler yeniden başlatma ile kaybolacak!');
      } catch (memErr) {
        console.error('Bellek içi veritabanı oluşturma hatası:', memErr);
        throw new Error('Veritabanı başlatılamadı');
      }
    }
    
    // AutoMod veritabanını da aynı dizinde oluştur
    try {
      this.automodDbFile = path.join(this.dataDir, 'automod.db');
      this.automodDb = new SQLite(this.automodDbFile);
      console.log(`AutoMod veritabanına başarıyla bağlanıldı: ${this.automodDbFile}`);
      this.setupAutoModTables();
    } catch (error) {
      console.error('AutoMod veritabanı hatası:', error);
      // Ana veritabanını kullan
      this.automodDb = this.db;
      this.setupAutoModTables();
    }
  }

  // Ana tabloları oluştur
  setupTables() {
    try {
      // Uyarılar tablosu
      const createWarningsTable = this.db.prepare(`
        CREATE TABLE IF NOT EXISTS warnings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          reason TEXT,
          moderator_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `);
      createWarningsTable.run();
      
      // Sunucu ayarları tablosu
      const createGuildConfigTable = this.db.prepare(`
        CREATE TABLE IF NOT EXISTS guild_config (
          guild_id TEXT PRIMARY KEY,
          prefix TEXT DEFAULT '!',
          welcome_channel_id TEXT,
          log_channel_id TEXT,
          mod_role_id TEXT,
          auto_role_id TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      createGuildConfigTable.run();
      
      console.log('Ana veritabanı tabloları başarıyla oluşturuldu');
    } catch (error) {
      console.error('Ana tablo oluşturma hatası:', error);
    }
  }

  // AutoMod tablolarını oluştur (daha önce automod.js içinde olan tabloları buraya taşıyoruz)
// AutoMod tablolarını oluştur
setupAutoModTables() {
    try {
      // Küfür listesi tablosu
      this.automodDb.prepare(`CREATE TABLE IF NOT EXISTS profanity_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      // Sunucu ayarları tablosu
      this.automodDb.prepare(`CREATE TABLE IF NOT EXISTS guild_automod_settings (
        guild_id TEXT PRIMARY KEY,
        spam_protection BOOLEAN DEFAULT 0,
        spam_threshold INTEGER DEFAULT 5,
        spam_interval INTEGER DEFAULT 5000,
        raid_protection BOOLEAN DEFAULT 0,
        raid_threshold INTEGER DEFAULT 10,
        raid_interval INTEGER DEFAULT 10000,
        profanity_filter BOOLEAN DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      console.log('AutoMod veritabanı tabloları başarıyla oluşturuldu');
    } catch (error) {
      console.error('AutoMod tabloları oluşturma hatası:', error);
    }
  }

  // Sunucu ayarlarını getir (Logger.js için gerekli)
  getGuildConfig(guildId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM guild_config WHERE guild_id = ?');
      return stmt.get(guildId);
    } catch (error) {
      console.error('Sunucu ayarları alınırken hata:', error);
      return null;
    }
  }

  // AutoMod için yardımcı metotlar
  getAutoModDb() {
    return this.automodDb;
  }

  // Genel sorgu metotları
  run(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      console.error('Sorgu çalıştırma hatası:', error);
      throw error;
    }
  }

  get(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Sorgu çalıştırma hatası:', error);
      throw error;
    }
  }

  all(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Sorgu çalıştırma hatası:', error);
      throw error;
    }
  }
  
  // Bağlantıyı doğru şekilde kapat
  close() {
    if (this.db) {
      this.db.close();
      console.log('Ana veritabanı bağlantısı kapatıldı');
    }
    
    if (this.automodDb && this.automodDb !== this.db) {
      this.automodDb.close();
      console.log('AutoMod veritabanı bağlantısı kapatıldı');
    }
  }
}

module.exports = Database;