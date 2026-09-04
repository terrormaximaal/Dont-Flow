"""Pack the parts of a reference mesh into the studio file.

Reads the .obj (path below), converts its axes to the generator's frame
(x length with the nose at +x, y up, z lateral; ground at y = 0), and writes
each named part as a compact base64 block: positions as uint16 in the part's
own box, the exporter's normals as int8 (they carry the smoothing groups, so
creases survive), indices as uint16. Bilateral parts are stored as their
LEFT half only; the generator mirrors them. Body-frame parts are stored as
fractions of the mesh's own length, height and half width, so a car of any
size puts them where they belong; wheel-frame parts are stored in units of
the wheel radius, centred on the hub.

The block goes between the MESHLIB markers in sportscar-studio.html, so it
can be regenerated at any time:

    python3 tools/reference/pack_mesh.py <obj> sportscar-studio.html
"""
import sys, re, base64, struct, json, collections

obj_path, html_path = sys.argv[1], sys.argv[2]

V, VN, faces = [], [], []
grp = None
for line in open(obj_path, errors='ignore'):
    if line.startswith('v '):
        x, y, z = map(float, line.split()[1:4]); V.append((-x, z, y))      # model: x length (nose -x), y lateral, z up
    elif line.startswith('vn '):
        x, y, z = map(float, line.split()[1:4]); VN.append((-x, z, y))
    elif line.startswith('g '):
        grp = line.strip()[2:]
    elif line.startswith('f '):
        cs = []
        for tok in line.split()[1:]:
            f = tok.split('/')
            cs.append((int(f[0]) - 1, int(f[2]) - 1 if len(f) > 2 and f[2] else -1))
        for k in range(1, len(cs) - 1): faces.append((grp, [cs[0], cs[k], cs[k + 1]]))

by_group = collections.defaultdict(list)
for g, f in faces: by_group[g].append(f)

def bbox(groups):
    pts = [V[c[0]] for g in groups for f in by_group[g] for c in f]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]

# the frame: ground at the bottom of the tyres, x centred between nose and tail
tyres = [g for g in by_group if g.startswith('Tire')]
ground = bbox(tyres)[0][1]
bmin, bmax = bbox(['Body'])
NOSE, TAIL = bmax[0], bmin[0]
L, H, HW = NOSE - TAIL, bmax[1] - ground, bmax[2]
XC = (NOSE + TAIL) / 2
# the front-left wheel: hub and radius
tl = [g for g in tyres if bbox([g])[0][0] > XC and bbox([g])[0][2] > 0][0]
tmin, tmax = bbox([tl])
HUB = ((tmin[0] + tmax[0]) / 2, (tmin[1] + tmax[1]) / 2, (tmin[2] + tmax[2]) / 2)
R = (tmax[1] - tmin[1]) / 2
print('mesh L %.1f H %.1f HW %.1f  ground %.2f  wheel hub %s R %.2f' % (L, H, HW, ground, HUB, R))

def wheel_group(prefix):
    # the front-left one of a set of four
    best = None
    for g in by_group:
        if not g.startswith(prefix): continue
        mn, mx = bbox([g])
        if mn[0] > XC and mn[2] > 0: best = g
    return best

PARTS = {
    # name: (frame, half, [(group, material), ...])
    'headlight': ('body', True,  [('headlights_glass', 'lens'), ('Light_chrome', 'chrome')]),
    'taillight': ('body', True,  [('taillight', 'tailred')]),
    'mirror':    ('body', True,  [('side_mirror', 'plastic')]),
    'handle':    ('body', True,  [('doorhandle', 'plastic')]),
    'grille':    ('body', False, [('grid', 'grille')]),
    'wiper':     ('body', False, [('screen_wiper', 'plastic')]),
    'diffuser':  ('body', False, [('diffuser', 'plastic')]),
    'rim':       ('wheel', False, [(wheel_group('Disk'), 'rim')]),
    'tire':      ('wheel', False, [(wheel_group('Tire'), 'tire')]),
    'disc':      ('wheel', False, [(wheel_group('brake'), 'disc')]),
}

def b64(b): return base64.b64encode(b).decode('ascii')

out = {}
total = 0
for name, (frame, half, subs) in PARTS.items():
    rec = {'frame': frame, 'half': half, 'subs': []}
    for g, mat in subs:
        fs = by_group[g]
        if half:
            fs = [f for f in fs if sum(V[c[0]][2] for c in f) / 3 > 0]
        # unique (vertex, normal) corners
        index = {}
        pos, nrm, idx = [], [], []
        for f in fs:
            for c in f:
                k = index.get(c)
                if k is None:
                    k = index[c] = len(pos)
                    x, y, z = V[c[0]]
                    if frame == 'body': p = ((x - XC) / L, (y - ground) / H, z / HW)
                    else: p = ((x - HUB[0]) / R, (y - HUB[1]) / R, (z - HUB[2]) / R)
                    pos.append(p)
                    nrm.append(VN[c[1]] if c[1] >= 0 else (0, 1, 0))
                idx.append(k)
        assert len(pos) < 65536, (name, len(pos))
        mn = [min(p[i] for p in pos) for i in range(3)]
        mx = [max(p[i] for p in pos) for i in range(3)]
        step = [(mx[i] - mn[i]) / 65535 or 1e-9 for i in range(3)]
        pb = bytearray()
        for p in pos:
            for i in range(3): pb += struct.pack('<H', int(round((p[i] - mn[i]) / step[i])))
        nb = bytearray()
        for n in nrm:
            l = (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5 or 1
            for i in range(3): nb += struct.pack('<b', int(round(max(-127, min(127, n[i] / l * 127)))))
        ib = bytearray()
        for k in idx: ib += struct.pack('<H', k)
        rec['subs'].append({'mat': mat, 'n': len(pos), 'min': mn, 'step': step,
                            'pos': b64(pb), 'nrm': b64(nb), 'idx': b64(ib)})
        total += len(pb) + len(nb) + len(ib)
        print('  %-10s %-18s %6d tris %6d verts' % (name, g, len(fs), len(pos)))
    out[name] = rec
print('binary total %.0f kB' % (total / 1024))

js = ('/* MESHLIB-BEGIN: generated by tools/reference/pack_mesh.py, do not edit by hand */\n'
      'const MESH_LIB = { city: { L: %.4f, H: %.4f, HW: %.4f, wheelR: %.4f, parts: %s } };\n'
      '/* MESHLIB-END */' % (L, H, HW, R, json.dumps(out, separators=(',', ':'))))
s = open(html_path).read()
a, b = s.index('/* MESHLIB-BEGIN'), s.index('/* MESHLIB-END */') + len('/* MESHLIB-END */')
s = s[:a] + js + s[b:]
open(html_path, 'w').write(s)
print('written: block %.0f kB' % (len(js) / 1024))
