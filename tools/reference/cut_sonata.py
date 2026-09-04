"""Cut the sedan reference into panels.

Same idea as cut_body.py, a different car: a three-box, four-door saloon that
comes as ONE mesh of 668 triangles with its wheels in it and everything else
painted into the texture. So the wheels are dropped as their own connected
components, the doors are cut at stations (there are no grooves to find them
in), and the texture's classes give what the geometry cannot: dark = glass
(above the belt) or grille (low at the nose), bright = headlamp lens, red =
tail lamp. The cuts are clips against scalar fields, so the panel edges are
clean lines through a triangulation this coarse.

    python3 tools/reference/cut_sedan.py <obj> <mask.txt> <out.json>
"""
import sys, os, json, math, collections
obj_path, mask_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
V, VN, VT, F = [], [], [], []
for line in open(obj_path, errors='ignore'):
    p = line.split()
    if not p: continue
    # model: x lateral, y up, z length (nose at +z) -> ours: x length, y up, z lateral.
    # (z, y, -x) is a rotation, not a mirror, so the winding survives.
    if p[0] == 'v': x, y, z = map(float, p[1:4]); V.append([z, y, -x])
    elif p[0] == 'vn': x, y, z = map(float, p[1:4]); VN.append([z, y, -x])
    elif p[0] == 'vt': VT.append([float(p[1]), float(p[2])])
    elif p[0] == 'f':
        cs = [tuple(int(t) - 1 for t in tok.split('/')) for tok in p[1:]]
        for k in range(1, len(cs) - 1): F.append([cs[0], cs[k], cs[k + 1]])
ground = min(v[1] for v in V)
for v in V: v[1] -= ground

# the wheels are the small connected components; the body is the big one
par = {}
def find(a):
    while par.setdefault(a, a) != a: a = par[a]
    return a
pk = lambda i: tuple(round(c, 3) for c in V[i])
for f in F:
    for c in f[1:]: par[find(pk(f[0][0]))] = find(pk(c[0]))
comp = collections.defaultdict(list)
for i, f in enumerate(F): comp[find(pk(f[0][0]))].append(i)
big = max(comp.values(), key=len)
print('componenten: %s, carrosserie = %d driehoeken' % (sorted((len(c) for c in comp.values()), reverse=True), len(big)))
F = [F[i] for i in big]

xs = [V[c[0]][0] for f in F for c in f]
NOSE, TAIL = max(xs), min(xs); L = NOSE - TAIL; XC = (NOSE + TAIL) / 2
H = max(V[c[0]][1] for f in F for c in f); HW = max(abs(V[c[0]][2]) for f in F for c in f)
print('L %.1f H %.1f HW %.1f' % (L, H, HW))

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

m = open(mask_path).read().split('\n'); MW, MH = map(int, m[0].split()); MASK = m[1]
def klass(u, v):
    x = min(MW - 1, max(0, int(u * (MW - 1)))); y = min(MH - 1, max(0, int((1 - v) * (MH - 1))))
    return int(MASK[y * MW + x])

# A lamp is a fraction of one of these triangles, so one sample at the centroid
# misses it. Sample the texture over every triangle's area instead and carry
# each sample's 3D position along: the samples of a class inside a coarse
# region give the class its box in the car's own frame, and the box is then
# cut cleanly with planes.
def class_box(k, where):
    lo = [9, 9, 9]; hi = [-9, -9, -9]; n = 0
    for tri in faces:
        for a in range(0, 12):
            for b in range(0, 12 - a):
                w0 = (a + 0.33) / 12.0; w1 = (b + 0.33) / 12.0; w2 = 1 - w0 - w1
                if w2 < 0: continue
                u = w0 * UV[tri[0]][0] + w1 * UV[tri[1]][0] + w2 * UV[tri[2]][0]
                v = w0 * UV[tri[0]][1] + w1 * UV[tri[1]][1] + w2 * UV[tri[2]][1]
                if klass(u, v) != k: continue
                q = [w0 * P[tri[0]][i] + w1 * P[tri[1]][i] + w2 * P[tri[2]][i] for i in range(3)]
                if not where(q): continue                     # the sample, not the triangle: these are big
                f = (st(q), yh(q), abs(zh(q)))
                for i in range(3): lo[i] = min(lo[i], f[i]); hi[i] = max(hi[i], f[i])
                n += 1
    return (lo, hi, n)

