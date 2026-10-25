"""Build dance-island/data/geo.js from Natural Earth (public domain).
usage: python3 -I build_geo.py <ne_dir> <curated.json> <out_geo.js>
  ne_dir 需要 countries50.geojson（ne_50m_admin_0_countries）與 places10full.geojson（ne_10m_populated_places）
  curated.json：台灣輪廓、手工調整的城市與翻譯
"""
import json, math, re, sys

NE, CUR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CENTER = 150          # map center longitude (seam at -30, mid-Atlantic)
TOL = 0.12            # Douglas-Peucker tolerance (deg)

CONT = {'Asia': '亞洲', 'Europe': '歐洲', 'Africa': '非洲', 'North America': '北美洲',
        'South America': '南美洲', 'Oceania': '大洋洲', 'Seven seas (open ocean)': '大洋洲'}
NAME_FIX = {'TW': '台灣', 'CN': '中國', 'HK': '香港', 'MO': '澳門', 'KR': '韓國', 'KP': '北韓',
            'US': '美國', 'GB': '英國', 'AU': '澳洲', 'NZ': '紐西蘭', 'SG': '新加坡'}
# 其他語言的短名（Natural Earth 有些是正式全名，太長）
NAME_FIX_I18N = {
    'TW': ('Taiwan', '台湾', '대만'), 'CN': ('China', '中国', '중국'), 'KR': ('South Korea', '韓国', '한국'),
    'KP': ('North Korea', '北朝鮮', '북한'), 'US': ('USA', 'アメリカ', '미국'), 'GB': ('UK', 'イギリス', '영국'),
    'HK': ('Hong Kong', '香港', '홍콩'), 'MO': ('Macau', 'マカオ', '마카오'), 'JP': ('Japan', '日本', '일본'),
}

# ---------- 手工資料（台灣輪廓＋城市與翻譯） ----------
cur = json.load(open(CUR, encoding='utf-8'))
curated = cur['cities']
tw_polys = cur['TW_POLYS']

# ---------- helpers ----------
def dp(pts, tol):
    if len(pts) < 4: return pts
    stack, keep = [(0, len(pts) - 1)], {0, len(pts) - 1}
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-12
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if d > best: best, bi = d, i
        if best > tol:
            keep.add(bi); stack += [(a, bi), (bi, b)]
    return [pts[i] for i in sorted(keep)]

def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def centroid(r):
    return (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))

def unwrap(r):
    out, prev = [], None
    for lon, lat in r:
        if prev is not None:
            while lon - prev > 180: lon -= 360
            while lon - prev < -180: lon += 360
        out.append([lon, lat]); prev = lon
    return out

def near(lon, ref):
    while lon - ref > 180: lon -= 360
    while lon - ref < -180: lon += 360
    return lon

