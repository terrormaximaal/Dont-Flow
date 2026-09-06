"""Cut the sedan reference into panels and parts.

The sedan is a four-door saloon that comes as ONE painted shell of 21 000
triangles with, as separate shells, its glass, the twin round headlamps
(chrome reflector under a glass cover), the tail lamps, the chrome grille,
the mirrors, the chrome mouldings, the wheels and a full interior. The
shells are told apart by which vertices they share; the wheels and the
interior are dropped (the generator builds its own), the rest is kept.

The painted shell has no grooves at the doors: the door seams are creases
of a few degrees. So, as with the first sedan, the doors are cut at
stations, read off the creases that ARE there (the B-pillar seam at 0.52,
the wheel arches at 0.10-0.25 and 0.70-0.86, the boot lid's leading edge
at 0.845), and the bonnet's rear edge follows the windscreen's own bottom
edge. Every cut is a clip against a scalar field, so the panel edges are
clean lines through the triangulation.

Every face leaves with a label (the panel or the part it belongs to) and a
material tag: None for paint, or chrome / lens / tailred / amber / plastic
for the pieces the generator dresses in its own materials. A tagged face
on a panel is that panel's trim (the chrome moulding on a door), and
travels with it.

    python3 tools/reference/cut_sedan.py <obj> <out.json>
"""
import sys, json, math, collections
obj_path, out_path = sys.argv[1], sys.argv[2]

# model: x lateral, y length (nose at -y), z up -> ours: x length (nose +x), y up, z lateral.
# (-y, z, -x) is a rotation, so the winding survives.
V, VN, VT, F = [], [], [], []
g = m = None
for line in open(obj_path, errors='ignore'):
    p = line.split()
    if not p: continue
    if p[0] == 'v': x, y, z = map(float, p[1:4]); V.append([-y, z, -x])
    elif p[0] == 'vn': x, y, z = map(float, p[1:4]); VN.append([-y, z, -x])
    elif p[0] == 'vt': VT.append([float(p[1]), float(p[2])])
    elif p[0] == 'g': g = p[1]
    elif p[0] == 'usemtl': m = p[1]
    elif p[0] == 'f':
        cs = [tuple(int(t) - 1 if t else -1 for t in tok.split('/')) for tok in p[1:]]
        for k in range(1, len(cs) - 1): F.append((m, [cs[0], cs[k], cs[k + 1]]))
ground = min(v[1] for v in V)                      # the tyres stand on the ground
for v in V: v[1] -= ground

MAT = {'blinn2SG': 'paint', 'blinn1SG': 'chrome', 'Glass_032_040Material_041': 'glass',
       'SignalLight': 'amber', 'Stoplight_032_040Material_041': 'tailred', 'mirror': 'mirror',
       'lambert2SG': 'interior', 'dull': 'tyre'}

# ---- shells: faces that share vertices ----------------------------------------
par = {}
def find(a):
    while par.setdefault(a, a) != a: a = par[a]
    return a
for mat, f in F:
    for c in f[1:]: par[find(f[0][0])] = find(c[0])
shells = collections.defaultdict(list)
for i, (mat, f) in enumerate(F): shells[find(f[0][0])].append(i)
shells = sorted(shells.values(), key=len, reverse=True)

def bbox(fl):
    pts = [V[c[0]] for i in fl for c in F[i][1]]
    return [min(p[k] for p in pts) for k in range(3)], [max(p[k] for p in pts) for k in range(3)]

body = shells[0]
lo, hi = bbox(body)
NOSE, TAIL = hi[0], lo[0]; L = NOSE - TAIL; XC = (NOSE + TAIL) / 2
H = hi[1]; HW = max(abs(lo[2]), abs(hi[2]))
print('carrosserie: %d driehoeken, L %.1f H %.1f HW %.1f' % (len(body), L, H, HW))
def st(p): return (NOSE - p[0]) / L
def yh(p): return p[1] / H
def zh(p): return p[2] / HW

