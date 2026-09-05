"""Cut the supercar reference into panels and parts.

One painted shell of 144 000 triangles, no materials to speak of, plus the
wheels as their own groups and six diffuser fins as shells. What the sedan's
materials gave, this mesh gives through its creases: at a 12 degree fold the
windscreen, the roof, the side panes, the rear window, the door skins, the
wheel wells, the headlamp recesses, the grille, the tail band and the mirror
bodies all come loose as regions of their own. The rest - bonnet, wings,
quarters, engine cover, bumpers, sills, floor - is cut with planes at
stations, as before, with the bonnet's rear edge on the windscreen's own base.

    python3 tools/reference/cut_super.py <obj> <out.json>
"""
import sys, json, math, collections
obj_path, out_path = sys.argv[1], sys.argv[2]

V, VN, F = [], [], []
g = None
for line in open(obj_path, errors='ignore'):
    p = line.split()
    if not p: continue
    # model: x length (nose at -x), y lateral, z up -> ours: x length (nose +x), y up, z lateral. (-x, z, y) is a rotation.
    if p[0] == 'v': x, y, z = map(float, p[1:4]); V.append([-x, z, y])
    elif p[0] == 'vn': x, y, z = map(float, p[1:4]); VN.append([-x, z, y])
    elif p[0] == 'g': g = p[1]
    elif p[0] == 'f':
        cs = [tuple(int(t) - 1 if t else -1 for t in tok.split('/')) for tok in p[1:]]
        for k in range(1, len(cs) - 1): F.append((g, [cs[0], cs[k], cs[k + 1]]))
ground = min(v[1] for v in V)
# the model is in metres-or-so, ten units long; the packer's sliver threshold
# is in square centimetres, so the cut is handed on in centimetres
for v in V: v[1] -= ground; v[0] *= 100; v[1] *= 100; v[2] *= 100

# ---- shells --------------------------------------------------------------------
par = {}
def find(a):
    while par.setdefault(a, a) != a: a = par[a]
    return a
for gname, f in F:
    for c in f[1:]: par[find(f[0][0])] = find(c[0])
shells = collections.defaultdict(list)
for i, (gname, f) in enumerate(F): shells[find(f[0][0])].append(i)
shells = sorted(shells.values(), key=len, reverse=True)
def bbox(fl):
    pts = [V[c[0]] for i in fl for c in F[i][1]]
    return [min(p[k] for p in pts) for k in range(3)], [max(p[k] for p in pts) for k in range(3)]
body = shells[0]
lo, hi = bbox(body)
NOSE, TAIL = hi[0], lo[0]; L = NOSE - TAIL; XC = (NOSE + TAIL) / 2; H = hi[1]
def st(p): return (NOSE - p[0]) / L
def yh(p): return p[1] / H

# the wheels are groups of their own; the fins are painted shells at the tail, low
keep = []
for sh in shells:
    if F[sh[0]][0] != 'supercar_corp': continue
    if sh is body: role = 'body'
    else:
        lo2, hi2 = bbox(sh)
        role = 'diffuser' if st(lo2) > 0.80 and yh(hi2) < 0.45 else 'body'   # lo2 has the smallest x: the tail end
    for i in sh: keep.append((i, role))

# ---- one vertex per position, crease regions on the body ------------------------
P, NR, faces, ROLE = [], [], [], []
key = {}
for i, role in keep:
    tri = []
    for c in F[i][1]:
        k = key.get(c[0])
        if k is None:
            k = key[c[0]] = len(P); P.append(list(V[c[0]])); NR.append(list(VN[c[2]]) if c[2] >= 0 else None)
        tri.append(k)
    faces.append(tri); ROLE.append(role)
def fnormal(tri):
    a, b, c = P[tri[0]], P[tri[1]], P[tri[2]]
    n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
    l = math.sqrt(sum(x * x for x in n)) or 1e-9
    return [x / l for x in n]
FN = [fnormal(t) for t in faces]
for i, tri in enumerate(faces):                     # the exporter gave no normals: the face's own, smoothed later by the packer's weld
    for v in tri:
        if NR[v] is None: NR[v] = list(FN[i])
