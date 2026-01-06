/**
 * 🗄️ GERENCIADOR DE CACHE INTELIGENTE
 * - TTL automático
 * - Limpeza de cache antigo
 * - Versionamento para invalidação
 */

const CACHE_VERSION = '1.0';
const DEFAULT_TTL = 300000; // 5 minutos

export class CacheManager {
  static set(key, data, ttl = DEFAULT_TTL) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION
      };
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
      return true;
    } catch (e) {
      console.debug('Cache set failed:', e.message);
      return false;
    }
  }

  static get(key) {
    try {
      const cached = sessionStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Verifica versão
      if (cacheData.version !== CACHE_VERSION) {
        this.delete(key);
        return null;
      }

      // Verifica TTL
      const age = Date.now() - cacheData.timestamp;
      if (age > cacheData.ttl) {
        this.delete(key);
        return null;
      }

      return cacheData.data;
    } catch (e) {
      console.debug('Cache get failed:', e.message);
      return null;
    }
  }

  static delete(key) {
    try {
      sessionStorage.removeItem(`cache_${key}`);
    } catch (e) {
      console.debug('Cache delete failed:', e.message);
    }
  }

  static clear() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('✅ Cache limpo');
    } catch (e) {
      console.debug('Cache clear failed:', e.message);
    }
  }

  static cleanup() {
    try {
      const keys = Object.keys(sessionStorage);
      let cleaned = 0;
      
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const cached = JSON.parse(sessionStorage.getItem(key));
            const age = Date.now() - (cached?.timestamp || 0);
            
            if (age > (cached?.ttl || DEFAULT_TTL)) {
              sessionStorage.removeItem(key);
              cleaned++;
            }
          } catch (e) {
            sessionStorage.removeItem(key);
            cleaned++;
          }
        }
      });
      
      if (cleaned > 0) {
        console.log(`🧹 ${cleaned} cache(s) expirado(s) removido(s)`);
      }
    } catch (e) {
      console.debug('Cache cleanup failed:', e.message);
    }
  }
}

// Auto-cleanup a cada 2 minutos
if (typeof window !== 'undefined') {
  setInterval(() => CacheManager.cleanup(), 120000);
}