def in_poly(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside

def on_land(lon, lat, polys, tol=0.35):
    if any(in_poly(lon, lat, p) for p in polys): return True
    return any(math.hypot(lon - a, lat - b) < tol for p in polys for a, b in p)

def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s or 'city'

# ---------- countries ----------
feats = json.load(open(f'{NE}/countries50.geojson'))['features']
places = json.load(open(f'{NE}/places10full.geojson'))['features']
by_a3 = {}
for f in places:
    p = f['properties']
    by_a3.setdefault(p['ADM0_A3'], []).append(p)

countries, used = [], set()
for f in feats:
    p = f['properties']
    a3 = p['ADM0_A3']
    if a3 in ('ATA',): continue
    code = p['ISO_A2_EH'] if p['ISO_A2_EH'] not in ('-99', None) else a3
    if code in used: code = a3
    used.add(code)
    g = f['geometry']
    rings = [poly[0] for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']])]
    rings = [unwrap(r) for r in rings]
    rings.sort(key=area, reverse=True)
    main = rings[0]
    mlon, mlat = centroid(main)
    mlon_c = near(mlon, CENTER)
    shift = mlon_c - mlon
    xs = [q[0] for q in main]; ys = [q[1] for q in main]
    ext = max(max(xs) - min(xs), max(ys) - min(ys))
    thr = max(25, ext * 1.5)
    keep = []
    for i, r in enumerate(rings):
        r = [[q[0] + shift, q[1]] for q in r]
        clon, clat = centroid(r)
        k = round((mlon_c - clon) / 360) * 360
        r = [[q[0] + k, q[1]] for q in r]
        clon += k
        if math.hypot(clon - mlon_c, clat - mlat) > thr: continue
        if i > 0 and area(r) < max(0.02, area(main) * 0.0008) and len(keep) >= 3: continue
        keep.append(r)
        if len(keep) >= 40: break
    polys = []
    for r in keep:
        tol = min(TOL, max(0.004, math.sqrt(area(r)) * 0.05))
        ring = r[:-1] if r[0] == r[-1] else r
        far = max(range(len(ring)), key=lambda i: math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]))
        s = dp(ring[:far + 1], tol)[:-1] + dp(ring[far:] + [ring[0]], tol)[:-1]
        if len(s) < 3: s = r[:3]
        polys.append([[round(a, 3), round(b, 3)] for a, b in s])

    name = NAME_FIX.get(code) or p.get('NAME_ZHT') or p['NAME']
    en, ja, ko = NAME_FIX_I18N.get(code) or (p.get('NAME_EN') or p['NAME'], p.get('NAME_JA') or p['NAME'], p.get('NAME_KO') or p['NAME'])
    c = {'code': code, 'name': name, 'n': {'en': en, 'ja': ja, 'ko': ko}, 'en': p['NAME'].upper(),
         'cont': CONT.get(p['CONTINENT'], '其他'), 'polys': polys}

    # cities: curated first, then biggest NE cities (spaced apart)
    cities = [dict(x) for x in curated.get(code, [])]
    for x in cities: x['lon'] = near(x['lon'], mlon_c)
    # 城市數量依國家大小：小國 6 個、大國最多 30 個
    land = sum(area(r) for r in keep) * math.cos(math.radians(mlat))
    limit = max(6, min(30, round(5 + math.sqrt(land) * 2.5)))
    limit = max(limit, len(cities))
    spacing = max(0.1, ext * 0.02)
    cand = sorted(by_a3.get(a3, []), key=lambda q: (-(q.get('ADM0CAP') or 0), -(q.get('POP_MAX') or 0)))
    for q in cand:
        if len(cities) >= limit: break
        lon, lat = near(q['LONGITUDE'], mlon_c), q['LATITUDE']
        if not on_land(lon, lat, keep): continue          # 海外領地等不在地圖上的城市略過
        if any(math.hypot(lon - x['lon'], lat - x['lat']) < spacing for x in cities): continue
        nm = (q.get('NAME_ZHT') or q['NAME']).replace('市社', '')
        base = lambda n: re.sub(r'(廣域市|特別市|特別自治市|市|縣|郡)$', '', n)
        if any(base(x['name']) == base(nm) or (x.get('n', {}).get('en', '').lower() == (q.get('NAME_EN') or q['NAME']).lower()) for x in cities): continue
        cid = slug(q.get('NAMEASCII') or q['NAME'])
        while any(x['id'] == cid for x in cities): cid += '-2'
        cities.append({'id': cid, 'name': nm, 'n': {'en': q.get('NAME_EN') or q['NAME'], 'ja': q.get('NAME_JA') or q['NAME'], 'ko': q.get('NAME_KO') or q['NAME']},
                       'lon': round(lon, 3), 'lat': round(lat, 3)})
    if not cities:
        cities.append({'id': 'main', 'name': name, 'n': dict(c['n']), 'lon': round(mlon_c, 3), 'lat': round(mlat, 3)})
    c['cities'] = cities
    if code == 'TW':
        c.update({'home': True, 'name': '台灣', 'polys': tw_polys, 'detailRes': 0.02, 'cities': curated['TW']})
    countries.append(c)

order = ['亞洲', '歐洲', '北美洲', '南美洲', '非洲', '大洋洲', '其他']
countries.sort(key=lambda c: (not c.get('home'), order.index(c['cont']), c['en']))

head = f"""/* =========================================================
 * 世界地圖資料（自動產生，共 {len(countries)} 個國家 / 地區）
 * 國家輪廓與城市：Natural Earth（公有領域 public domain）
 * 台灣主島與部分城市為手工調整。
 * - polys：國家輪廓（經度, 緯度），會被像素化畫成漂浮島嶼
 * - cities：城市按鈕，label 是標籤方向（l 左 / r 右）
 * - 想新增城市：在該國的 cities 裡加一筆 {{ id, name, lon, lat }}
 * ========================================================= */
"""
body = 'window.GEO = {\n  center: %d,\n  countries: [\n' % CENTER
body += ',\n'.join('    ' + json.dumps(c, ensure_ascii=False, separators=(',', ':')) for c in countries)
body += '\n  ]\n};\n'
open(OUT, 'w', encoding='utf-8').write(head + body)
print(len(countries), 'countries,', sum(len(c['cities']) for c in countries), 'cities,',
      sum(len(r) for c in countries for r in c['polys']), 'points')
