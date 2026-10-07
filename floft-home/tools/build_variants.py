#!/usr/bin/env python3
"""Собирает второй вариант главной — packages.html — из index.html.

Вариант 1 (index.html) правится руками. Вариант 2 = тот же index.html + блок «Пакеты»
(blocks/packages.html, css/packages.css, js/packages.js) сразу после блока «Форматы и вместимость».
После любой правки index.html запустите:  python3 tools/build_variants.py
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
block = (root / "blocks" / "packages.html").read_text(encoding="utf-8")

ver = re.search(r'css/home\.css\?v=([\w.-]+)', html)
v = ver.group(1) if ver else "1"

anchor = "<!-- ============================ ОТЗЫВЫ"
css_link = '<link rel="stylesheet" href="css/home.css?v=%s">' % v
js_link = '<script src="js/home.js?v=%s" defer></script>' % v
for needle in (anchor, css_link, js_link):
    if html.count(needle) != 1:
        sys.exit("build_variants: не нашёл в index.html ровно одно вхождение: " + needle)

out = html.replace(anchor, block + "\n" + anchor)
out = out.replace(css_link, css_link + '\n<link rel="stylesheet" href="css/packages.css?v=%s">' % v)
out = out.replace(js_link, js_link + '\n<script src="js/packages.js?v=%s" defer></script>' % v)
out = out.replace("<!-- Прототип:", "<!-- ВАРИАНТ 2 (с блоком «Пакеты»). Файл собирается скриптом tools/build_variants.py — руками не править.\n     Прототип:", 1)

(root / "packages.html").write_text(out, encoding="utf-8")
print("packages.html собран, версия ассетов", v)
