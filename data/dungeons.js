/* =========================================================
 * 副本島資料（每年的區域賽冠軍、世界冠軍）
 * 新增一年：在 editions 裡加一個年份；新增一座副本島：在 DUNGEONS 裡加一個 id
 * 開放期間、直播連結、選手對應的玩家帳號都在網站後台設定（Supabase）
 * ========================================================= */
window.DUNGEONS = {
  bcone: {
    name: 'Red Bull BC One',
    short: 'BC One',
    color: '#d6001c',
    gold: '#f5c542',
    // 世界地圖上副本島的位置（經緯度，放在太平洋上）
    lon: 148, lat: 24,
    editions: {
      2025: {
        // 區域賽：country 是國家代碼（用在國旗和島名）
        regions: [
          { id: 'tw', country: 'TW', zh: '台灣', en: 'Taiwan',
            bboy: { name: 'B-Boy Sprite', title: '2025 Red Bull BC One Taiwan Cypher Champion', img: 'sprite' },
            bgirl: { name: 'B-Girl Sophia', title: '2025 Red Bull BC One Taiwan Cypher Champion', img: 'sophia' } },
          { id: 'jp', country: 'JP', zh: '日本', en: 'Japan',
            bboy: { name: 'B-Boy haruto', title: '2025 Red Bull BC One Japan Cypher Champion', img: 'haruto' },
            bgirl: { name: 'B-Girl Cocoa', title: '2025 Red Bull BC One Japan Cypher Champion', img: 'cocoa' } },
          { id: 'us', country: 'US', zh: '美國', en: 'USA',
            bboy: { name: 'B-Boy Hijack', title: '2025 Red Bull BC One USA National Champion', img: 'hijack' },
            bgirl: { name: 'B-Girl Logistx', title: '2025 Red Bull BC One USA National Champion', img: 'logistx' } },
          { id: 'au', country: 'AU', zh: '澳洲', en: 'Australia',
            bboy: { name: 'B-Boy BOBCC', title: '2025 Red Bull BC One Australia Champion', img: 'bobcc' },
            bgirl: { name: 'B-Girl Momiji', title: '2025 Red Bull BC One Australia Champion', img: 'momiji' } },
          { id: 'fr', country: 'FR', zh: '法國', en: 'France',
            bboy: { name: 'B-Boy Ilyes Zoo', title: '2025 Red Bull BC One France Cypher Champion', img: 'ilyes-zoo' },
            bgirl: { name: 'B-Girl Syssy', title: '2025 Red Bull BC One France Cypher Champion', img: 'syssy' } },
          { id: 'pl', country: 'PL', zh: '波蘭', en: 'Poland',
            bboy: { name: 'B-Boy Jee Ess', title: '2025 Red Bull BC One Poland Cypher Champion', img: 'jee-ess' },
            bgirl: { name: 'B-Girl Paulina', title: '2025 Red Bull BC One Poland Cypher Champion', img: 'paulina' } }
        ],
        // 世界決賽冠軍（站在正中央的決賽島）
        final: {
          bboy: { name: 'B-Boy ISSIN', country: 'JP', title: '2025 Red Bull BC One World Champion', img: 'issin' },
          bgirl: { name: 'B-Girl Riko', country: 'JP', title: '2025 Red Bull BC One World Champion', img: 'riko' }
        }
      }
    }
  }
};
