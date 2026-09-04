import json, glob, math
path=glob.glob('citycar/Automobile*/*.obj')[0]
V=[]; faces=[]; cur=None; grp=None
for line in open(path, errors='ignore'):
    if line.startswith('v '):
        p=line.split()
        x,y,z=float(p[1]),float(p[2]),float(p[3])
        # model: x length (nose at -x), y lateral, z up  ->  ours: x length (nose +x), y up, z lateral
        V.append((-x, z, y))
    elif line.startswith('usemtl'): cur=line.split()[1]
    elif line.startswith('g '): grp=line.strip()[2:]
    elif line.startswith('f '):
        idx=[int(t.split('/')[0])-1 for t in line.split()[1:]]
        for k in range(1,len(idx)-1): faces.append((grp,cur,[idx[0],idx[k],idx[k+1]]))
json.dump({'P':V,'F':faces},open('city_mesh.json','w'))
print('verts',len(V),'tris',len(faces))
import collections
bb=collections.defaultdict(lambda:[1e9,-1e9,1e9,-1e9,1e9,-1e9,0])
for g,m,t in faces:
    b=bb[(g,m)]; b[6]+=1
    for i in t:
        x,y,z=V[i]; b[0]=min(b[0],x);b[1]=max(b[1],x);b[2]=min(b[2],y);b[3]=max(b[3],y);b[4]=min(b[4],z);b[5]=max(b[5],z)
for (g,m),b in sorted(bb.items(), key=lambda kv:-kv[1][6]):
    print('%-16s %-14s tris %6d  x %7.1f..%7.1f  y %6.1f..%6.1f  z %6.1f..%6.1f'%(g,m,b[6],*b[:6]))
