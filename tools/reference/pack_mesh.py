"""Pack a reference mesh's panels and parts into the studio file.

    python3 tools/reference/pack_mesh.py <html> <lib> <cut.json> [<obj>]

<cut.json> is what cut_body.py / cut_sedan.py wrote: the body skin cut into
labelled panels, in the generator's frame and the mesh's own units. Every
panel goes in as a SKIN entry, stored as its left half (z >= 0); the generator
mirrors the right. Panels whose label names a lamp or a grille go in as PARTS
instead, with the material tag the generator dresses them in, because that is
how the lighting stage picks them up. An <obj> with named groups (the city car
had them: lights, mirrors, handles, wipers, diffuser) adds those groups as
parts as well; a reference that has no groups simply gives none.

Positions are uint16 in a per-panel box, normals int8 (the exporter's, so the
smoothing survives), indices uint16, all base64. Stored as fractions of the
mesh's own length, height and half width, so a car of any size puts them where
they belong. The wheels are never packed: the generator builds its own.

The block between the MESHLIB markers holds one entry per library; packing
one library leaves the others as they are.
"""
import sys, re, base64, struct, json, collections

html_path, lib_name, cut_path = sys.argv[1], sys.argv[2], sys.argv[3]
obj_path = sys.argv[4] if len(sys.argv) > 4 else None

cut = json.load(open(cut_path))
CP, CN, CF, CL = cut['P'], cut['N'], cut['F'], cut['lab']
L, H, HW, XC = cut['L'], cut['H'], cut['HW'], cut['XC']
print('lib %s: L %.1f H %.1f HW %.1f, %d faces' % (lib_name, L, H, HW, len(CF)))

def b64(b): return base64.b64encode(b).decode('ascii')

def encode(pos, nrm, idx):
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

total = 0
skin, parts = {}, {}

# ---- panels from the cut ---------------------------------------------------
def area2(i):
    a, b, c = CP[CF[i][0]], CP[CF[i][1]], CP[CF[i][2]]
    n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
    return sum(x * x for x in n)

def pack_faces(fs):
    index = {}
    pos, nrm, idx = [], [], []
    for i in fs:
        for v in CF[i]:
            k = (tuple(round(x, 2) for x in CP[v]), tuple(round(x, 2) for x in CN[v]))
            j = index.get(k)
            if j is None:
                j = index[k] = len(pos)
                x, y, z = CP[v]
                pos.append(((x - XC) / L, y / H, z / HW))
                nn = list(CN[v])
                if abs(z) < 0.15: nn[2] = 0.0          # on the centreline the normal is in the plane: no seam between the halves
                nrm.append(nn)
            idx.append(j)
    return pos, nrm, idx

# ---- named groups from the obj, when there are any --------------------------
if obj_path:
    V, VN, faces = [], [], []
    grp = None
    for line in open(obj_path, errors='ignore'):
        if line.startswith('v '):
            x, y, z = map(float, line.split()[1:4]); V.append((-x, z, y))
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
    tyres = [g for g in by_group if g.startswith('Tire')]
    ground = min(V[c[0]][1] for g in tyres for f in by_group[g] for c in f)
    # the frame is the obj's own when there is one: ground at the bottom of the
    # tyres, height and half width off the Body group - the cut file's height
    # was taken from a rounded ground and differs in the fifth decimal, which
    # is enough to move every packed point by a quantisation step
    body = [c for f in by_group['Body'] for c in f]
    NOSE_, TAIL_ = max(V[c[0]][0] for c in body), min(V[c[0]][0] for c in body)
    L, XC = NOSE_ - TAIL_, (NOSE_ + TAIL_) / 2
    H = max(V[c[0]][1] for c in body) - ground
    HW = max(V[c[0]][2] for c in body)
    print('frame from the obj: L %.4f H %.4f HW %.4f' % (L, H, HW))
    GROUPS = {
        # name: (half, [(group, material), ...])
        'headlight': (True,  [('headlights_glass', 'lens'), ('Light_chrome', 'chrome')]),
        'taillight': (True,  [('taillight', 'tailred')]),
        'mirror':    (True,  [('side_mirror', 'plastic')]),
        'handle':    (True,  [('doorhandle', 'plastic')]),
        'grille':    (False, [('grid', 'grille')]),
        'wiper':     (False, [('screen_wiper', 'plastic')]),
        'diffuser':  (False, [('diffuser', 'plastic')]),
    }
    for name, (half, subs) in GROUPS.items():
        rec = {'frame': 'body', 'half': half, 'subs': []}
        for g, mat in subs:
            fs = by_group.get(g, [])
            if half: fs = [f for f in fs if sum(V[c[0]][2] for c in f) / 3 > 0]
            if not fs: continue
            index = {}
            pos, nrm, idx = [], [], []
            for f in fs:
                for c in f:
                    k = index.get(c)
                    if k is None:
                        k = index[c] = len(pos)
                        x, y, z = V[c[0]]
                        pos.append(((x - XC) / L, (y - ground) / H, z / HW))
                        nrm.append(VN[c[1]] if c[1] >= 0 else (0, 1, 0))
                    idx.append(k)
            assert len(pos) < 65536, (name, len(pos))
            sub, nbytes = encode(pos, nrm, idx)
            total += nbytes
            sub['mat'] = mat
            rec['subs'].append(sub)
            print('  part %-18s %6d tris %6d verts  (%s)' % (name + '/' + g, len(fs), len(pos), mat))
        if rec['subs']: parts[name] = rec