def clip(field, where):
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
        a, b, cc = tri; s = [x > 0 for x in fv]
        for r in range(3):
            if s[0] != s[1] and s[0] != s[2]: break
            a, b, cc = b, cc, a; s = s[1:] + s[:1]
        m1, m2 = cut(a, b), cut(a, cc)
        out.append([a, m1, m2]); out.append([m1, b, cc]); out.append([m1, cc, m2])
    faces = out

# ---- the plan: stations from the wheels and the pillars ------------------------
# front axle 0.191 L, rear 0.778 L. A-pillar foot 0.31, B-pillar 0.53, rear door
# to the arch at 0.72. Screen base at the centre 0.275, curving back at the sides.
DOOR_F, DOOR_B, DOOR_R = 0.31, 0.53, 0.72
BELT = 0.683
cowl = lambda z: 0.275 + 0.05 * (abs(z)) ** 2
clip(lambda p: yh(p) - 0.17, lambda c: 0.04 < st(c) < 0.96)                       # underbody
clip(lambda p: yh(p) - 0.25, lambda c: DOOR_F - 0.02 < st(c) < DOOR_R + 0.02)     # rocker
clip(lambda p: st(p) - DOOR_F, lambda c: yh(c) > 0.17)                            # door edges, pillars included
clip(lambda p: st(p) - DOOR_B, lambda c: yh(c) > 0.17)
clip(lambda p: st(p) - DOOR_R, lambda c: yh(c) > 0.17)
clip(lambda p: yh(p) - BELT, lambda c: DOOR_F - 0.03 < st(c) < 0.80)             # belt: door / greenhouse
clip(lambda p: yh(p) - 0.52, lambda c: st(c) < 0.14)                              # bumper top = bonnet's leading edge
clip(lambda p: yh(p) - 0.50, lambda c: st(c) > 0.88)                              # rear bumper top
clip(lambda p: st(p) - 0.10, lambda c: yh(c) < 0.54)                              # front bumper's rear edge
clip(lambda p: st(p) - 0.93, lambda c: yh(c) < 0.52)                              # rear bumper's front edge
# the lamps and the grille: boxes read off the texture, then cut as boxes
HL = class_box(2, lambda c: st(c) < 0.16 and 0.36 < yh(c) < 0.72 and abs(zh(c)) > 0.40)
TL = class_box(3, lambda c: st(c) > 0.84 and 0.45 < yh(c) < 0.82)
GR = class_box(1, lambda c: st(c) < 0.06 and 0.33 < yh(c) < 0.56 and abs(zh(c)) < 0.62)
for name, (lo, hi, n) in (('koplamp', HL), ('achterlicht', TL), ('grille', GR)):
    print('%-12s %5d monsters  st %.3f..%.3f  y %.3f..%.3f  |z| %.2f..%.2f' % (name, n, lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]))
def box_clip(bx, pad=0.0):
    lo, hi, n = bx
    if n < 20: return None
    b = [lo[0] - pad, hi[0] + pad, lo[1] - pad, hi[1] + pad, lo[2] - pad, hi[2] + pad]
    where = lambda c: (b[0] - 0.05 < st(c) < b[1] + 0.05) and (b[2] - 0.08 < yh(c) < b[3] + 0.08)
    clip(lambda p: st(p) - b[0], where); clip(lambda p: st(p) - b[1], where)
    clip(lambda p: yh(p) - b[2], where); clip(lambda p: yh(p) - b[3], where)
    clip(lambda p: abs(zh(p)) - b[4], where); clip(lambda p: abs(zh(p)) - b[5], where)
    return b
HLB, TLB, GRB = box_clip(HL), box_clip(TL), box_clip(GR)
inbox = lambda b, s, y, az: b and b[0] <= s <= b[1] and b[2] <= y <= b[3] and b[4] <= az <= b[5]
clip(lambda p: abs(zh(p)) - 0.86, lambda c: st(c) < 0.32 and yh(c) > 0.45)        # bonnet / wing
clip(lambda p: st(p) - cowl(zh(p)), lambda c: st(c) < 0.40 and yh(c) > 0.55)      # bonnet rear edge
clip(lambda p: st(p) - 0.43, lambda c: yh(c) > 0.80)                              # windscreen top / roof
clip(lambda p: st(p) - 0.66, lambda c: yh(c) > 0.80)                              # roof / rear window
clip(lambda p: st(p) - 0.79, lambda c: yh(c) > 0.55)                              # roof / boot lid
clip(lambda p: abs(zh(p)) - 0.86, lambda c: st(c) > 0.78 and yh(c) > 0.55)        # boot lid / quarter
clip(lambda p: p[2], lambda c: True)                                              # the centreline
print('na het snijden: %d driehoeken, %d punten' % (len(faces), len(P)))

