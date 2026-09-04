from clib import *
side=Caster(selBody,0,1,2); top=Caster(selBody,0,2,1)
def hw(x,y):
    h=side.hits(x,y); return h[-1] if h else 0
# SECTION sill -> belt at f=0.55 with the belt at the measured kink 0.64 H
x=station(0.55); floor=23.3; belt=0.64*H
wmax=max(hw(x,y) for y in range(int(floor),int(belt)))
sec=[]
for k in range(15):
    t=k/14.0; y=floor+t*(belt-floor); sec.append([round(t,3), round(hw(x,y)/wmax,3)])
print('SECTION =',sec)
# SIL and PLAN cleaned
SIL=[];PLAN=[]
for i in range(49):
    f=i/48.0; x=station(f)
    if i==0: x=NOSE-0.3
    if i==48: x=TAIL+0.3
    t=top.top(x,0.0) or top.top(x,1.0) or 0
    best=max(hw(x,y) for y in range(2,int(H),1))
    SIL.append(t/H); PLAN.append(best/HW)
# front two stations are the bumper face, not the bonnet: nose top of the cover
SIL[0]=0.462; SIL[1]=0.492
# mirrors at stations 15,16
PLAN[15]=(PLAN[14]+PLAN[17])/2; PLAN[16]=(PLAN[14]+2*PLAN[17])/3
print('SIL =',[round(v,4) for v in SIL])
print('PLAN =',[round(v,4) for v in PLAN])
# DLO / roof edge: the top of the side surface per station (hw > 0.5 HW), as y/H
print('roofedge:',[(round(i/48,3), round(max([y for y in range(int(0.5*H),int(H)) if hw(station(i/48),y)>0.5*HW] or [0])/H,3)) for i in range(8,46,2)])
