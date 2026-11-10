#!/usr/bin/env python3
"""Hamma yangi sovg'alarni BIR buyruqda qo'shadi.

Ishlatish:   python3 tools/add_gifts.py incoming/
Tuzilishi:   incoming/<Sovg'a nomi>/
                 models.zip      (modellar: 001.json ... yoki .tgs; tartib = ro'yxat tartibi)
                 base.json       (asosiy sovg'a stikeri; .tgs ham bo'ladi)
                 models.txt      (kanaldan nusxa: "Deadline — 0.2%" yoki "Pepe Plans — 0.3% (real: 0.2%)")
                 meta.json       (ixtiyoriy: {"price": 200, "supply": 3000, "open": true, "backdrops": ["Black", "Pure Gold", ...]})
                                 "backdrops" bo'lsa — shu sovg'a faqat shu fonlardan chiqadi (nom yoki indeks, hammasi teng ehtimol)
Qayta ishga tushirilsa, nomi bir xil sovg'a yangilanadi (dublikat bo'lmaydi).
"""
import argparse, glob, gzip, io, json, os, re, sys, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CAT_P = os.path.join(ROOT, 'miniapp/data/catalog.json')
MODELS_D = os.path.join(ROOT, 'miniapp/models')
CFG_P = os.path.join(ROOT, 'tgcloud/lib/config.js')
DATA_P = os.path.join(ROOT, 'tgcloud/lib/data.js')
LINE = re.compile(r'^\W*?([^\d—–\-:][^—–:]*?)\s*[—–:-]\s*([\d.,]+)\s*%(?:\s*\(\s*real\s*:?\s*([\d.,]+)\s*%\s*\))?\s*$', re.I)
num = lambda x: (lambda f: int(f) if f == int(f) else f)(float(x.replace(',', '.')))


def die(m): sys.exit('XATO: ' + m)


def load_anim(data, name):
    if data[:2] == b'\x1f\x8b':      # .tgs = gzip(lottie json)
        data = gzip.decompress(data)
    j = json.loads(data)
    if not isinstance(j, dict) or 'layers' not in j: die(f'{name}: Lottie animatsiya emas')
    return j


def pack(j): return gzip.compress(json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode(), 9, mtime=0)


def natkey(s): return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]


TIER_P = {'uncommon': 40, 'rare': 38, 'epic': 16, 'legendary': 6}   # craft muvaffaqiyatli bo'lsa: daraja ehtimoli (%)
TIERS = ('uncommon', 'rare', 'epic', 'legendary', 'common')


def parse_crafts(path):
    out = []
    for raw in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^\W*?([^\d—–\-:][^—–:]*?)\s*[—–:-]\s*(\w+)\s*$', raw.strip())
        if not m or m.group(2).lower() not in TIERS: continue
        out.append((m.group(1).strip(), m.group(2).lower()))
    return out


def read_models(d, crafts=False):
    items = []
    z = sorted((p for p in glob.glob(os.path.join(d, '*.zip')) if bool(re.search('craft', os.path.basename(p), re.I)) == crafts), key=natkey)
    if z:
        for zp in z:
            with zipfile.ZipFile(zp) as zf:
                for n in sorted((n for n in zf.namelist() if n.lower().endswith(('.json', '.tgs')) and not n.startswith('__MACOSX')), key=natkey):
                    items.append((n, zf.read(n)))
    elif not crafts:
        sub = [p for p in glob.glob(os.path.join(d, '*')) if p.lower().endswith(('.json', '.tgs')) and not re.search(r'base|meta|craft', os.path.basename(p), re.I)]
        for p in sorted(sub, key=natkey): items.append((os.path.basename(p), open(p, 'rb').read()))
    return items


def find_base(d):
    c = [p for p in glob.glob(os.path.join(d, '*')) if re.search(r'base|sticker', os.path.basename(p), re.I) and p.lower().endswith(('.json', '.tgs'))]
    return sorted(c)[0] if c else None


def parse_txt(path):
    out = []
    for raw in open(path, encoding='utf-8').read().splitlines():
        t = raw.strip()
        if not t or '%' not in t: continue   # sarlavha va bo'sh qatorlar
        m = LINE.match(t)
        if not m: print(f'  ! o‘tkazib yuborildi (tushunarsiz qator): {t[:60]}'); continue
        shown = num(m.group(2)); real = num(m.group(3)) if m.group(3) else shown
        out.append((m.group(1).strip(), shown, real))
    return out


