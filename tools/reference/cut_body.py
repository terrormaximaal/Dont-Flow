"""Cut the reference body skin into panels.

The mesh's body is one smooth surface; only the doors sit in a closed groove
of their own. Every other panel edge is cut here, by clipping triangles
against scalar fields (planes and measured curves) so the edges are clean
lines rather than the zigzag of the triangulation. Glass is what the texture
paints dark, above the belt. The result is body_cut.json: vertices with
position, normal and texture coordinates, faces with a panel label, all in
the generator's frame and in the mesh's own centimetres.

    python3 tools/reference/cut_body.py <obj> <out.json>
"""
import sys, os, json, math, collections
obj_path, out_path = sys.argv[1], sys.argv[2]
V, VN, VT, F = [], [], [], []
grp = None
for line in open(obj_path, errors='ignore'):
    if line.startswith('v '): x, y, z = map(float, line.split()[1:4]); V.append([-x, z, y])
    elif line.startswith('vn '): x, y, z = map(float, line.split()[1:4]); VN.append([-x, z, y])
    elif line.startswith('vt '): p = line.split(); VT.append([float(p[1]), float(p[2])])
    elif line.startswith('g '): grp = line.strip()[2:]
    elif line.startswith('f ') and grp == 'Body':
        cs = []
        for tok in line.split()[1:]:
            f = tok.split('/'); cs.append((int(f[0]) - 1, int(f[1]) - 1, int(f[2]) - 1))
        for k in range(1, len(cs) - 1): F.append([cs[0], cs[k], cs[k + 1]])
ground = -0.66                           # bottom of the tyres (see pack_mesh.py)
for p in V: p[1] -= ground
xs = [V[c[0]][0] for f in F for c in f]
NOSE, TAIL = max(xs), min(xs); L = NOSE - TAIL; XC = (NOSE + TAIL) / 2
H = max(V[c[0]][1] for f in F for c in f); HW = max(abs(V[c[0]][2]) for f in F for c in f)
print('L %.1f H %.1f HW %.1f' % (L, H, HW))

# corners become their own vertices: (pos, nrm, uv), so clipping can interpolate all three
P = []; NR = []; UV = []; faces = []
key = {}
for f in F:
    tri = []
    for c in f:
        k = key.get(c)
        if k is None:
            k = key[c] = len(P); P.append(list(V[c[0]])); NR.append(list(VN[c[2]])); UV.append(list(VT[c[1]]))
        tri.append(k)
    faces.append(tri)
def st(p): return (NOSE - p[0]) / L
def yh(p): return p[1] / H
def zh(p): return p[2] / HW

# texture: dark = glass or black plastic (thresholded in the browser, body_mask.txt)
mask = open(sys.argv[3]).read() if len(sys.argv) > 3 else None
def dark_uv(u, v):
    if not mask: return False
    x = int(u * 1023) % 1024; y = int((1 - v) * 1023) % 1024
    return mask[y * 1024 + x] == '1'

# ---- clipping ---------------------------------------------------------------
def clip(field, where):
    if os.environ.get('NOCLIP'): return
    """Split every face where `field` changes sign, if `where` holds for the face."""
    global faces
    cache = {}
    def cut(a, b):
        k = (min(a, b), max(a, b))
        if k in cache: return cache[k]
        fa, fb = field(P[a]), field(P[b]); t = fa / (fa - fb)
        P.append([P[a][i] + (P[b][i] - P[a][i]) * t for i in range(3)])
        NR.append([NR[a][i] + (NR[b][i] - NR[a][i]) * t for i in range(3)])
        UV.append([UV[a][i] + (UV[b][i] - UV[a][i]) * t for i in range(2)])
        cache[k] = len(P) - 1
        return cache[k]
    out = []
    for tri in faces:
        c = [(P[tri[0]][i] + P[tri[1]][i] + P[tri[2]][i]) / 3 for i in range(3)]
        fv = [field(P[v]) for v in tri]
        if not where(c) or all(x >= 0 for x in fv) or all(x <= 0 for x in fv):
            out.append(tri); continue
        pos = [v for v, x in zip(tri, fv) if x > 0]; neg = [v for v, x in zip(tri, fv) if x <= 0]
        # keep the winding: walk the triangle in order
        a, b, cc = tri
        s = [x > 0 for x in fv]
        # rotate so that the lone vertex is first
        for r in range(3):
            if s[0] != s[1] and s[0] != s[2]: break
            a, b, cc = b, cc, a; s = s[1:] + s[:1]
        m1, m2 = cut(a, b), cut(a, cc)
        out.append([a, m1, m2]); out.append([m1, b, cc]); out.append([m1, cc, m2])
    faces = out