edge = collections.defaultdict(list)
for i, tri in enumerate(faces):
    for a in range(3): edge[tuple(sorted([tri[a], tri[(a + 1) % 3]]))].append(i)
COS = math.cos(math.radians(12))
adj = collections.defaultdict(set)
for e, fl in edge.items():
    if len(fl) == 2 and sum(FN[fl[0]][k] * FN[fl[1]][k] for k in range(3)) >= COS: adj[fl[0]].add(fl[1]); adj[fl[1]].add(fl[0])
region = [-1] * len(faces); nreg = 0
for i in range(len(faces)):
    if region[i] >= 0 or ROLE[i] != 'body': continue
    stack = [i]; region[i] = nreg
    while stack:
        a = stack.pop()
        for b in adj[a]:
            if region[b] < 0: region[b] = nreg; stack.append(b)
    nreg += 1
members = collections.defaultdict(list)
for i, r in enumerate(region):
    if r >= 0: members[r].append(i)

# the body's half width is the flank's, not the mirrors': they are a region of their own
HW = 0
rinfo = {}
for r, fl in members.items():
    pts = [P[v] for i in fl for v in faces[i]]
    lo = [min(p[k] for p in pts) for k in range(3)]; hi = [max(p[k] for p in pts) for k in range(3)]
    rinfo[r] = (len(fl), (NOSE - hi[0]) / L, (NOSE - lo[0]) / L, lo[1] / H, hi[1] / H, lo[2], hi[2])
big = max(members, key=lambda r: len(members[r]))
HW = max(abs(P[v][2]) for i in members[big] for v in faces[i])
print('carrosserie: %d driehoeken, L %.3f H %.3f HW %.3f, %d regio\'s' % (len(faces), L, H, HW, nreg))
def zh(p): return p[2] / HW

# ---- name the regions by where they sit --------------------------------------------
# (n, s0, s1, y0, y1, z0, z1) -> label; the mirror side of a bilateral region from its z
def sideof(z0, z1): return 'l' if (z0 + z1) > 0 else 'r'
RLAB = {}
for r, (n, s0, s1, y0, y1, z0, z1) in rinfo.items():
    az0, az1 = min(abs(z0), abs(z1)) / HW, max(abs(z0), abs(z1)) / HW
    both = z0 < -0.2 * HW and z1 > 0.2 * HW
    lab = None
    if n < 60: continue
    if both and 0.29 < s0 < 0.32 and 0.50 < s1 < 0.54 and y0 > 0.65: lab = 'glass.windshield'
    elif both and 0.48 < s0 < 0.52 and 0.74 < s1 < 0.79 and y0 > 0.85: lab = 'roof'
    elif both and 0.75 < s0 < 0.78 and 0.90 < s1 < 0.93 and y0 > 0.75: lab = 'glass.rear'
    elif both and s0 > 0.90 and s1 > 0.97 and 0.55 < y0 < 0.60 and y1 < 0.73 and n > 2000: lab = 'taillight'
    elif both and s0 < 0.01 and s1 < 0.04 and y0 > 0.2 and y1 < 0.5 and n > 1500: lab = 'grille'
    elif not both and 0.29 < s0 < 0.31 and 0.68 < s1 < 0.71 and y0 < 0.32 and n > 5000: lab = 'door.' + sideof(z0, z1)
    elif not both and 0.36 < s0 < 0.39 and 0.76 < s1 < 0.79 and y0 > 0.65: lab = 'glass.' + sideof(z0, z1)
    elif not both and 0.03 < s0 < 0.05 and 0.13 < s1 < 0.16 and y0 > 0.45: lab = 'headlight.' + sideof(z0, z1)
    elif not both and 0.47 < s0 < 0.50 and 0.49 < s1 < 0.51 and y0 > 0.70 and az1 > 0.9: lab = 'mirror.' + sideof(z0, z1)
    elif not both and ((0.10 < s0 < 0.13 and 0.26 < s1 < 0.29) or (0.71 < s0 < 0.74 and 0.87 < s1 < 0.90)) and y1 < 0.62: lab = 'underbody'   # the wheel wells
    if lab: RLAB[r] = lab