# every shell gets a role from what it is made of and where it sits
keep = []                                    # (face index, role, mat tag)
for sh in shells:
    mats = collections.Counter(MAT[F[i][0]] for i in sh)
    lo, hi = bbox(sh); s0, s1 = st([hi[0]]), st([lo[0]]); y0, y1 = yh(lo), yh(hi); z0, z1 = lo[2], hi[2]
    kind = mats.most_common(1)[0][0]
    if kind in ('interior', 'tyre'): continue
    if kind == 'chrome' and len(sh) > 3000 and y1 < 0.40: continue          # a rim
    if sh is body: role = 'body'
    elif 'mirror' in mats: role = 'mirror'
    elif kind == 'glass' and s1 < 0.07: role = 'headlight'                 # the lamp covers
    elif kind == 'chrome' and s1 < 0.07 and (z0 > 44 or z1 < -44): role = 'headlight'   # the reflectors
    elif kind == 'chrome' and s1 < 0.07: role = 'grille'
    elif kind == 'paint' and s1 < 0.07 and y0 > 0.40 and abs(z1) < 45: role = 'grille'   # its dark backing
    elif kind == 'glass':
        if s0 < 0.29 and z0 < -50 and z1 > 50: role = 'glass.windshield'
        elif s0 > 0.70 and z0 < -50 and z1 > 50: role = 'glass.rear'
        elif s0 < 0.40: role = 'glass'
        elif s0 < 0.60: role = 'glassR'
        else: role = 'glass.quarter'
    elif kind == 'tailred': role = 'taillight' if y1 > 0.46 else 'body'    # the small reflectors sit in the bumper
    else: role = 'body'                                                     # paint pieces and chrome mouldings
    for i in sh:
        tag = MAT[F[i][0]]
        if tag == 'paint': tag = None
        if tag == 'glass': tag = None if role.startswith('glass') else 'lens'
        if tag == 'mirror': tag = 'chrome'
        if role == 'grille' and tag is None: tag = 'plastic'
        if role == 'mirror' and tag is None: tag = 'paint'
        keep.append((i, role, tag))
print('rollen:', dict(collections.Counter(r for _, r, _ in keep)))

# ---- one vertex per (position, normal), then the clips ------------------------
P, NR, faces, ROLE, TAG = [], [], [], [], []
key = {}
for i, role, tag in keep:
    tri = []
    for c in F[i][1]:
        k = key.get(c)
        if k is None:
            k = key[c] = len(P); P.append(list(V[c[0]])); NR.append(list(VN[c[2]]) if c[2] >= 0 else [0, 1, 0])
        tri.append(k)
    faces.append(tri); ROLE.append(role); TAG.append(tag)

def clip(field, where):
    global faces, ROLE, TAG
    cache = {}
    def cut(a, b):
        k = (min(a, b), max(a, b))
        if k in cache: return cache[k]
        fa, fb = field(P[a]), field(P[b]); t = fa / (fa - fb)
        P.append([P[a][i] + (P[b][i] - P[a][i]) * t for i in range(3)])
        NR.append([NR[a][i] + (NR[b][i] - NR[a][i]) * t for i in range(3)])
        cache[k] = len(P) - 1
        return cache[k]
    out, orole, otag = [], [], []
    for tri, role, tag in zip(faces, ROLE, TAG):
        c = [(P[tri[0]][i] + P[tri[1]][i] + P[tri[2]][i]) / 3 for i in range(3)]
        fv = [field(P[v]) for v in tri]
        if not where(c, role) or all(x >= 0 for x in fv) or all(x <= 0 for x in fv):
            out.append(tri); orole.append(role); otag.append(tag); continue
        a, b, cc = tri; s = [x > 0 for x in fv]
        for r in range(3):
            if s[0] != s[1] and s[0] != s[2]: break
            a, b, cc = b, cc, a; s = s[1:] + s[:1]
        m1, m2 = cut(a, b), cut(a, cc)
        for t in ([a, m1, m2], [m1, b, cc], [m1, cc, m2]): out.append(t); orole.append(role); otag.append(tag)
    faces, ROLE, TAG = out, orole, otag

