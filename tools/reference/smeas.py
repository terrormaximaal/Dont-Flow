"""Meet de sedan-referentie: assen omzetten, neus bepalen, en de tabellen
die REFERENCES nodig heeft (SIL, PLAN, BELT, CABIN, DLO, SECTION, TUMBLE)."""
import json, math, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'sedan/sonata.obj'
V = []
faces = []
grp = None
for line in open(path, errors='ignore'):
    if line.startswith('v '):
        p = line.split(); V.append((float(p[1]), float(p[2]), float(p[3])))
    elif line.startswith('g '):
        grp = line.strip()[2:]
    elif line.startswith('f '):
        idx = [int(t.split('/')[0]) - 1 for t in line.split()[1:]]
        for k in range(1, len(idx) - 1):
            faces.append((grp, [idx[0], idx[k], idx[k + 1]]))

# model: x lateral, y up, z length. ours: x length, y up, z lateral.
P = [(p[2], p[1], p[0]) for p in V]
ymin = min(p[1] for p in P)
P = [(p[0], p[1] - ymin, p[2]) for p in P]
xs = [p[0] for p in P]
x0, x1 = min(xs), max(xs)
H = max(p[1] for p in P)
HW = max(abs(p[2]) for p in P)

class Caster:
    def __init__(self, aa, ab, ar, cell=4.0):
        self.aa, self.ab, self.ar, self.cell = aa, ab, ar, cell
        self.keep = [[P[i] for i in t] for g, t in faces]
        self.grid = {}
        for k, pa in enumerate(self.keep):
            a0 = min(p[aa] for p in pa); a1 = max(p[aa] for p in pa)
            b0 = min(p[ab] for p in pa); b1 = max(p[ab] for p in pa)
            for ia in range(int(math.floor(a0 / cell)), int(math.floor(a1 / cell)) + 1):
                for ib in range(int(math.floor(b0 / cell)), int(math.floor(b1 / cell)) + 1):
                    self.grid.setdefault((ia, ib), []).append(k)
    def hits(self, a, b):
        out = []
        for k in self.grid.get((int(math.floor(a / self.cell)), int(math.floor(b / self.cell))), ()):
            p0, p1, p2 = self.keep[k]
            ax, ay = p0[self.aa], p0[self.ab]; bx, by = p1[self.aa], p1[self.ab]; cx, cy = p2[self.aa], p2[self.ab]
            d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(d) < 1e-9: continue
            l1 = ((by - cy) * (a - cx) + (cx - bx) * (b - cy)) / d
            l2 = ((cy - ay) * (a - cx) + (ax - cx) * (b - cy)) / d
            l3 = 1 - l1 - l2
            if l1 < -1e-6 or l2 < -1e-6 or l3 < -1e-6: continue
            out.append(l1 * p0[self.ar] + l2 * p1[self.ar] + l3 * p2[self.ar])
        out.sort(); return out
    def top(self, a, b):
        h = self.hits(a, b); return h[-1] if h else None

top = Caster(0, 2, 1)     # cast up: height at (x, z)
side = Caster(0, 1, 2)    # cast sideways: half width at (x, y)

# which end is the nose? the low one.
def hAt(x): return top.top(x, 0.0) or top.top(x, 1.0) or 0
lo = hAt(x0 + 0.02 * (x1 - x0)); hi = hAt(x1 - 0.02 * (x1 - x0))
NOSE, TAIL = (x1, x0) if hi < lo else (x0, x1)
print('mesh L %.1f H %.1f HW %.1f  neus op x=%.1f (hoogte daar %.1f vs %.1f aan de andere kant)'
      % (abs(x1 - x0), H, HW, NOSE, min(lo, hi), max(lo, hi)))
L = abs(NOSE - TAIL)
sgn = 1 if NOSE > TAIL else -1
def station(f): return NOSE - sgn * f * L

SIL, PLAN = [], []
for i in range(49):
    f = i / 48.0
    x = station(f)
    if i == 0: x = station(0.004)
    if i == 48: x = station(0.996)
    t = top.top(x, 0.0) or top.top(x, 1.0) or top.top(x, 3.0) or 0
    best = 0
    for y in range(2, int(H), 1):
        h = side.hits(x, y)
        if h: best = max(best, h[-1])
    SIL.append(t / H); PLAN.append(best / HW)
print('SIL =', [round(v, 4) for v in SIL])
print('PLAN=', [round(v, 4) for v in PLAN])

def profile(x, step=1):
    out = []
    for y in range(2, int(H) + 1, step):
        h = side.hits(x, y); out.append((y, h[-1] if h else 0))
    return out

print('\n f      belt/H  cabin/HW  dak/H   dlo')
BELT, CAB, DLO = [], [], []
for i in range(0, 49):
    f = i / 48.0
    x = station(min(0.996, max(0.004, f)))
    pr = profile(x)
    if not pr: continue
    wmax = max(w for y, w in pr)
    if wmax < 0.35 * HW:
        print('%.3f   -' % f); continue
    # the shoulder: walking up from the widest point, where the flank first
    # draws in past 8% of that station's own width. A 668-triangle car has no
    # step at the belt, so a relative threshold finds it where a step cannot.
    yw = max(y for y, w in pr if w >= wmax - 1e-6 and y > 0.30 * H) if any(w >= wmax - 1e-6 and y > 0.30 * H for y, w in pr) else None
    by = None
    if yw is not None:
        for y, w in pr:
            if y > yw and w < 0.92 * wmax: by = y; break
    topy = max([y for y, w in pr if w > 0.30 * HW] or [0])
    if by is None: by = topy
    wa = [w for y, w in pr if abs(y - (by + 0.05 * H)) < 0.8]
    cab = (wa[0] / HW) if wa else 0
    dlo = (topy - by) / (0.40 * H)
    print('%.3f   %.3f   %.3f     %.3f   %.2f' % (f, by / H, cab, topy / H, dlo))
    BELT.append((round(f, 3), round(by / H, 3)))
    if cab > 0.30 and topy > by + 0.03 * H:
        CAB.append((round(f, 3), round(cab, 3)))
        DLO.append((round(f, 3), round(min(1.0, dlo), 3)))
print('BELT =', BELT)
print('CABIN=', CAB)
print('DLO  =', DLO)

# section sill -> belt at mid door, on the same shoulder the belt used
x = station(0.55)
pr = profile(x)
wmax = max(w for y, w in pr)
floor = min(y for y, w in pr if w > 0.5 * HW)
yw = max(y for y, w in pr if w >= wmax - 1e-6 and y > 0.30 * H)
belt = next((y for y, w in pr if y > yw and w < 0.92 * wmax), yw)
print('\nsectie f=0.55: vloer %.1f (%.3f H)  belt %.1f (%.3f H)  max hw %.3f HW'
      % (floor, floor / H, belt, belt / H, wmax / HW))
sec = []
for k in range(15):
    t = k / 14.0; y = floor + t * (belt - floor)
    w = [w for yy, w in pr if abs(yy - y) < 0.9]
    sec.append((round(t, 3), round((w[0] if w else 0) / wmax, 3)))
print('SECTION=', sec)
above = [(y, w) for y, w in pr if y > belt and w > 0.3 * HW]
if above:
    wb = [w for y, w in pr if abs(y - belt) < 0.9][0]
    print('tumblehome: hw op de belt %.3f HW, bovenaan %.3f HW op %.3f H -> tumble %.3f'
          % (wb / HW, above[-1][1] / HW, above[-1][0] / H, 1 - above[-1][1] / wb))