print('regio\'s met naam:', collections.Counter(RLAB.values()))

# ---- the plan for the rest: clips --------------------------------------------------
def clip(field, where):
    global faces, ROLE, region
    cache = {}
    def cut(a, b):
        k = (min(a, b), max(a, b))
        if k in cache: return cache[k]
        fa, fb = field(P[a]), field(P[b]); t = fa / (fa - fb)
        P.append([P[a][i] + (P[b][i] - P[a][i]) * t for i in range(3)])
        NR.append([NR[a][i] + (NR[b][i] - NR[a][i]) * t for i in range(3)])
        cache[k] = len(P) - 1
        return cache[k]
    out, orole, oreg = [], [], []
    for tri, role, reg in zip(faces, ROLE, region):
        c = [(P[tri[0]][i] + P[tri[1]][i] + P[tri[2]][i]) / 3 for i in range(3)]
        fv = [field(P[v]) for v in tri]
        if not where(c, role, reg) or all(x >= 0 for x in fv) or all(x <= 0 for x in fv):
            out.append(tri); orole.append(role); oreg.append(reg); continue
        a, b, cc = tri; s = [x > 0 for x in fv]
        for r in range(3):
            if s[0] != s[1] and s[0] != s[2]: break
            a, b, cc = b, cc, a; s = s[1:] + s[:1]
        m1, m2 = cut(a, b), cut(a, cc)
        for t in ([a, m1, m2], [m1, b, cc], [m1, cc, m2]): out.append(t); orole.append(role); oreg.append(reg)
    faces, ROLE, region = out, orole, oreg
REST = lambda c, r, reg: r == 'body' and reg not in RLAB
# the bonnet's rear edge follows the windscreen's base, 6 mm ahead of it
wsv = [(abs(zh(P[v])), st(P[v])) for i, reg in enumerate(region) if RLAB.get(reg) == 'glass.windshield' for v in faces[i]]
WSW = max(a for a, s in wsv)
def cowl(z):
    a = min(abs(z), WSW)
    return min(s for az, s in wsv if abs(az - a) < 0.08) - 0.006
print('cowl: %s' % ' '.join('%.3f' % cowl(z / 10) for z in range(0, 7)))
DOOR_F, DOOR_R, FLOOR, ROCKER = 0.299, 0.696, 0.24, 0.30
clip(lambda p: yh(p) - ROCKER, lambda c, r, reg: REST(c, r, reg) and DOOR_F - 0.02 < st(c) < DOOR_R + 0.02 and abs(zh(c)) > 0.5)   # sill
clip(lambda p: st(p) - DOOR_F, lambda c, r, reg: REST(c, r, reg) and yh(c) > FLOOR and abs(zh(c)) > 0.5)   # jambs
clip(lambda p: st(p) - DOOR_R, lambda c, r, reg: REST(c, r, reg) and yh(c) > FLOOR and abs(zh(c)) > 0.5)
clip(lambda p: st(p) - 0.035, lambda c, r, reg: REST(c, r, reg) and yh(c) > 0.30)                        # nose face / bonnet lip
clip(lambda p: yh(p) - 0.45, lambda c, r, reg: REST(c, r, reg) and st(c) < 0.14)                          # front bumper top
clip(lambda p: st(p) - 0.11, lambda c, r, reg: REST(c, r, reg) and yh(c) < 0.47)                          # front bumper rear edge
clip(lambda p: abs(zh(p)) - 0.66, lambda c, r, reg: REST(c, r, reg) and st(c) < 0.36 and yh(c) > 0.42)    # bonnet / wing
clip(lambda p: st(p) - cowl(zh(p)), lambda c, r, reg: REST(c, r, reg) and st(c) < 0.40 and yh(c) > 0.55)  # bonnet rear edge
clip(lambda p: yh(p) - 0.575, lambda c, r, reg: REST(c, r, reg) and st(c) > 0.88)                         # rear bumper top
clip(lambda p: st(p) - 0.93, lambda c, r, reg: REST(c, r, reg) and yh(c) < 0.60)                          # rear bumper front edge
clip(lambda p: abs(zh(p)) - 0.56, lambda c, r, reg: REST(c, r, reg) and 0.72 < st(c) < 0.95 and yh(c) > 0.62)   # engine cover / quarter
clip(lambda p: st(p) - 0.755, lambda c, r, reg: REST(c, r, reg) and yh(c) > 0.62 and abs(zh(c)) < 0.60)   # cover front edge
clip(lambda p: p[2], lambda c, r, reg: True)                                                              # the centreline
print('na het snijden: %d driehoeken, %d punten' % (len(faces), len(P)))

