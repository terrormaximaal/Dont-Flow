import json, math
D=json.load(open('city_mesh.json'))
P=[(p[0], p[1]+0.7, p[2]) for p in D['P']]   # ground (tyre bottom) at y = 0
F=D['F']
class Caster:
    def __init__(self, sel, axis_a, axis_b, axis_r, cell=4.0):
        self.aa,self.ab,self.ar,self.cell=axis_a,axis_b,axis_r,cell
        self.keep=[[P[i] for i in t] for g,m,t in F if sel(g,m)]
        self.grid={}
        for k,pa in enumerate(self.keep):
            a0=min(p[axis_a] for p in pa); a1=max(p[axis_a] for p in pa)
            b0=min(p[axis_b] for p in pa); b1=max(p[axis_b] for p in pa)
            for ia in range(int(math.floor(a0/cell)), int(math.floor(a1/cell))+1):
                for ib in range(int(math.floor(b0/cell)), int(math.floor(b1/cell))+1):
                    self.grid.setdefault((ia,ib),[]).append(k)
    def hits(self, a, b):
        out=[]
        for k in self.grid.get((int(math.floor(a/self.cell)), int(math.floor(b/self.cell))),()):
            p0,p1,p2=self.keep[k]
            ax,ay=p0[self.aa],p0[self.ab]; bx,by=p1[self.aa],p1[self.ab]; cx,cy=p2[self.aa],p2[self.ab]
            d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
            if abs(d)<1e-9: continue
            l1=((by-cy)*(a-cx)+(cx-bx)*(b-cy))/d
            l2=((cy-ay)*(a-cx)+(ax-cx)*(b-cy))/d
            l3=1-l1-l2
            if l1<-1e-6 or l2<-1e-6 or l3<-1e-6: continue
            out.append(l1*p0[self.ar]+l2*p1[self.ar]+l3*p2[self.ar])
        out.sort(); return out
    def top(self,a,b):
        h=self.hits(a,b); return h[-1] if h else None
    def bottom(self,a,b):
        h=self.hits(a,b); return h[0] if h else None
def selBody(g,m): return g=='Body'
NOSE=171.3; TAIL=-186.8; L=NOSE-TAIL; H=147.5+0.7; HW=93.8
def station(f): return NOSE-f*L