shelf = lambda s: 0.46 + max(0.0, s - 0.075) * 1.0          # the wing shelf, roughly (0.46 -> 0.60 by 0.21)
cowl = lambda z: 0.157 + 0.10 * (abs(z) / 0.8) ** 2          # the bonnet's rear edge, later at the sides
FRONT = lambda c: st(c) < 0.20
REAR = lambda c: st(c) > 0.85
clip(lambda p: yh(p) - 0.475, lambda c: st(c) < 0.17)                               # bumper top, front
clip(lambda p: st(p) - 0.048, lambda c: st(c) < 0.10 and yh(c) > 0.40)               # the cover's lip up to the bonnet's leading edge
clip(lambda p: st(p) - 0.115, lambda c: st(c) < 0.20 and yh(c) < 0.50)               # bumper's rear edge round the arch
clip(lambda p: yh(p) - 0.30, lambda c: 0.10 < st(c) < 0.20)                          # low valance continues to the arch
clip(lambda p: yh(p) - 0.47, lambda c: st(c) > 0.85)                                 # bumper top, rear
clip(lambda p: st(p) - 0.925, lambda c: st(c) > 0.85 and yh(c) < 0.50)
clip(lambda p: yh(p) - 0.30, lambda c: 0.85 < st(c) < 0.94)
clip(lambda p: abs(zh(p)) - 0.46, lambda c: st(c) > 0.88 and 0.44 < yh(c) < 0.70)    # tailgate between the lamps
clip(lambda p: yh(p) - 0.67, lambda c: st(c) > 0.88 and abs(zh(c)) > 0.40)            # ...and its shoulder
clip(lambda p: abs(zh(p)) - 0.82, lambda c: st(c) > 0.88 and yh(c) > 0.62)
clip(lambda p: st(p) - 0.878, lambda c: st(c) > 0.85 and yh(c) > 0.45)               # tailgate top: the rear glass's top edge
clip(lambda p: st(p) - cowl(zh(p)), lambda c: st(c) < 0.30 and yh(c) > 0.40)         # bonnet rear edge
clip(lambda p: yh(p) - (shelf(st(p)) + 0.035), lambda c: st(c) < 0.30 and 0.35 < yh(c) < 0.80)   # bonnet wall foot
clip(lambda p: yh(p) - 0.72, lambda c: 0.15 < st(c) < 0.95)                          # roof / flank
clip(lambda p: yh(p) - 0.24, lambda c: 0.27 < st(c) < 0.66)                          # rocker
clip(lambda p: st(p) - 0.60, lambda c: yh(c) < 0.25)                                 # fender / quarter, below the door
clip(lambda p: yh(p) - 0.21, lambda c: 0.05 < st(c) < 0.95)                          # underbody
clip(lambda p: p[2], lambda c: True)                                                 # the centreline, for exact halves
print('after clipping: %d faces, %d vertices' % (len(faces), len(P)))

# ---- the doors: the mesh's own closed slabs. A door sits in a groove whose
# walls face along the car, not outward: faces whose normal leaves the local
# surface by more than 40 degrees are the walls, and taking them out of the
# adjacency leaves each door skin (outer face and inner face) as a component
# of its own. The walls themselves are given to the door they border.
def fnormal(tri):
    a, b, c = P[tri[0]], P[tri[1]], P[tri[2]]
    n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
    l = math.sqrt(sum(x*x for x in n))
    return [x / l for x in n] if l > 1e-9 else [0, 1, 0], l / 2
edge = collections.defaultdict(list)
def pkey(v): return tuple(round(x, 3) for x in P[v])
for i, tri in enumerate(faces):
    for a in range(3):
        k = tuple(sorted([pkey(tri[a]), pkey(tri[(a+1)%3])]))
        edge[k].append(i)
adj = collections.defaultdict(set)
for fl in edge.values():
    for a in fl:
        for b in fl:
            if a != b: adj[a].add(b)
FN, AREA = zip(*[fnormal(t) for t in faces])
CEN = [[(P[t[0]][i] + P[t[1]][i] + P[t[2]][i]) / 3 for i in range(3)] for t in faces]
# the local surface is read over the faces around each VERTEX (two rings of
# them), so a groove wall is compared with the skin on both sides of it
vfaces = collections.defaultdict(list)
for i, tri in enumerate(faces):
    for v in tri: vfaces[pkey(v)].append(i)
vadj = collections.defaultdict(set)
for fl in vfaces.values():
    for a in fl:
        for b in fl:
            if a != b: vadj[a].add(b)
def ring(i, depth=2):
    seen = {i}; front = {i}
    for _ in range(depth):
        nxt = set()
        for f in front:
            for g in vadj[f]:
                if g not in seen: seen.add(g); nxt.add(g)
        front = nxt
    return seen
dev = []
for i in range(len(faces)):
    m = [0.0, 0.0, 0.0]
    for g in ring(i):
        for k in range(3): m[k] += FN[g][k] * AREA[g]
    l = math.sqrt(sum(x*x for x in m)) or 1
    d = sum(FN[i][k] * m[k] for k in range(3)) / l
    dev.append(math.degrees(math.acos(max(-1, min(1, d)))))
