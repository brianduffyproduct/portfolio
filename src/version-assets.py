#!/usr/bin/env python3
"""Stamp every /assets/ address in the site with a short hash of the file it points to.

Browsers then fetch a file again whenever it changes. Run from the repository root
after replacing an image, the stylesheet or the resume:

    python3 src/version-assets.py
"""
import hashlib, pathlib, re
site = pathlib.Path('site')
ref = re.compile(r'(/assets/[\w./-]+\.(?:webp|svg|css|pdf))(?:\?v=\w+)?')
def stamp(m):
    f = site / m.group(1).lstrip('/')
    return f"{m.group(1)}?v={hashlib.md5(f.read_bytes()).hexdigest()[:8]}" if f.exists() else m.group(0)
css = site / 'assets' / 'site.css'
css.write_text(ref.sub(stamp, css.read_text()))          # stylesheet first: its own hash depends on it
for page in [site / 'index.html', *site.glob('*/index.html')]:
    if page.parent.name == 'spherechart':
        continue
    page.write_text(ref.sub(stamp, page.read_text()))
    print('stamped', page)