# the bonnet's rear edge follows the windscreen's bottom edge, 6 mm ahead of it.
# The pane is coarse, so at a given half width the edge is the nearest vertex
# of its lowest row, not the nearest vertex of any row.
scrv = [(abs(zh(P[v])), st(P[v])) for tri, role in zip(faces, ROLE) if role == 'glass.windshield' for v in tri]
SCRW = max(az for az, s in scrv)
def cowl(z):
    a = min(abs(z), SCRW)                      # beyond the pane's corner the edge runs on straight
    return min(s for az, s in scrv if abs(az - a) < 0.12) - 0.006
print('cowl van het midden naar de zijkant: %s' % ' '.join('%.3f' % cowl(z / 20) for z in range(0, 18, 3)))

# The door frames go with the doors. Where a frame ends and a pillar begins is
# read off the glass: the A-pillar line runs midway between the windscreen's
# side edge and the front pane's leading edge at every height, the B-pillar
# line midway between the two panes, and the rear door's frame carries the
# quarter light, so it ends just behind that pane at the C-pillar.
def edge(role, pick, y):
    pts = [(st(P[v]), yh(P[v])) for tri, r in zip(faces, ROLE) if r == role for v in tri if P[v][2] > 0]
    near = [s for s, yy in pts if abs(yy - y) < 0.03]
    if not near: near = [s for s, yy in sorted(pts, key=lambda q: abs(q[1] - y))[:6]]
    return pick(near)
_cache = {}
def line(kind, y):
    k = (kind, round(y, 3))
    if k in _cache: return _cache[k]
    if kind == 'a': v = (edge('glass.windshield', max, y) + edge('glass', min, y)) / 2
    else: v = (edge('glass', max, y) + edge('glassR', min, y)) / 2
    _cache[k] = v
    return v
aLine = lambda y: line('a', min(0.96, max(0.66, y)))
bLine = lambda y: line('b', min(0.96, max(0.66, y)))
C_LINE = edge('glass.quarter', max, 0.80) + 0.006
FRAME_TOP = 0.968                                  # the drip rail: above it the roof
print('stijlen: A %.3f..%.3f  B %.3f..%.3f  C %.3f' % (aLine(0.66), aLine(0.96), bLine(0.66), bLine(0.96), C_LINE))