seam = [d > 40 for d in dev]
import os
if os.environ.get('DEBUG'):
    print('seam faces', sum(seam))
parent = list(range(len(faces)))
def find(a):
    while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
    return a
for a in range(len(faces)):
    if seam[a]: continue
    for b in adj[a]:
        if not seam[b]: parent[find(a)] = find(b)
cid = [find(i) for i in range(len(faces))]
size = collections.Counter(cid[i] for i in range(len(faces)) if not seam[i])
if os.environ.get('DEBUG'):
    print('components', sorted(size.values(), reverse=True)[:12])
    for c, n in size.most_common(6):
        fs = [i for i in range(len(faces)) if cid[i] == c and not seam[i]]
        pts = [P[v] for i in fs for v in faces[i]]
        print('  %5d st %.3f..%.3f y %.3f..%.3f z %.2f..%.2f' % (n, st([max(q[0] for q in pts)]), st([min(q[0] for q in pts)]), min(q[1] for q in pts)/H, max(q[1] for q in pts)/H, min(q[2] for q in pts)/HW, max(q[2] for q in pts)/HW))
lab = [None] * len(faces)
for i in range(len(faces)):
    if seam[i] or not (400 < size[cid[i]] < 6000): continue
    c = CEN[i]
    if 0.26 < st(c) < 0.66 and 0.2 < yh(c) < 0.99: lab[i] = 'door.l' if c[2] > 0 else 'door.r'
# the groove walls go with the door they touch (two passes, for the inner corners)
# ...but only the door's own wall: a seam face whose every skin neighbour is door
for _ in range(2):
    for i in range(len(faces)):
        if lab[i] or not seam[i]: continue
        skin = [lab[b] for b in adj[i] if not seam[b]]
        if skin and all(l and l.startswith('door') for l in skin): lab[i] = skin[0]
print('door faces', sum(1 for l in lab if l))

for i, tri in enumerate(faces):
    c = CEN[i]; s, y, z = st(c), yh(c), zh(c); az = abs(z); side = 'l' if z > 0 else 'r'
    uv = [(UV[tri[0]][k] + UV[tri[1]][k] + UV[tri[2]][k]) / 3 for k in range(2)]
    dark = dark_uv(*uv)
    if lab[i]:
        if dark and y > 0.62 and abs(FN[i][2]) > 0.5: lab[i] = 'glass.' + lab[i][5:]   # the door's window
        continue
    if y < 0.21 and 0.05 < s < 0.95: lab[i] = 'underbody'; continue
    if dark and y > 0.60:
        if s < 0.46 and az < 0.75: lab[i] = 'glass.windshield'; continue
        if s > 0.88: lab[i] = 'glass.rear'; continue
        if 0.60 < s < 0.88 and az > 0.55: lab[i] = 'glass.quarter.' + side; continue
    if s < 0.115 and y < 0.475: lab[i] = 'bumper.front'; continue
    if s < 0.048 and not dark: lab[i] = 'bumper.front'; continue      # the lip between bumper top and bonnet edge
    if s < 0.20 and y < 0.30: lab[i] = 'bumper.front'; continue
    if s > 0.925 and y < 0.47: lab[i] = 'bumper.rear'; continue
    if s > 0.85 and y < 0.30: lab[i] = 'bumper.rear'; continue
    if s > 0.878 and y >= 0.47 and (az < 0.46 or (y > 0.67 and az < 0.82)): lab[i] = 'tailgate'; continue
    if s < cowl(z) and y > shelf(s) + 0.035 and az < 0.82 and not dark: lab[i] = 'hood'; continue
    if y > 0.72 and 0.15 < s < 0.95: lab[i] = 'roof'; continue
    if s < 0.60 and not (0.27 < s < 0.66 and y < 0.24): lab[i] = 'fender.' + side; continue
    if 0.27 < s < 0.66 and y < 0.24: lab[i] = 'rocker.' + side; continue
    lab[i] = 'quarter.' + side
# absorb small islands
for it in range(4):
    parent = list(range(len(faces)))
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a in range(len(faces)):
        for b in adj[a]:
            if lab[a] == lab[b]: parent[find(a)] = find(b)
    cid = [find(i) for i in range(len(faces))]; size = collections.Counter(cid); changed = 0
    for i in range(len(faces)):
        if size[cid[i]] < 30:
            nb = collections.Counter(lab[b] for b in adj[i] if lab[b] != lab[i])
            if nb: lab[i] = nb.most_common(1)[0][0]; changed += 1
    if not changed: break
print({n: sum(1 for l in lab if l == n) for n in sorted(set(lab))})
json.dump({'L': L, 'H': H, 'HW': HW, 'XC': XC, 'P': P, 'N': NR, 'UV': UV, 'F': faces, 'lab': lab}, open(out_path, 'w'))
