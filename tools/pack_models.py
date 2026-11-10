#!/usr/bin/env python3
"""miniapp/models/ ichidagi alohida model fayllarini (NN.bin, cNN.bin, gK_NN.bin) bir nechta kattaroq paketga
(pP.bin, cpP.bin, gK_pP.bin) birlashtiradi: tgcloud bitta versiyada 1000 tadan ko'p fayl qabul qilmaydi.
Har paketda 6 ta model. Mavjud paketlar saqlanadi, yangi/qayta qo'yilgan modellar ularga qo'shiladi.
Ishlatish:  python3 tools/pack_models.py   (loyiha papkasida)"""
import os, re, struct, sys
CH = 6
here = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'miniapp', 'models')
D = os.path.abspath(D)
loose_re = re.compile(r'^(g\d+_|[cde]|)(\d+)\.bin$')
pack_re = re.compile(r'^(g\d+_|[cde]|)p(\d+)\.bin$')

def read_pack(path):
    b = open(path, 'rb').read(); n = struct.unpack_from('<I', b, 0)[0]
    lens = struct.unpack_from('<%dI' % n, b, 4); off = 4 + 4 * n; out = []
    for l in lens: out.append(b[off:off + l]); off += l
    return out

loose, packs = {}, {}
for f in os.listdir(D):
    m = loose_re.match(f)
    if m: loose.setdefault(m.group(1), {})[int(m.group(2))] = f; continue
    m = pack_re.match(f)
    if m: packs.setdefault(m.group(1), {})[int(m.group(2))] = f
if not loose: print('Alohida model fayllari yo‘q — paketlash shart emas.'); sys.exit(0)
for pre, files in sorted(loose.items()):
    blobs = {}
    for c, f in packs.get(pre, {}).items():
        for j, bl in enumerate(read_pack(os.path.join(D, f))): blobs[c * CH + j] = bl
    for i, f in files.items(): blobs[i] = open(os.path.join(D, f), 'rb').read()
    n = max(blobs) + 1
    missing = [i for i in range(n) if i not in blobs]
    if missing: sys.exit(f'XATO: {pre or "pepe"}: modellar yetishmayapti: {missing[:10]}')
    nch = (n + CH - 1) // CH
    for c in range(nch):
        part = [blobs[i] for i in range(c * CH, min(n, (c + 1) * CH))]
        data = struct.pack('<I', len(part)) + struct.pack('<%dI' % len(part), *[len(x) for x in part]) + b''.join(part)
        open(os.path.join(D, f'{pre}p{c}.bin'), 'wb').write(data)
    for c, f in packs.get(pre, {}).items():
        if c >= nch: os.remove(os.path.join(D, f))
    for f in files.values(): os.remove(os.path.join(D, f))
    print(f'{pre or "pepe"}: {n} model -> {nch} paket')
print('Tayyor. Fayllar soni:', len(os.listdir(D)))
