from clib import *
top=Caster(selBody,0,2,1)      # cast along y (up): a=x, b=z -> height
side=Caster(selBody,0,1,2)     # cast along z (lateral): a=x, b=y -> half width
print('SIL (top at centreline, /H) and PLAN (max half width over height, /HW), 49 stations')
SIL=[];PLAN=[]
for i in range(49):
    f=i/48.0; x=station(f)
    if i==0: x=NOSE-0.3
    if i==48: x=TAIL+0.3
    t=top.top(x,0.0) or top.top(x,1.0) or top.top(x,3.0)
    best=0
    for y in range(2,int(H),1):
        h=side.hits(x,y)
        if h: best=max(best,h[-1])
    SIL.append((t or 0)/H); PLAN.append(best/HW)
print('SIL =',[round(v,4) for v in SIL])
print('PLAN=',[round(v,4) for v in PLAN])