# ---- the plan --------------------------------------------------------------------
# front axle at 0.176 L, rear at 0.775 L. door seam crease 0.522, doors' front
# edge behind the front arch 0.275, rear door to the rear arch 0.692. Belt at
# the window sills, 0.655 (the panes start at 0.67). Boot lid from 0.845.
DOOR_F, DOOR_B, DOOR_R = 0.275, 0.522, 0.692
BELT, ROCKER, FLOOR = 0.655, 0.215, 0.185
BODY = lambda c, r: r == 'body'
clip(lambda p: yh(p) - FLOOR, lambda c, r: BODY(c, r) and 0.04 < st(c) < 0.96)                  # underbody
clip(lambda p: yh(p) - ROCKER, lambda c, r: BODY(c, r) and DOOR_F - 0.02 < st(c) < DOOR_R + 0.02)   # rocker
clip(lambda p: yh(p) - BELT, lambda c, r: BODY(c, r) and DOOR_F - 0.03 < st(c) < 0.86)          # belt: door skins / frames and pillars
clip(lambda p: st(p) - DOOR_F, lambda c, r: BODY(c, r) and FLOOR < yh(c) < BELT)                # door edges below the belt
clip(lambda p: st(p) - DOOR_B, lambda c, r: BODY(c, r) and FLOOR < yh(c) < BELT)
clip(lambda p: st(p) - DOOR_R, lambda c, r: BODY(c, r) and FLOOR < yh(c) < BELT)
clip(lambda p: yh(p) - FRAME_TOP, lambda c, r: BODY(c, r) and 0.26 < st(c) < 0.80)              # the drip rail
# The drip rail is a HEIGHT only in the middle of the cabin. At the front of the
# roof, where it bends down to the windscreen header, the whole crown drops
# below FRAME_TOP, and the frame rules then swallowed the roof: the rear door
# came out with a metre-long blade of roof hanging off its window frame. Across
# the cabin the rail sits at a steady 0.66 of the half width (measured: the roof
# is flat out to 0.65 and has fallen away by 0.86), so that is the line.
RAIL_HW = 0.66
clip(lambda p: abs(zh(p)) - RAIL_HW, lambda c, r: BODY(c, r) and BELT < yh(c) < FRAME_TOP + 0.01 and 0.26 < st(c) < 0.80)
# and the door skins keep to the flank: at the rear door's trailing edge the
# shell turns in to a return flange that hung off the open door as a fin
SKIN_HW = 0.86
clip(lambda p: abs(zh(p)) - SKIN_HW, lambda c, r: BODY(c, r) and ROCKER < yh(c) < BELT and DOOR_F - 0.02 < st(c) < DOOR_R + 0.02)
above = lambda c, r: BODY(c, r) and BELT < yh(c) < FRAME_TOP + 0.01
clip(lambda p: st(p) - aLine(yh(p)), lambda c, r: above(c, r) and 0.25 < st(c) < 0.50)          # A-pillar / front door frame
clip(lambda p: st(p) - bLine(yh(p)), lambda c, r: above(c, r) and 0.45 < st(c) < 0.60)          # front frame / rear frame at the B-pillar
clip(lambda p: st(p) - C_LINE, lambda c, r: above(c, r) and 0.65 < st(c) < 0.80)                # rear frame / C-pillar
clip(lambda p: yh(p) - 0.455, lambda c, r: BODY(c, r) and (st(c) < 0.12 or st(c) > 0.84))       # bumper tops
clip(lambda p: st(p) - 0.10, lambda c, r: BODY(c, r) and yh(c) < 0.47)                          # front bumper's rear edge
clip(lambda p: st(p) - 0.86, lambda c, r: BODY(c, r) and yh(c) < 0.47)                          # rear bumper's front edge
clip(lambda p: st(p) - 0.045, lambda c, r: BODY(c, r) and yh(c) > 0.44)                         # the nose face / bonnet lip
clip(lambda p: yh(p) - 0.56, lambda c, r: BODY(c, r) and st(c) < 0.12)                          # bonnet lip / lamp panel
clip(lambda p: abs(zh(p)) - 0.80, lambda c, r: BODY(c, r) and st(c) < 0.32 and yh(c) > 0.50)    # bonnet / wing
clip(lambda p: st(p) - cowl(zh(p)), lambda c, r: BODY(c, r) and st(c) < 0.36 and yh(c) > 0.55)  # bonnet rear edge
clip(lambda p: st(p) - 0.845, lambda c, r: BODY(c, r) and yh(c) > 0.50)                         # roof, quarter / boot lid
clip(lambda p: yh(p) - 0.72, lambda c, r: BODY(c, r) and st(c) > 0.90)                          # boot lid / tail panel
# the lid's side edge is the deck's shoulder, measured: 0.80 hw at its front edge,
# drawing in to 0.74 hw at the tail (a plane cut at a fixed width zigzagged
# across the flank, which tucks in above the belt to just that width)
LID_EDGE = lambda s: 0.80 - 0.63 * (s - 0.845)
clip(lambda p: abs(zh(p)) - LID_EDGE(st(p)), lambda c, r: BODY(c, r) and 0.83 < st(c) < 0.95 and yh(c) > 0.55)   # boot lid / quarter
clip(lambda p: abs(zh(p)) - 0.42, lambda c, r: BODY(c, r) and st(c) > 0.92 and 0.44 < yh(c) < 0.74)   # the lid runs down between the lamps to the bumper
clip(lambda p: p[2], lambda c, r: True)                                                          # the centreline, everything
print('na het snijden: %d driehoeken, %d punten' % (len(faces), len(P)))

