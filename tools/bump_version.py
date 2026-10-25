"""每次更新網站前執行一次：python3 tools/bump_version.py
幫 index.html 裡的 js / css / data 檔案加上新的版本號，讓瀏覽器一定會抓到最新版。"""
import re, time, pathlib, runpy
# 先更新像素圖示清單
runpy.run_path(str(pathlib.Path(__file__).resolve().parent / 'build_icon_manifest.py'))
p = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
s = p.read_text(encoding='utf-8')
v = time.strftime('%Y%m%d%H%M')
s = re.sub(r'(src|href)="((?:js|data|css)/[^"?]+)(\?v=\d+)?"', lambda m: f'{m.group(1)}="{m.group(2)}?v={v}"', s)
p.write_text(s, encoding='utf-8')
print('version', v)
