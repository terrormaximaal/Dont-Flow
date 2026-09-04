from clib import *
side=Caster(selBody,0,1,2)
def hw(x,y):
    h=side.hits(x,y); return h[-1] if h else 0
print('== fijn profiel hw(y)/HW op stations 0.30 0.45 0.55 0.70 0.80  (y/H, en per kolom hw en helling dhw/dy) ==')
ST=[0.30,0.45,0.55,0.70,0.80]
rows=[]
for yi in range(int(0.40*H), int(H)+1, 3):
    y=yi
    cols=[]
    for f in ST:
        x=station(f); w=hw(x,y); w2=hw(x,y+3)
        cols.append('%.3f %+.2f'%(w/HW,(w2-w)/3))
    rows.append('%.3f  '%(y/H)+'   '.join(cols))
print('  y/H   '+'   '.join('f=%.2f      '%f for f in ST)); print('\n'.join(rows))
print('\n== plan per station op vaste hoogtes (hw/HW) ==')
print('  f     max    0.55H  0.62H  0.70H  0.80H  0.90H  0.95H')
for i in range(0,49,2):
    f=i/48.0; x=station(f)
    if i==0: x=NOSE-0.3
    if i==48: x=TAIL+0.3
    vals=[max(hw(x,y) for y in range(2,int(H),2))]+[hw(x,k*H) for k in (0.55,0.62,0.70,0.80,0.90,0.95)]
    print('%.3f  '%f+'  '.join('%.3f'%(v/HW) for v in vals))