def fnormal(tri):
    a, b, c = P[tri[0]], P[tri[1]], P[tri[2]]
    n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
    l = math.sqrt(sum(x * x for x in n)) or 1e-9
    return [x / l for x in n], l / 2
FN = [fnormal(t)[0] for t in faces]
lab = [None] * len(faces)
for i, tri in enumerate(faces):
    c = [(P[tri[0]][k] + P[tri[1]][k] + P[tri[2]][k]) / 3 for k in range(3)]
    s, y, z = st(c), yh(c), zh(c); az = abs(z); side = 'l' if c[2] > 0 else 'r'
    uv = [(UV[tri[0]][k] + UV[tri[1]][k] + UV[tri[2]][k]) / 3 for k in range(2)]
    kl = klass(*uv)
    ny, nz = FN[i][1], abs(FN[i][2])
    # the boxes from the texture first: lamps and grille; then the glass by class
    if inbox(HLB, s, y, az): lab[i] = 'headlight.' + side; continue
    if inbox(TLB, s, y, az): lab[i] = 'taillight.' + side; continue
    if inbox(GRB, s, y, az): lab[i] = 'grille'; continue
    if kl == 1 and y > 0.60:
        if nz > 0.55:
            if s < DOOR_B: lab[i] = 'glass.' + side
            elif s < DOOR_R: lab[i] = 'glassR.' + side
            elif s < 0.80: lab[i] = 'glass.quarter.' + side
            else: lab[i] = None
            if lab[i]: continue
        # the roof is painted dark in this texture too, so the screens are bounded
        # by station: the windscreen ends where the roof line levels off, the
        # rear window begins where it falls away again
        elif s < 0.43: lab[i] = 'glass.windshield'; continue
        elif 0.66 < s < 0.82: lab[i] = 'glass.rear'; continue
    if y < 0.17 and 0.04 < s < 0.96: lab[i] = 'underbody'; continue
    if s < 0.10 and y < 0.52 or s < 0.035: lab[i] = 'bumper.front'; continue
    if s > 0.93 and y < 0.50: lab[i] = 'bumper.rear'; continue
    if DOOR_F - 0.02 < s < DOOR_R + 0.02 and y < 0.25: lab[i] = 'rocker.' + side; continue
    if DOOR_F < s < DOOR_B and y < BELT: lab[i] = 'door.' + side; continue
    if DOOR_B < s < DOOR_R and y < BELT: lab[i] = 'doorR.' + side; continue
    if s < cowl(z) and az < 0.86 and y > 0.45 and s > 0.035: lab[i] = 'hood'; continue
    if s > 0.79 and y > 0.50 and (az < 0.86 or s > 0.975): lab[i] = 'trunk'; continue
    if y > BELT and DOOR_F - 0.03 < s < 0.80: lab[i] = 'roof'; continue
    if s < DOOR_F: lab[i] = 'fender.' + side; continue
    lab[i] = 'quarter.' + side

# absorb small islands (the mesh is coarse: 3 faces is already a panel corner)
pkey = lambda v: tuple(round(x, 3) for x in P[v])
edge = collections.defaultdict(list)
for i, tri in enumerate(faces):
    for a in range(3): edge[tuple(sorted([pkey(tri[a]), pkey(tri[(a + 1) % 3])]))].append(i)
adj = collections.defaultdict(set)
for fl in edge.values():
    for a in fl:
        for b in fl:
            if a != b: adj[a].add(b)
for it in range(3):
    parent = list(range(len(faces)))
    def find2(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a in range(len(faces)):
        for b in adj[a]:
            if lab[a] == lab[b]: parent[find2(a)] = find2(b)
    cid = [find2(i) for i in range(len(faces))]; size = collections.Counter(cid); changed = 0
    for i in range(len(faces)):
        if size[cid[i]] < 3 and not lab[i].startswith(('headlight', 'taillight', 'grille')):
            nb = collections.Counter(lab[b] for b in adj[i] if lab[b] != lab[i])
            if nb: lab[i] = nb.most_common(1)[0][0]; changed += 1
    if not changed: break
print({n: sum(1 for l in lab if l == n) for n in sorted(set(lab))})
json.dump({'L': L, 'H': H, 'HW': HW, 'XC': XC, 'P': P, 'N': NR, 'UV': UV, 'F': faces, 'lab': lab}, open(out_path, 'w'))
