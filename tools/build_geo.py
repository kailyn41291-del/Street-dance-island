"""Build dance-island/data/geo.js from Natural Earth (public domain).
usage: python3 -I build_geo.py <ne_dir> <old_geo.js> <out_geo.js>
"""
import json, math, re, sys

NE, OLD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CENTER = 150          # map center longitude (seam at -30, mid-Atlantic)
TOL = 0.12            # Douglas-Peucker tolerance (deg)

CONT = {'Asia': '亞洲', 'Europe': '歐洲', 'Africa': '非洲', 'North America': '北美洲',
        'South America': '南美洲', 'Oceania': '大洋洲', 'Seven seas (open ocean)': '大洋洲'}
NAME_FIX = {'TW': '台灣', 'CN': '中國', 'HK': '香港', 'MO': '澳門', 'KR': '韓國', 'KP': '北韓',
            'US': '美國', 'GB': '英國', 'AU': '澳洲', 'NZ': '紐西蘭', 'SG': '新加坡'}

# ---------- old hand-made data (Taiwan shape + curated city lists) ----------
old = open(OLD, encoding='utf-8').read()
blocks = re.split(r"\{\s*\n\s*code: '", old)[1:]
curated = {}
tw_polys = None
for b in blocks:
    code = b[:2]
    cities = []
    for m in re.finditer(r"\{ id:'([^']+)',\s*name:'([^']+)',\s*lon:([-\d.]+),\s*lat:([-\d.]+)(?:,\s*label:'(\w)')?\s*\}", b):
        c = {'id': m.group(1), 'name': m.group(2), 'lon': float(m.group(3)), 'lat': float(m.group(4))}
        if m.group(5): c['label'] = m.group(5)
        cities.append(c)
    curated['GB' if code == 'UK' else code] = cities
    if code == 'TW':
        s = b[b.index('polys: [') + 7: b.index('cities:')]
        s = s.strip().rstrip(',')
        tw_polys = json.loads(s)

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
    c = {'code': code, 'name': name, 'en': p['NAME'].upper(), 'cont': CONT.get(p['CONTINENT'], '其他'),
         'polys': polys}

    # cities: curated first, then biggest NE cities (spaced apart)
    cities = [dict(x) for x in curated.get(code, [])]
    for x in cities: x['lon'] = near(x['lon'], mlon_c)
    spacing = max(0.25, ext * 0.12)
    cand = sorted(by_a3.get(a3, []), key=lambda q: (-(q.get('ADM0CAP') or 0), -(q.get('POP_MAX') or 0)))
    limit = 6 if not cities else max(len(cities), 6)
    for q in cand:
        if len(cities) >= limit: break
        lon, lat = near(q['LONGITUDE'], mlon_c), q['LATITUDE']
        if any(math.hypot(lon - x['lon'], lat - x['lat']) < spacing for x in cities): continue
        nm = (q.get('NAME_ZHT') or q['NAME']).replace('市社', '')
        if any(x['name'] == nm for x in cities): continue
        cid = slug(q.get('NAMEASCII') or q['NAME'])
        while any(x['id'] == cid for x in cities): cid += '-2'
        cities.append({'id': cid, 'name': nm, 'en': q['NAME'], 'lon': round(lon, 3), 'lat': round(lat, 3)})
    if not cities:
        cities.append({'id': 'main', 'name': name, 'lon': round(mlon_c, 3), 'lat': round(mlat, 3)})
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