def patch(path, tag, body):
    s = open(path, encoding='utf-8').read()
    a, b = f'// <<GEN:{tag}', f'// GEN:{tag}>>'
    i, j = s.index(a), s.index(b)
    i = s.index('\n', i) + 1
    open(path, 'w', encoding='utf-8').write(s[:i] + body + s[j:])


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('incoming'); ap.add_argument('--price', type=int, default=200); ap.add_argument('--supply', type=int, default=3000)
    ap.add_argument('--dry', action='store_true', help='faqat tekshiradi, hech narsa yozmaydi')
    a = ap.parse_args()
    cat = json.load(open(CAT_P, encoding='utf-8')); extra = cat.setdefault('extra', {})
    gdirs = sorted(p for p in glob.glob(os.path.join(a.incoming, '*')) if os.path.isdir(p))
    if not gdirs: die(f'{a.incoming} ichida sovg‘a papkalari yo‘q')
    jobs = []
    for d in gdirs:
        name = os.path.basename(d.rstrip('/'))
        txt = os.path.join(d, 'models.txt'); base = find_base(d); mods = read_models(d)
        if not os.path.exists(txt): die(f'[{name}] models.txt yo‘q')
        rows = parse_txt(txt)
        spare = []
        if len(mods) > len(rows):      # emoji paketida ortiqcha fayl (odatda sovg'aning o'z emojisi) bo'ladi: oxirgilarini tashlaymiz
            spare = mods[len(rows):]; mods = mods[:len(rows)]; print(f'  ! [{name}] {len(spare)} ta ortiqcha fayl e‘tiborga olinmadi ({spare[0][0]}…)')
        if len(rows) != len(mods): die(f'[{name}] modellar soni ({len(mods)}) ro‘yxatdagi nomlar soniga ({len(rows)}) teng emas')
        meta = json.load(open(os.path.join(d, 'meta.json'))) if os.path.exists(os.path.join(d, 'meta.json')) else {}
        for n, data in mods: load_anim(data, f'{name}/{n}')
        base_data = open(base, 'rb').read() if base else (spare[0][1] if spare else mods[0][1])   # base bo'lmasa — birinchi model
        ctxt = os.path.join(d, 'crafts.txt'); crows = parse_crafts(ctxt) if os.path.exists(ctxt) else []; cmods = read_models(d, True) if crows else []
        if len(crows) != len(cmods): die(f'[{name}] craft modellari soni ({len(cmods)}) ro‘yxatga ({len(crows)}) teng emas')
        for n, data in cmods: load_anim(data, f'{name}/craft/{n}')
        load_anim(base_data, 'base')
        jobs.append((name, rows, mods, base_data, meta, crows, cmods)); print(f'✓ {name}: {len(rows)} model')
    if a.dry: return print('Tekshiruv OK (hech narsa yozilmadi)')
    cols = []
    for name, rows, mods, base_data, meta, crows, cmods in jobs:
        k = next((int(x) for x, v in extra.items() if v['name'] == name), None)
        if k is None: k = max([3] + [int(x) for x in extra]) + 1
        pre = f'g{k}_'
        for i, (n, data) in enumerate(mods + cmods): open(os.path.join(MODELS_D, f'{pre}{i:02d}.bin'), 'wb').write(pack(load_anim(data, n)))
        open(os.path.join(MODELS_D, f'{pre}base.bin'), 'wb').write(pack(load_anim(base_data, 'base')))
        extra[str(k)] = {'name': name, 'models': [{'n': n, 'p': s} for n, s, r in rows] + [{'n': n, 'p': 0, 't': t} for n, t in crows], 'w': [r for n, s, r in rows] + [0] * len(crows),
                         'price': meta.get('price', a.price), 'supply': meta.get('supply', a.supply), 'open': meta.get('open', True)}
        if crows:
            nb = len(rows); cr = {}
            for j, (n, t) in enumerate(crows): cr.setdefault(t, []).append(nb + j)
            extra[str(k)]['cr'] = {'n': nb, 'tiers': {t: {'p': TIER_P.get(t, 0), 'm': v} for t, v in cr.items()}}
        else: extra[str(k)].pop('cr', None)
        if meta.get('backdrops'):
            names = [b['n'].lower() for b in cat['backdrops']]
            bd = [x if isinstance(x, int) else (names.index(x.lower()) if x.lower() in names else die(f'{name}: fon topilmadi: {x}')) for x in meta['backdrops']]
            extra[str(k)]['bd'] = sorted(set(bd))
        else: extra[str(k)].pop('bd', None)
        print(f'  → {name}: k={k}, narx {extra[str(k)]["price"]}, supply {extra[str(k)]["supply"]}')
    json.dump(cat, open(CAT_P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    cl, wl = [], ['export const EXTRA_W = {']
    for k in sorted(extra, key=int):
        e = extra[k]
        cl.append(f"  {{ k: {k}, name: {json.dumps(e['name'], ensure_ascii=False)}, supply: {e['supply']}, price: {e['price']}, open: {'true' if e['open'] else 'false'} }},\n")
        wl.append(f"  {k}: {json.dumps(e['w'])},\n")
    wl.append('};\n')
    wl.append('export const EXTRA_CR = {\n')
    for k in sorted(extra, key=int):
        if extra[k].get('cr'): wl.append(f"  {k}: {json.dumps(extra[k]['cr'])},\n")
    wl.append('};\n')
    wl.append('export const EXTRA_BD = {\n')
    for k in sorted(extra, key=int):
        if extra[k].get('bd'): wl.append(f"  {k}: {json.dumps(extra[k]['bd'])},\n")
    wl.append('};\n')
    patch(CFG_P, 'COLS', ''.join(cl)); patch(DATA_P, 'WEIGHTS', ''.join(wl))
    if not a.dry:
        import subprocess
        subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pack_models.py')], check=False)   # fayllar soni limitidan oshmaslik uchun
    print(f'Tayyor: jami {4 + len(extra)} ta sovg‘a. Loyihani qayta yuklang (push).')


if __name__ == '__main__': main()
