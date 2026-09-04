from clib import *
side=Caster(selBody,0,1,2)
# half-width profile per station over height -> belt = biggest inward step going up
def profile(x, step=2):
    out=[]
    for y in range(2,int(H)+1,step):
        h=side.hits(x,y); out.append((y, h[-1] if h else 0))
    return out
print(' f      belt_y/H  hw@belt-6  hw@belt+8  cabin/HW  roofedge_y/H  dlo(0..1)')
BELT=[];CAB=[];DLO=[]
for i in range(0,49,2):
    f=i/48.0; x=station(f)
    if i==0: x=NOSE-0.3
    if i==48: x=TAIL+0.3
    pr=profile(x)
    # the belt: largest drop of half width between consecutive samples above 40% H
    best=(0,None)
    for k in range(1,len(pr)):
        y0,w0=pr[k-1]; y1,w1=pr[k]
        if y1>0.40*H and w0>0.55*HW and (w0-w1)>best[0]: best=(w0-w1,y0)
    by=best[1]
    if by is None or best[0]<1.5: print('%.3f   -'%f); BELT.append(None); CAB.append(None); DLO.append(None); continue
    wb=[w for y,w in pr if abs(y-(by-6))<1.5]; wa=[w for y,w in pr if abs(y-(by+8))<1.5]
    # roof edge: highest y where the side surface still exists at >60% of the belt width
    top=max([y for y,w in pr if w>0.60*(wb[0] if wb else HW)] or [by])
    sil=max(y for y,w in pr if w>0.05*HW) if any(w>0.05*HW for y,w in pr) else by
    print('%.3f   %.3f     %.3f      %.3f      %.3f    %.3f       %.2f'%(f, by/H, (wb[0]/HW if wb else 0), (wa[0]/HW if wa else 0), (wa[0]/HW if wa else 0), top/H, (top-by)/max(1,(sil-by))))
    BELT.append(by/H); CAB.append((wa[0]/HW if wa else 0)); DLO.append(top/H)
