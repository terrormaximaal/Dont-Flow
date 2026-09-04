"""Pack the parts of a reference mesh into the studio file.

Reads the .obj (path below), converts its axes to the generator's frame
(x length with the nose at +x, y up, z lateral; ground at y = 0), and writes
each named part as a compact base64 block: positions as uint16 in the part's
own box, the exporter's normals as int8 (they carry the smoothing groups, so
creases survive), indices as uint16. Bilateral parts are stored as their
LEFT half only; the generator mirrors them. Body-frame parts are stored as
fractions of the mesh's own length, height and half width, so a car of any
size puts them where they belong. The wheels are NOT packed: the generator
builds its own wheels for every family (tyre, rim, disc, caliper, flat tyre),
and the reference's wheel size is already in the family's DNA.

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

PARTS = {
    # name: (frame, half, [(group, material), ...])
    'headlight': ('body', True,  [('headlights_glass', 'lens'), ('Light_chrome', 'chrome')]),
    'taillight': ('body', True,  [('taillight', 'tailred')]),
    'mirror':    ('body', True,  [('side_mirror', 'plastic')]),
    'handle':    ('body', True,  [('doorhandle', 'plastic')]),
    'grille':    ('body', False, [('grid', 'grille')]),
    'wiper':     ('body', False, [('screen_wiper', 'plastic')]),
    'diffuser':  ('body', False, [('diffuser', 'plastic')]),
}

def b64(b): return base64.b64encode(b).decode('ascii')

def encode(pos, nrm, idx):
    assert len(pos) < 65536, len(pos)
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
    return {'n': len(pos), 'min': mn, 'step': step, 'pos': b64(pb), 'nrm': b64(nb), 'idx': b64(ib)}, len(pb) + len(nb) + len(ib)

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
                    p = ((x - XC) / L, (y - ground) / H, z / HW)
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

# ---- the skin: the body cut into panels by cut_body.py -------------------
# Bilateral panels are stored as their left side, centre panels as their
# z >= 0 half (they were clipped on the centreline); the generator mirrors.
# The doors are the mesh's own closed slabs and need no thickness.
skin = {}
cut_path = sys.argv[3] if len(sys.argv) > 3 else None
if cut_path:
    cut = json.load(open(cut_path))
    CP, CN, CF, CL = cut['P'], cut['N'], cut['F'], cut['lab']
    cXC = cut['XC']
    names = sorted(set(CL))
    for name in names:
        if name.endswith('.r'): continue
        fs = [i for i, l in enumerate(CL) if l == name]
        if not name.endswith('.l'):
            fs = [i for i in fs if sum(CP[v][2] for v in CF[i]) / 3 > 0]
        index = {}
        pos, nrm, idx = [], [], []
        def area2(i):
            a, b, c = CP[CF[i][0]], CP[CF[i][1]], CP[CF[i][2]]
            n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
            return sum(x*x for x in n)
        fs = [i for i in fs if area2(i) > 1e-4]          # drop slivers and the mesh's own degenerate faces
        for i in fs:
            for v in CF[i]:
                k = (tuple(round(x, 2) for x in CP[v]), tuple(round(x, 2) for x in CN[v]))
                j = index.get(k)
                if j is None:
                    j = index[k] = len(pos)
                    x, y, z = CP[v]
                    pos.append(((x - cXC) / L, y / H, z / HW))
                    nn = list(CN[v])
                    if abs(z) < 0.15: nn[2] = 0.0          # on the centreline the normal is in the plane: no seam between the halves
                    nrm.append(nn)
                idx.append(j)
        rec, nbytes = encode(pos, nrm, idx)
        total += nbytes
        skin[name.replace('.l', '')] = {'half': True, 'solid': name.startswith('door'), 'sub': rec}
        print('  skin %-18s %6d tris %6d verts' % (name, len(fs), len(pos)))
print('binary total with skin %.0f kB' % (total / 1024))

js = ('/* MESHLIB-BEGIN: generated by tools/reference/pack_mesh.py, do not edit by hand */\n'
      'const MESH_LIB = { city: { L: %.4f, H: %.4f, HW: %.4f, wheelR: %.4f, parts: %s, skin: %s } };\n'
      '/* MESHLIB-END */' % (L, H, HW, R, json.dumps(out, separators=(',', ':')), json.dumps(skin, separators=(',', ':'))))
s = open(html_path).read()
a, b = s.index('/* MESHLIB-BEGIN'), s.index('/* MESHLIB-END */') + len('/* MESHLIB-END */')
s = s[:a] + js + s[b:]
open(html_path, 'w').write(s)
print('written: block %.0f kB' % (len(js) / 1024))
