from clib import *
side=Caster(selBody,0,1,2)
# cross section sill -> belt at the widest 'clean' station (mid door, f=0.55)
x=station(0.55)
pr=[]
for y in range(2,int(H)+1,1):
    h=side.hits(x,y); pr.append((y, h[-1] if h else 0))
floor=min(y for y,w in pr if w>0.5*HW)
belt=None
for k in range(1,len(pr)):
    y0,w0=pr[k-1]; y1,w1=pr[k]
    if y1>0.40*H and w0>0.55*HW and (w0-w1)>3: belt=y0; break
wmax=max(w for y,w in pr if y<=belt)
print('sectie op f=0.55: vloer y=%.1f (%.3f H)  belt y=%.1f (%.3f H)  max hw %.1f (%.3f HW)'%(floor,floor/H,belt,belt/H,wmax,wmax/HW))
sec=[]
for k in range(15):
    t=k/14.0; y=floor+t*(belt-floor)
    w=[w for yy,w in pr if abs(yy-y)<0.6]
    sec.append((round(t,3), round((w[0] if w else 0)/wmax,3)))
print('SECTION=',sec)
# tumblehome: cabin half width at roof edge / at belt
above=[(y,w) for y,w in pr if y>belt+3 and w>0.3*HW]
print('cabin: hw at belt+8 = %.3f HW, at top = %.3f HW (y=%.1f)'%([w for y,w in pr if abs(y-(belt+8))<0.6][0]/HW, above[-1][1]/HW, above[-1][0]))
print('profiel boven de belt (y/H, hw/HW):', [(round(y/H,3),round(w/HW,3)) for y,w in above[::6]])