# labels that are parts, not skin, and the material the generator dresses their
# untagged faces in. A cut may tag faces with a material of their own ('mat',
# parallel to 'lab'): on a part they become subs of that material, on a panel
# they become its trim - the chrome moulding on a door travels with the door.
PART_MAT = {'headlight': 'lens', 'taillight': 'tailred', 'grille': 'grille', 'diffuser': 'plastic', 'mirror': 'plastic'}
CM = cut.get('mat') or [None] * len(CL)

for name in sorted(set(CL)):
    if name.endswith('.r'): continue
    fs = [i for i, l in enumerate(CL) if l == name]
    if not name.endswith('.l'):
        fs = [i for i in fs if sum(CP[v][2] for v in CF[i]) / 3 > 0]
    fs = [i for i in fs if area2(i) > 1e-4]          # drop slivers and the mesh's own degenerate faces
    if not fs: continue
    base = name[:-2] if name.endswith('.l') else name
    if base in PART_MAT:
        rec = {'frame': 'body', 'half': True, 'subs': []}
        for mat in sorted({CM[i] or PART_MAT[base] for i in fs}):
            sub_fs = [i for i in fs if (CM[i] or PART_MAT[base]) == mat]
            pos, nrm, idx = pack_faces(sub_fs)
            assert len(pos) < 65536, (name, len(pos))
            sub, nbytes = encode(pos, nrm, idx)
            total += nbytes
            rec['subs'].append(dict(sub, mat=mat))
            print('  part %-18s %6d tris %6d verts  (%s)' % (name, len(sub_fs), len(pos), mat))
        parts[base] = rec
        continue
    plain = [i for i in fs if CM[i] is None]
    pos, nrm, idx = pack_faces(plain)
    assert len(pos) < 65536, (name, len(pos))
    rec, nbytes = encode(pos, nrm, idx)
    total += nbytes
    skin[base] = {'half': True, 'solid': base.startswith('door'), 'sub': rec}
    print('  skin %-18s %6d tris %6d verts' % (name, len(plain), len(pos)))
    for mat in sorted({CM[i] for i in fs if CM[i]}):
        sub_fs = [i for i in fs if CM[i] == mat]
        pos, nrm, idx = pack_faces(sub_fs)
        sub, nbytes = encode(pos, nrm, idx)
        total += nbytes
        skin[base].setdefault('trim', []).append(dict(sub, mat=mat))
        print('  trim %-18s %6d tris %6d verts  (%s)' % (name, len(sub_fs), len(pos), mat))


hosts = cut.get('host') or {}          # a pane that rides on a door rather than on the body
print('binary total %.0f kB' % (total / 1024))

# ---- into the file, next to the other libraries -----------------------------
s = open(html_path).read()
a, b = s.index('/* MESHLIB-BEGIN'), s.index('/* MESHLIB-END */') + len('/* MESHLIB-END */')
block = s[a:b]
libs = collections.OrderedDict()
m = re.search(r'const MESH_LIB = \{', block)
if m:
    i = m.end()
    while True:
        mm = re.match(r'\s*([A-Za-z_]\w*):\s*\{', block[i:])
        if not mm: break
        name = mm.group(1); j = i + mm.end() - 1      # at the '{'
        depth = 0; k = j
        while True:
            ch = block[k]
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0: break
            k += 1
        libs[name] = block[j:k + 1]
        i = k + 1
        mm2 = re.match(r'\s*,', block[i:])
        if mm2: i += mm2.end()
libs[lib_name] = '{ L: %.4f, H: %.4f, HW: %.4f, parts: %s, skin: %s%s }' % (
    L, H, HW, json.dumps(parts, separators=(',', ':')), json.dumps(skin, separators=(',', ':')),
    (', hosts: ' + json.dumps(hosts, separators=(',', ':'))) if hosts else '')
js = ('/* MESHLIB-BEGIN: generated by tools/reference/pack_mesh.py, do not edit by hand */\n'
      'const MESH_LIB = { ' + ', '.join('%s: %s' % (n, v) for n, v in libs.items()) + ' };\n'
      '/* MESHLIB-END */')
open(html_path, 'w').write(s[:a] + js + s[b:])
print('written: block %.0f kB, libraries: %s' % (len(js) / 1024, ', '.join(libs)))
