"""掃描 assets/icons/ 底下的 PNG，產生 js/icon-manifest.js（網站只載入真的存在的圖示）。
用法：python3 tools/build_icon_manifest.py（bump_version.py 也會自動跑）"""
import os, json, hashlib
root = os.path.join(os.path.dirname(__file__), '..')
base = os.path.join(root, 'assets', 'icons')
out = {}
for d, _, files in os.walk(base):
    if ' ' in os.path.relpath(d, base):   # 上傳用的暫存資料夾（例如「1026 V2」）不算
        continue
    for f in sorted(files):
        if f.endswith('.png'):
            rel = os.path.relpath(os.path.join(d, f), base).replace(os.sep, '/')[:-4]
            h = hashlib.md5(open(os.path.join(d, f), 'rb').read()).hexdigest()[:6]
            out[rel] = h
js = '/* 自動產生：tools/build_icon_manifest.py — 網站有哪些像素圖示（名稱: 版本） */\nwindow.ICON_FILES = ' + json.dumps(out, ensure_ascii=False, sort_keys=True) + ';\n'
open(os.path.join(root, 'js', 'icon-manifest.js'), 'w', encoding='utf-8').write(js)
print(len(out), 'icons')
