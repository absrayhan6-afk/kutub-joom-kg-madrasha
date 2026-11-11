"""ডেমো তৈরি: পুরো ওয়েবসাইট (অভিভাবক + অ্যাডমিন) এক ফাইলে, সব CSS/JS/ছবি ভেতরে।
claude.ai-তে শেয়ারযোগ্য ডেমো পেজ বানাতে ব্যবহৃত হয়। আসল ওয়েবসাইটে এর দরকার নেই।
ব্যবহার: python3 tools/build-demo.py OUTPUT.html
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
read = lambda p: (ROOT / p).read_text(encoding='utf-8')


def part(html, start, end):
    return html.split(f'<!--{start}-->')[1].split(f'<!--{end}-->')[0]


def fix_links(s):
    s = re.sub(r'href="index\.html#([\w-]+)"', r'href="#\1"', s)
    s = re.sub(r'href="index\.html"( target="_blank" rel="noopener")?', 'href="#home"', s)
    s = re.sub(r'href="admin\.html(#login)?"', 'href="#admin"', s)
    return s


index, admin = read('index.html'), read('admin.html')
site_html = fix_links(part(index, 'SITE-START', 'SITE-END'))
admin_html = fix_links(part(admin, 'ADMIN-START', 'ADMIN-END'))
css = '\n'.join(read(f'css/{n}.css') for n in ('site', 'marksheet', 'forms', 'admin'))
js = '\n;\n'.join(fix_links(read(f'js/{n}.js')) for n in ('config', 'calc', 'store', 'marksheet', 'translit', 'forms', 'idcard', 'public', 'admin'))
router = """(function(){var A=['admin','dashboard','students','classes','teachers','marks','publish','archive','fees','notices','banner','config','idcards','applications'];
function r(){var h=location.hash.slice(1),adm=A.indexOf(h)>=0;try{if(!h&&sessionStorage.getItem('kjm-last')&&JSON.parse(sessionStorage.getItem('kjm-demo-v3-s')||'null')){adm=true;}else if(h&&!adm){sessionStorage.removeItem('kjm-last');}}catch(e){}document.getElementById('sitePart').hidden=adm;document.getElementById('adminPart').hidden=!adm;document.body.classList.toggle('admin-body',adm);}
window.addEventListener('hashchange',function(){r();window.scrollTo(0,0);});r();})();"""

out = f"""<title>কুতুবজোম মাদ্রাসা ওয়েবসাইট</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<style>{css}</style>
<div id="sitePart">{site_html}</div>
<div id="adminPart" hidden>{admin_html}</div>
<script>{router}</script>
<script>{js}</script>
"""
mime = {'.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png'}
for f in (p for p in (ROOT / 'assets').iterdir() if p.is_file() and p.suffix in mime):
    uri = f'data:{mime[f.suffix]};base64,' + base64.b64encode(f.read_bytes()).decode()
    out = out.replace(f'assets/{f.name}', uri)
pathlib.Path(sys.argv[1]).write_text(out, encoding='utf-8')
print('demo written', len(out) // 1024, 'KB')