lab = [None] * len(faces); TAG = [None] * len(faces)
for i, (tri, role, reg) in enumerate(zip(faces, ROLE, region)):
    c = [(P[tri[0]][k] + P[tri[1]][k] + P[tri[2]][k]) / 3 for k in range(3)]
    s, y, z = st(c), yh(c), zh(c); az = abs(z); side = 'l' if c[2] > 0 else 'r'
    if role == 'diffuser': lab[i] = 'diffuser'; TAG[i] = 'plastic'; continue
    if reg in RLAB:
        l = RLAB[reg]; lab[i] = l
        if l.startswith('headlight'): TAG[i] = 'lens'
        elif l == 'taillight': TAG[i] = 'tailred'
        elif l == 'grille': TAG[i] = 'plastic'
        elif l.startswith('mirror'): TAG[i] = 'paint'
        continue
    # the floor pan is what faces the road: a fold, not a height, separates it from the sills and the bumpers' lips
    if fnormal(tri)[1] < -0.35 and 0.02 < s < 0.98: lab[i] = 'underbody'; continue
    if s < 0.035 and y > 0.30 or s < 0.11 and y < 0.45: lab[i] = 'bumper.front'; continue
    if s > 0.93 and y < 0.575: lab[i] = 'bumper.rear'; continue
    if DOOR_F - 0.02 < s < DOOR_R + 0.02 and y < ROCKER and az > 0.5: lab[i] = 'rocker.' + side; continue
    if DOOR_F < s < DOOR_R and az > 0.5 and y < 0.80: lab[i] = 'door.' + side; continue        # what the crease left on the door
    if 0.035 < s < cowl(z) and az < 0.66 and y > 0.42: lab[i] = 'hood'; continue
    if s > 0.755 and y > 0.62 and az < 0.56: lab[i] = 'tailgate'; continue                       # the engine cover, rear glass in it
    if y > 0.80 and 0.28 < s < 0.80: lab[i] = 'roof'; continue                                   # pillars and header
    if s < DOOR_F: lab[i] = 'fender.' + side; continue
    lab[i] = 'quarter.' + side

# absorb small islands
pkey = lambda v: tuple(round(x, 3) for x in P[v])
edge = collections.defaultdict(list)
for i, tri in enumerate(faces):
    for a in range(3): edge[tuple(sorted([pkey(tri[a]), pkey(tri[(a + 1) % 3])]))].append(i)
adj = collections.defaultdict(set)
for fl in edge.values():
    for a in fl:
        for b in fl:
            if a != b: adj[a].add(b)
for it in range(4):
    parent = list(range(len(faces)))
    def find2(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a in range(len(faces)):
        for b in adj[a]:
            if lab[a] == lab[b]: parent[find2(a)] = find2(b)
    cid = [find2(i) for i in range(len(faces))]; size = collections.Counter(cid); changed = 0
    for i in range(len(faces)):
        if size[cid[i]] < 12 and TAG[i] is None:
            nb = collections.Counter(lab[b] for b in adj[i] if lab[b] != lab[i] and TAG[b] is None)
            if nb: lab[i] = nb.most_common(1)[0][0]; changed += 1
    if not changed: break
cnt = collections.Counter((l, t) for l, t in zip(lab, TAG))
for (l, t), n in sorted(cnt.items(), key=lambda x: (x[0][0], str(x[0][1]))): print('  %-22s %-8s %6d' % (l, t or 'paint', n))
json.dump({'L': L, 'H': H, 'HW': HW, 'XC': XC, 'P': P, 'N': NR, 'F': faces, 'lab': lab, 'mat': TAG}, open(out_path, 'w'))
