#!/usr/bin/env python3
"""Bundle the game into a single self-contained HTML file.

Reads index.html, css/style.css and every js/*.js in the order index.html loads them,
then writes wombat-cube-tycoon.html with the CSS and JS inlined. The output has no
<!doctype>/<html>/<head>/<body> wrapper so it can also be published as an Artifact.
"""
import re

html = open('index.html').read()
css = open('css/style.css').read()
body = html.split('<body>', 1)[1].split('<script src', 1)[0].strip()
order = re.findall(r'js/(\w+)\.js', html)

parts = [
    '<title>Wombat Gods</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">',
    '<style>\n' + css.strip() + '\n</style>',
    body,
]
for name in order:
    src = open(f'js/{name}.js').read().rstrip()
    if '</script' in src:
        raise SystemExit(f'js/{name}.js contains a </script> sequence; cannot inline')
    parts.append(f'<script>\n// ===== js/{name}.js =====\n{src}\n</script>')

out = '\n\n'.join(parts) + '\n'
open('wombat-gods.html', 'w').write(out)
print(f'wrote wombat-gods.html ({len(out)} bytes, {len(order)} scripts inlined)')