def fnormal(tri):
    a, b, c = P[tri[0]], P[tri[1]], P[tri[2]]
    n = [(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]
    l = math.sqrt(sum(x * x for x in n)) or 1e-9
    return [x / l for x in n]

ARCH = ((0.176, 0.085), (0.775, 0.085))       # wheel arches: centre station, radius in L
def in_arch(s, y, az):
    for cs, r in ARCH:
        if abs(s - cs) < r and y < 0.50 and az < 0.985: return True
    return False

lab = [None] * len(faces)
for i, (tri, role, tag) in enumerate(zip(faces, ROLE, TAG)):
    c = [(P[tri[0]][k] + P[tri[1]][k] + P[tri[2]][k]) / 3 for k in range(3)]
    s, y, z = st(c), yh(c), zh(c); az = abs(z); side = 'l' if c[2] > 0 else 'r'
    if role != 'body':
        lab[i] = role + ('.' + side if role in ('headlight', 'taillight', 'mirror', 'glass', 'glassR', 'glass.quarter') else '')
        continue
    n = fnormal(tri)
    # the wheel wells: inside the arches, facing the wheel
    if in_arch(s, y, az) and n[2] * (1 if z > 0 else -1) < 0.35 and az < 0.97: lab[i] = 'underbody'; continue
    if y < FLOOR and 0.04 < s < 0.96: lab[i] = 'underbody'; continue
    if s < 0.10 and y < 0.455 or s < 0.045 and y < 0.56: lab[i] = 'bumper.front'; continue
    if s > 0.86 and y < 0.455: lab[i] = 'bumper.rear'; continue
    if DOOR_F - 0.02 < s < DOOR_R + 0.02 and y < ROCKER: lab[i] = 'rocker.' + side; continue
    # a door is the flank, not what the shell folds inward behind it
    if DOOR_F < s < DOOR_R and ROCKER < y < BELT and az < SKIN_HW: lab[i] = 'underbody'; continue
    if DOOR_F < s < DOOR_B and y < BELT: lab[i] = 'door.' + side; continue
    if DOOR_B < s < DOOR_R and y < BELT: lab[i] = 'doorR.' + side; continue
    if BELT < y < FRAME_TOP and az > RAIL_HW and aLine(y) < s < bLine(y): lab[i] = 'door.' + side; continue        # the frame
    if BELT < y < FRAME_TOP and az > RAIL_HW and bLine(y) < s < C_LINE: lab[i] = 'doorR.' + side; continue        # the frame, quarter light included
    if 0.045 < s < cowl(z) and az < 0.80 and y > 0.56: lab[i] = 'hood'; continue
    if s > 0.845 and y > 0.50 and az < LID_EDGE(s) and (y > 0.72 or s < 0.93): lab[i] = 'trunk'; continue   # the lid, to the shoulders
    if s > 0.92 and 0.455 < y < 0.74 and az < 0.42: lab[i] = 'trunk'; continue                                       # and down between them, plate and all
    if y > BELT and DOOR_F - 0.03 < s < 0.845: lab[i] = 'roof'; continue
    if s < DOOR_F: lab[i] = 'fender.' + side; continue
    lab[i] = 'quarter.' + side
# the chrome mouldings run over four panels: each piece goes with the panel under it
# (done above by station: a tagged face keeps its label and its tag)

# absorb small islands
pkey = lambda v: tuple(round(x, 2) for x in P[v])
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
            if lab[a] == lab[b] and TAG[a] == TAG[b]: parent[find2(a)] = find2(b)
    cid = [find2(i) for i in range(len(faces))]; size = collections.Counter(cid); changed = 0
    for i in range(len(faces)):
        if size[cid[i]] < 6 and ROLE[i] == 'body' and TAG[i] is None:
            nb = collections.Counter(lab[b] for b in adj[i] if lab[b] != lab[i] and TAG[b] is None and ROLE[b] == 'body')
            if nb: lab[i] = nb.most_common(1)[0][0]; changed += 1
    if not changed: break
cnt = collections.Counter((l, t) for l, t in zip(lab, TAG))
for (l, t), n in sorted(cnt.items(), key=lambda x: (x[0][0], str(x[0][1]))): print('  %-22s %-8s %6d' % (l, t or 'paint', n))
# the quarter light sits in the rear door's frame, so it rides with that door
json.dump({'L': L, 'H': H, 'HW': HW, 'XC': XC, 'P': P, 'N': NR, 'F': faces, 'lab': lab, 'mat': TAG,
           'host': {'glass.quarter': 'doorR'}}, open(out_path, 'w'))
