"""Reference constrained species silhouettes; executed by build_assets.py after evidence review."""
def animal_root(id,parts,clip='swim',axis=2,amount=.04):
 articulated=[];fixed=[]
 for part in parts:
  if any(n in part.name for n in ['Vertical forked tail','Rounded caudal fin','Long front flipper','Penguin flipper','Swept wing','Paired ear fin','Fore flipper']):articulated.append(part)
  else:fixed.append(part)
 root=empty(id+'_root');o=join(id,fixed);o.parent=root;animate(root,{clip:3.2},axis=axis,amount=amount)
 for i,part in enumerate(articulated):
  part.parent=root;animate(part,{clip:3.2},axis=2 if 'tail' in part.name else 1,amount=.18*(-1 if i%2 else 1))
 return root

def eyes(parts,x,y,z,size=.018):
 black=material('Eye ink','101824');silver=material('Eye gleam','F0E9CD')
 for s in [-1,1]:parts.extend([ell('Eye',(s*x,y,z),(size*.45,size,size),black,12,8),ell('Highlight',(s*(x+.003),y+.003,z+.004),(size*.18,size*.25,size*.25),silver,8,6)])

def fish_body(fat,length,height,base):
 verts=[];faces=[];rings=56;sides=24
 for i in range(rings+1):
  y=(i/rings*2-1)*length;r=max(.001,math.sqrt(max(0,1-(y/length)**2)))
  for j in range(sides):
   an=j*math.tau/sides;verts.append((math.cos(an)*fat*r,y,math.sin(an)*height*r))
 for i in range(rings):
  for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 faces.extend([tuple(reversed(range(sides))),tuple(rings*sides+j for j in range(sides))]);return mesh('Fusiform body',verts,faces,base)

def fish(id,color='E5A12B',kind='reef'):
 base=material(id+' body',color,.4);dark=material('Fin ink','28384A');light=material('Pale markings','F9E6B1');parts=[]
 L={'anemonefish':.24,'blue-tang':.42,'sergeant-major':.28,'grunts':.45,'yellowtail':.55}.get(kind,.55);fat=L*(.12 if kind in ['yellowtail','grunts'] else .17);height=L*(.36 if kind=='blue-tang' else (.19 if kind in ['yellowtail','grunts'] else .26))
 parts.append(fish_body(fat,L*.38,height,base))
 parts.append(ell('Mouth',(0,L*.35,-.012),(fat*.46,L*.045,L*.022),base,12,8));eyes(parts,fat*.84,L*.22,L*.073,L*.028)
 parts.append(fin('Forked caudal fin',[(0,-L*.33,0),(-L*.21,-L*.64,L*.13),(0,-L*.53,0),(L*.21,-L*.64,-L*.13),(0,-L*.33,0)],base))
 # caudal fin is vertically forked as in bony fishes
 parts[-1]=parts.pop() if False else parts[-1]
 tail=parts.pop();bpy.data.objects.remove(tail,do_unlink=True)
 if kind=='anemonefish':parts.append(fin('Rounded caudal fin',[(0,-L*.32,0),(0,-L*.51,L*.15),(0,-L*.59,L*.09),(0,-L*.59,-L*.09),(0,-L*.51,-L*.15)],base,L*.008))
 else:parts.append(fin('Vertical forked tail',[(0,-L*.32,0),(0,-L*.63,L*.23),(0,-L*.54,.0),(0,-L*.63,-L*.23)],base,L*.012))
 parts.append(fin('Dorsal fin',[(0,L*.15,L*.18),(0,-L*.05,L*.37),(0,-L*.32,L*.15)],base,.014))
 parts.append(fin('Anal fin',[(0,-L*.05,-L*.2),(0,-L*.25,-L*.29),(0,-L*.32,-L*.1)],base,.01))
 for s in [-1,1]:parts.append(fin('Pectoral fin',[(s*fat*.8,L*.10,0),(s*fat*2,-L*.1,-.08),(s*fat*.7,-L*.08,-.045)],base))
 if kind=='anemonefish':
  body=parts[0];body.data.materials.append(light)
  for p in body.data.polygons:
   if any(abs(p.center.y-yy)<w for yy,w in [(L*.22,L*.05),(-L*.06,L*.05),(-L*.31,L*.026)]):p.material_index=1
 if kind in ['blue-tang','surgeonfish']:
  yellow=material('Tail yellow','E5CF3C');parts[-3].data.materials.clear();parts[-3].data.materials.append(yellow)
 if kind=='parrotfish':
  beak=material('Parrot beak','C8DBCC');parts.append(ell('Fused dental beak',(0,L*.375,-.01),(.037,.028,.034),beak))
 if kind in ['grunts','sergeant-major','yellowtail']:
  mark=dark if kind=='sergeant-major' else (material('Grunt blue stripes','6194AA') if kind=='grunts' else material('Gold fish markings','D9B331'));body=parts[0];body.data.materials.append(mark)
  for poly in body.data.polygons:
   p=poly.center
   painted=(any(abs(p.y-yy)<L*.035 for yy in [-L*.29,-L*.15,0,L*.15,L*.29]) if kind=='sergeant-major' else (any(abs(p.z-z)<L*.012 for z in [-height*.65,-height*.2,height*.25,height*.65]) if kind=='grunts' else abs(p.z)<L*.025))
   if painted:poly.material_index=1
  if kind in ['yellowtail','grunts']:
   for part in parts:
    if 'tail' in part.name.lower():part.data.materials.clear();part.data.materials.append(dark if kind=='grunts' else mark)
 if kind=='grunts':
  for poly in parts[0].data.polygons:poly.material_index=0
  stripe=material('Grunt blue stripes','6194AA')
  for z in [-height*.62,-height*.22,height*.22,height*.62]:
   end=L*.38*math.sqrt(1-(z/height)**2)*.95
   for side in [-1,1]:
    pts=[]
    for j in range(25):
     yy=(j/24*2-1)*end;xx=side*(fat*math.sqrt(max(.001,1-(yy/(L*.38))**2-(z/height)**2))+.0005);pts.append((xx,yy,z))
    parts.append(tube('Continuous blue stripe',pts,[L*.006]*len(pts),stripe,5))
 if kind=='barracuda':
  for yy in [-.3,-.18,-.06,.06,.18]:
   for s in [-1,1]:parts.append(tube('Dark flank bar',[(s*.061,yy,-.025),(s*.071,yy,.035)],[.01,.008],dark,5))
 return animal_root(id,parts)

def turtle(id):
 shell=material('Olive carapace','64734A');rim=material('Shell seams','A5AC75');skin=material('Turtle skin','92985E');dark=material('Scute border','344C38');parts=[]
 parts.extend([ell('Oval arched carapace',(0,0,.035),(.38,.48,.19),shell,24,14),ell('Pale plastron',(0,0,-.075),(.34,.42,.075),rim,24,10),ell('Neck',(0,.43,.02),(.105,.19,.105),skin),ell('Small turtle head',(0,.58,.055),(.105,.145,.10),skin)])
 for s in [-1,1]:
  parts.append(fin('Long front flipper',[(s*.24,.26,.0),(s*.38,.20,-.01),(s*.55,.04,-.03),(s*.66,-.19,-.04),(s*.65,-.29,-.025),(s*.60,-.33,-.023),(s*.52,-.26,-.03),(s*.39,-.13,-.035),(s*.29,.06,-.02)],skin,.022))
  parts.append(fin('Rear flipper',[(s*.24,-.31,-.01),(s*.40,-.51,-.02),(s*.16,-.45,-.03)],skin,.02))
  for i in range(3):
   y=.25-i*.22;parts.append(tube('Carapace scute seam',[(0,y,.22),(s*.17,y+.02,.205),(s*.30,y-.04,.13)],[.009]*3,dark,5))
 parts.append(tube('Central shell ridge',[(0,-.39,.1),(0,-.22,.2),(0,.03,.23),(0,.28,.19),(0,.4,.12)],[.008]*5,dark,5));eyes(parts,.092,.62,.09,.018);parts.append(tube('Short tail',[(0,-.4,-.05),(0,-.55,-.04)],[.035,.003],skin))
 if 'hawksbill' in id:
  shell.diffuse_color=(.45,.25,.09,1);shell.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.45,.25,.09,1)
  parts.append(tube('Hooked hawksbill beak',[(0,.68,.04),(0,.72,.02),(0,.715,-.01)],[.025,.018,.002],skin,8))
  for i in range(18):
   an=i*2.4;parts.append(ell('Amber shell mottling',(math.cos(an)*.25,math.sin(an)*.34,.16),(.05,.07,.02),rim,10,6))
 return animal_root(id,parts,axis=0,amount=.035)

def clam(id):
 shell=material('Fluted clam shell','AA9878');mantle=material('Blue folded mantle','3055A1',.28);spot=material('Mantle teal spots','4BB9BB');parts=[]
 for s in [-1,1]:
  for i in range(7):
   x=(i-3)*.055;parts.append(ell('Radial shell rib',(x,s*.08,.025+abs(i-3)*.012),(.05,.19,.1),shell,12,8))
 for i in range(12):
  ang=i*math.tau/12;parts.append(ell('Wavy mantle',(math.cos(ang)*.16,math.sin(ang)*.17,.17),(.067,.069,.035),mantle,12,8));parts.append(ell('Mantle marking',(math.cos(ang)*.17,math.sin(ang)*.17,.20),(.015,.02,.005),spot,8,6))
 parts.append(ell('Continuous mantle',(0,0,.165),(.18,.17,.035),mantle,24,12));parts.append(ell('Incurrent opening',(0,.07,.171),(.026,.044,.015),material('Siphon','101D42')));return join(id,parts)

def coral(id,kind='staghorn'):
 mat=material('Coral living tissue','C6A878' if kind=='staghorn' else 'B69059');tip=material('Growing tips','F0DCB0');parts=[]
 if kind=='brain':
  parts.append(ell('Massive coral colony',(0,0,.3),(.55,.5,.35),mat,24,16))
  for i in range(12):
   pts=[]
   for j in range(16):
    x=(j/15-.5)*.87;y=(i/11-.5)*.8;rr=(x/.55)**2+(y/.5)**2
    if rr<.95:pts.append((x,y+math.sin(j*1.5+i)*.022,.3+.35*math.sqrt(1-rr)))
   if len(pts)>1:parts.append(tube('Meandering corallite ridge',pts,[.022]*len(pts),tip,6))
 else:
  for i in range(10):
   an=i*2.4;r=.1+(i%3)*.12;x=math.cos(an)*r;y=math.sin(an)*r;h=.45+(i%4)*.12
   pts=[(x*.35,y*.35,0),(x,y,h*.5),(x*1.3,y*1.3,h)];parts.append(tube('Antler branch',pts,[.06,.045,.018],mat,8))
   if kind=='staghorn':
    for j in range(4):
     t=.45+j*.13;cx=x*(.7+t*.6);cy=y*(.7+t*.6)
     for k in range(3):
      an=k*math.tau/3+j*.4;parts.append(tube('Radial corallite',[(cx+math.cos(an)*.027,cy+math.sin(an)*.027,h*t),(cx+math.cos(an)*.048,cy+math.sin(an)*.048,h*t+.018)],[.009,.007],tip,5))
   for s in [-1,1]:
    if kind=='elkhorn':
     o=tube('Flattened antler blade',[(x,y,h*.4),(x+s*.14,y,h*.75),(x+s*.25,y,h),(x+s*.29,y,h*1.08)],[.055,.08,.06,.012],mat,10)
     for v in o.data.vertices:v.co.y=y+(v.co.y-y)*.38
     parts.append(o)
    else:parts.append(tube('Forked coral branch',[(x,y,h*.48),(x+s*.15,y+.07,h*.75),(x+s*.2,y+.1,h*.93)],[.028,.025,.008],tip,7))
 return join(id,parts)

def blades(id,kind='grass'):
 mat=material('Living leaves','4D916A');parts=[]
 for i in range(22):
  ang=i*2.4;r=.08+random.random()*.25;x=math.cos(ang)*r;y=math.sin(ang)*r;h=.18+random.random()*.35;w=.004 if id=='seagrass' else .012
  parts.append(fin('Ribbon leaf',[(x-w,y,0),(x+w,y,0),(x+.035+w,y+.04,h*.55),(x+.10+w,y+.08,h),(x+.10-w,y+.08,h),(x+.035-w,y+.035,h*.52)],mat,.002))
 o=join(id,parts);animate(o,{'sway':5},axis=0,amount=.035);return o

def bird(id,kind='pelican'):
 white=material('Bird pale plumage','E2DFCE');black=material('Bird dark plumage','30353B');bill=material('Bill','20282C' if kind=='petrel' else 'D3AB61');parts=[]
 if kind in ['adelie','emperor']:
  L=1.1 if kind=='emperor' else .7
  parts.extend([ell('Penguin body',(0,0,L*.42),(L*.20,L*.15,L*.38),black,20,14),ell('White belly',(0,L*.103,L*.41),(L*.163,L*.079,L*.30),white,20,12),ell('Dark head',(0,0,L*.79),(L*.135,L*.125,L*.15),black),tube('Pointed bill',[(0,L*.10,L*.79),(0,L*.24,L*.775)],[L*.043,.003],black)])
  for s in [-1,1]:
   parts.append(fin('Penguin flipper',[(s*L*.16,0,L*.65),(s*L*.31,-L*.015,L*.28),(s*L*.22,-L*.07,L*.20),(s*L*.16,-L*.09,L*.49)],black,.015));parts.append(ell('Webbed foot',(s*L*.10,L*.08,L*.035),(L*.06,L*.13,L*.025),bill))
  if kind=='emperor':
   gold=material('Emperor ear patches','D6AB3B')
   for s in [-1,1]:parts.append(ell('Golden ear',(s*L*.10,L*.032,L*.735),(L*.026,L*.052,L*.06),gold))
  else:
   for s in [-1,1]:parts.append(ell('Adelie white eye ring',(s*L*.132,L*.046,L*.824),(L*.008,L*.026,L*.026),white))
  eyes(parts,L*.142,L*.05,L*.825,L*.012)
 else:
  rail=kind=='rail';petrel=kind=='petrel';dark=white if petrel else (material('Rail brown','79604B') if rail else black);scale=.6 if petrel else (.3 if rail else 1)
  parts+=[ell('Feathered body',(0,0,0),(.16*scale,.31*scale,.17*scale),dark,32,20),tube('Neck',[(0,.17*scale,.02*scale),(0,.29*scale,.18*scale),(0,.32*scale,.27*scale)],[.09*scale,.065*scale,.07*scale],dark),ell('Bird head',(0,.34*scale,.29*scale),(.09*scale,.11*scale,.085*scale),white if not rail else bill)]
  parts.append(tube('Bill',[(0,.42*scale,.28*scale),(0,(.78 if kind=='pelican' else .57)*scale,.24*scale)],[.036*scale,.003],bill))
  if kind=='pelican':parts.append(fin('Pelican throat pouch',[(-.015,.44,.26),(0,.73,.24),(.015,.45,.13)],bill,.015))
  for s in [-1,1]:
   if rail:parts.append(ell('Folded rail wing',(s*.13*scale,-.015*scale,.015*scale),(.065*scale,.20*scale,.1*scale),dark))
   else:parts.append(fin('Swept wing',[(s*.1*scale,.15*scale,.06*scale),(s*.67*scale,-.17*scale,.14*scale),(s*.8*scale,-.36*scale,.08*scale),(s*.35*scale,-.24*scale,-.02*scale)],dark,.018*scale))
   parts.append(tube('Leg',[(s*.07*scale,-.04*scale,-.1*scale),(s*.07*scale,.01*scale,-.28*scale)],[.016*scale,.01*scale],bill))
   for toe in [-1,0,1]:parts.append(tube('Bird toe',[(s*.07*scale,.01*scale,-.28*scale),(s*.07*scale+toe*.026*scale,.09*scale,-.285*scale)],[.008*scale,.002*scale],bill,5))
  parts.append(fin('Tail feathers',[(-.09*scale,-.19*scale,0),(0,-.48*scale,.06*scale),(.09*scale,-.19*scale,0)],dark,.02));eyes(parts,.079*scale,.375*scale,.31*scale,.014*scale)
  if rail:
   body=parts[0];body.data.materials.append(white)
   for poly in body.data.polygons:
    if poly.center.z<.015*scale and int((poly.center.y/scale+.4)*45)%2==0:poly.material_index=1
   for s in [-1,1]:parts.append(tube('White rail eyebrow',[(s*.08*scale,.28*scale,.33*scale),(s*.087*scale,.37*scale,.335*scale),(s*.045*scale,.42*scale,.32*scale)],[.012*scale]*3,white,5))
   parts.append(ell('Buff chest band',(0,.27*scale,-.015*scale),(.10*scale,.058*scale,.045*scale),bill))
   for i in range(8):parts.append(tube('Flank bars',[(-.135*scale,(-.17+i*.04)*scale,-.07*scale),(0,(-.18+i*.04)*scale,-.17*scale),(.135*scale,(-.17+i*.04)*scale,-.07*scale)],[.01*scale]*3,white,5))
 return animal_root(id,parts,clip='glide',axis=0,amount=.02)

def seal(id,kind='weddell'):
 mat=material('Seal coat','777F81' if kind=='weddell' else ('7C746A' if kind=='elephant' else '727D80'));belly=material('Seal markings','B6BFBE');parts=[];L={'weddell':2.7,'elephant':3.2,'leopard':2.8}[kind]
 parts.extend([ell('Streamlined seal',(0,0,0),(L*(.14 if kind=='leopard' else .19),L*.38,L*(.14 if kind=='leopard' else .19)),mat,32,20),ell('Seal neck',(0,L*.32,0),(L*.125,L*.18,L*.135),mat),ell('Seal head',(0,L*.46,.015),(L*.102,L*(.19 if kind=='leopard' else .135),L*.09),mat),ell('Pale muzzle',(0,L*.56,-.02),(L*.09,L*.05,L*.052),belly)])
 for s in [-1,1]:
  parts.append(fin('Fore flipper',[(s*L*.12,L*.14,-L*.05),(s*L*(.40 if kind=='leopard' else .31),-L*.07,-L*.10),(s*L*.19,-L*.17,-L*.08)],mat,.022))
  parts.append(fin('Hind flipper',[(0,-L*.34,0),(s*L*.17,-L*.61,0),(s*L*.20,-L*.51,-L*.025),(s*L*.09,-L*.36,0)],mat,.03))
  for j in range(3):parts.append(tube('Whisker',[(s*L*.055,L*.59,0),(s*L*(.10+j*.015),L*.61,-L*.01*j)],[.003,.001],belly,4))
 if kind in ['leopard','weddell']:
  body=parts[0];spot=material('Seal mottling','3E494B' if kind=='leopard' else 'A4B2B3');body.data.materials.append(spot)
  for poly in body.data.polygons:
   p=poly.center;v=math.sin(p.x*47+p.y*12)*math.sin(p.y*39-p.z*51)
   if v>.65:poly.material_index=1
 # Female elephant seal avoids unsupported exaggerated adult male proboscis.
 eyes(parts,L*.103,L*.49,L*.065,L*.012);return animal_root(id,parts,axis=0,amount=.025)

def jelly(id,kind):
 red=material('Jelly red tissue','9E3048',.28);pale=material('Pale tissue','BFAFB5',.28);dark=material('Dark red gut','5E142B');parts=[]
 if kind=='comb':
  red.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.62;red.surface_render_method='DITHERED'
  parts.append(ell('Red stomach',(0,0,0),(.038,.027,.05),dark,20,14))
  for s in [-1,1]:parts.append(ell('Lobed comb jelly',(s*.031,0,.005),(.034,.038,.061),red,20,14))
  for i in range(8):
   ang=i*math.tau/8;pts=[(math.cos(ang)*.052*math.sin(t*math.pi),math.sin(ang)*.039*math.sin(t*math.pi),.063*math.cos(t*math.pi)) for t in [.1,.25,.4,.55,.7,.85,.95]];parts.append(tube('Comb row',pts,[.0016]*len(pts),pale,5))
 elif kind=='big-red':
  parts.append(ell('Thick red bell',(0,0,.09),(.43,.43,.28),red,32,18))
  for i in range(6):
   ang=i*math.tau/6;parts.append(tube('Broad feeding arm',[(math.cos(ang)*.18,math.sin(ang)*.18,-.04),(math.cos(ang)*.23,math.sin(ang)*.23,-.30),(math.cos(ang)*.3,math.sin(ang)*.3,-.40)],[.065,.05,.015],red,10))
 elif kind=='vampire':
  parts.append(ell('Vampire squid mantle',(0,0,.07),(.075,.063,.13),dark,20,14))
  for s in [-1,1]:parts.append(fin('Paired ear fin',[(s*.055,0,.10),(s*.15,0,.12),(s*.12,0,.02),(s*.064,0,.025)],red,.018))
  for i in range(8):
   an=i*math.tau/8;an2=(i+1)*math.tau/8;parts.append(fin('Eight-arm web',[(0,0,.03),(math.cos(an)*.11,math.sin(an)*.11,-.12),(math.cos(an2)*.11,math.sin(an2)*.11,-.12)],red,.003));parts.append(tube('Webbed arm',[(math.cos(an)*.05,math.sin(an)*.05,.025),(math.cos(an)*.11,math.sin(an)*.11,-.12),(math.cos(an)*.09,math.sin(an)*.09,-.18)],[.009,.008,.003],dark,6))
  eyes(parts,.065,.025,0,.02)
  for side in [-1,1]:parts.append(tube('Retractile feeding filament',[(side*.025,0,-.04),(side*.14,.015,-.20),(side*.18,.03,-.29)],[.0014,.001,.0004],pale,5))
 elif kind=='larvacean':
  parts.append(ell('Red larvacean trunk',(0,0,0),(.014,.017,.015),red,16,10));parts.append(tube('Long muscular tail',[(0,-.009,0),(.012,-.05,0),(-.005,-.095,.01),(.008,-.14,.015)],[.007,.006,.004,.001],pale,8))
  # Sparse arcs describe a mucus house without depicting an opaque solid bubble.
  for i in range(12):
   an=i*math.tau/12;pts=[(math.cos(an)*.15*math.sin(t*math.pi),math.sin(an)*.15*math.sin(t*math.pi)-.04,.17*math.cos(t*math.pi)) for t in [j/12 for j in range(13)]];parts.append(tube('Mucus house strand',pts,[.0005]*len(pts),pale,4))
 return animal_root(id,parts,clip='glide' if kind in ['comb','vampire','larvacean'] else 'pulse',axis=0,amount=.04)

def barreleye(id):
 body=material('Barreleye dark body','333F45');clear=material('Transparent head dome','BDD8C5',.12);n=clear.node_tree.nodes.get('Principled BSDF');n.inputs['Alpha'].default_value=.25;clear.diffuse_color=(*clear.diffuse_color[:3],.25);clear.surface_render_method='DITHERED';green=material('Tubular green eyes','74AA76');parts=[ell('Barreleye body',(0,-.025,0),(.023,.066,.03),body,20,14),ell('Transparent head shield',(0,.031,.018),(.032,.039,.031),clear,24,16)]
 for s in [-1,1]:parts.append(ell('Upward tubular eye',(s*.012,.035,.024),(.008,.01,.015),green,14,10));parts.append(fin('Broad pectoral fin',[(s*.019,.007,0),(s*.055,-.023,-.01),(s*.02,-.034,-.008)],clear))
 parts.append(fin('Tail',[(0,-.08,0),(0,-.10,.024),(0,-.10,-.024)],clear));return animal_root(id,parts,axis=2,amount=.025)

def feature(id,kind):
 parts=[];stone=material('Feature surface','86999D' if kind=='rock' else 'D6C499')
 if kind=='ice':
  m=material('Glacial blue ice','B3DAE4',.24)
  for i in range(8):parts.append(ell('Faceted glacial ice',(math.sin(i*2.4)*.6,math.cos(i*2.4)*.6,.2+(i%3)*.25),(.7,.6,.5),m,6,4))
 elif kind=='wreck':
  return corroded_wreck(id)
 elif kind=='snow':
  for i in range(25):parts.append(ell('Sinking aggregate',((random.random()-.5),random.random()-.5,random.random()-.5),(.007,.006,.01),material('Marine snow','D9D9CF'),6,4))
 elif kind=='water':
  # A small visual sampling ribbon, not a biological identity.
  for i in range(5):parts.append(tube('Water wave',[(x*.12,0,.02*math.sin(x+i)) for x in range(-5,6)],[.012]*11,material('Water sample','4BA7B9'),6))
 else:
  for i in range(7):parts.append(ell('Substrate',((random.random()-.5)*.6,(random.random()-.5)*.6,0),(.35,.28,.07 if kind=='sand' else .23),stone,12,8))
 return join(id,parts)

def sea_fan(id):
 # Irregular reticulate colony: clipped Voronoi cells supply interconnected
 # branchlets, while larger curved trunks carry the broad asymmetric fan.
 rng=random.Random(a.seed+731);mat=material('Violet sea fan branchlets','93619D',.8)
 parts=[];seeds=[]
 for row in range(25):
  for col in range(25):
   seeds.append((-.49+col*.041+rng.uniform(-.014,.014),.08+row*.039+rng.uniform(-.013,.013)))
 def inside(x,z):
  xx=(x-.038*math.sin(z*5))/.45;zz=(z-.56)/.45
  theta=math.atan2(zz,xx);edge=1+.06*math.sin(theta*5)+.045*math.cos(theta*9)
  return xx*xx+zz*zz<edge*edge and z>.17+abs(x)*.22
 def point(x,z):return (x,.022*math.sin(x*8+z*6)+.012*math.sin(z*13),z)
 seen=set()
 for sx,sz in seeds:
  if not inside(sx,sz):continue
  poly=[(sx-.065,sz-.065),(sx+.065,sz-.065),(sx+.065,sz+.065),(sx-.065,sz+.065)]
  for tx,tz in seeds:
   if (sx,sz)==(tx,tz) or abs(tx-sx)>.13 or abs(tz-sz)>.13:continue
   nx,nz=tx-sx,tz-sz;c=(tx*tx+tz*tz-sx*sx-sz*sz)/2;new=[]
   for i,u in enumerate(poly):
    v=poly[(i+1)%len(poly)];du=u[0]*nx+u[1]*nz-c;dv=v[0]*nx+v[1]*nz-c
    if du<=0:new.append(u)
    if (du<=0)!=(dv<=0):
     t=du/(du-dv);new.append((u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])))
   poly=new
   if not poly:break
  for i,u in enumerate(poly):
   v=poly[(i+1)%len(poly)]
   if not inside(*u) or not inside(*v):continue
   key=tuple(sorted([(round(u[0],5),round(u[1],5)),(round(v[0],5),round(v[1],5))]))
   if key in seen:continue
   seen.add(key);mid=((u[0]+v[0])/2+rng.uniform(-.0015,.0015),(u[1]+v[1])/2)
   r=rng.uniform(.0014,.0023)
   parts.append(tube('Anastomosing fine branch',[point(*u),point(*v)],[r,r],mat,3,transport=True))
 stem=mat
 parts.append(tube('Irregular holdfast stem',[(0,0,0),(.012,0,.10),(-.01,.008,.21),(.017,.01,.34)],[.021,.015,.010,.004],stem,8,transport=True))
 for j in range(7):
  target=-.38+j*.119;top=.78+.12*math.sin(j*.8);pts=[]
  for k in range(12):
   t=k/11;x=.006+target*t**1.25+.012*math.sin(t*9+j)*t;z=.18+(top-.18)*t
   pts.append(point(x,z))
  parts.append(tube('Tapering primary branch',pts,[.008*(1-k/13)**1.4+.001 for k in range(12)],stem,5,transport=True))
 return animal_root(id,parts,clip='sway',axis=0,amount=.025)


def corroded_wreck(id):
 # Original compressed exterior study after NOAA's present-day Benwood survey.
 # Every support has a thin plate/angle section, never a circular pipe.
 from mathutils import noise
 rng=random.Random(a.seed+(981 if id=='wreck-bow' else 982));parts=[]
 steel=material('Corroded steel and calcareous crust','FFFFFF',.94)
 node=steel.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Corrosion'
 steel.node_tree.links.new(node.outputs['Color'],steel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 palette=[(0.12,.105,.065),(.34,.19,.08),(.57,.34,.15),(.47,.45,.31),(.67,.65,.48)]
 def paint(o,pale=False):
  attr=o.data.color_attributes.new(name='Corrosion',type='FLOAT_COLOR',domain='POINT')
  for v in o.data.vertices:
   q=o.matrix_world@v.co
   broad=noise.noise(q*3.2);fine=noise.noise(q*14)
   t=max(0,min(3.999,2.0+broad*2.4+fine*1.3+(1.2 if pale else 0)))
   n=int(t);f=t-n;rgb=tuple(palette[n][k]*(1-f)+palette[min(n+1,4)][k]*f for k in range(3))
   rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
   attr.data[v.index].color=(*rgb,1)
  return o
 def plate(name,fn,nx,ny,holes=(),thickness=.024,broken=False):
  # Jittered tessellation and removed elliptical regions produce real holes;
  # exposed perimeter walls retain the flat steel's measured thinness.
  verts=[];uv=[]
  for j in range(ny+1):
   for i in range(nx+1):
    u=i/nx;v=j/ny
    if i not in (0,nx):u+=rng.uniform(-.24,.24)/nx
    if j not in (0,ny):v+=rng.uniform(-.23,.23)/ny
    if broken and j==ny:v-=rng.uniform(0,.15)
    uv.append((u,v));verts.append(Vector(fn(u,v)))
  base=len(verts);normals=[]
  for u,v in uv:
   normal=(Vector(fn(min(1,u+.001),v))-Vector(fn(max(0,u-.001),v))).cross(Vector(fn(u,v+.001))-Vector(fn(u,v-.001))).normalized()
   normals.append(normal)
  verts=[p+n*thickness/2 for p,n in zip(verts,normals)]+[p-n*thickness/2 for p,n in zip(verts,normals)]
  faces=[];edges={}
  for j in range(ny):
   for i in range(nx):
    ids=(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i)
    u=sum(uv[k][0] for k in ids)/4;v=sum(uv[k][1] for k in ids)/4
    if any(((u-h[0])/h[2])**2+((v-h[1])/h[3])**2<1 for h in holes):continue
    if broken and j==ny-1 and rng.random()<.18:continue
    faces.extend([ids,tuple(k+base for k in reversed(ids))])
    for k in range(4):
     e=(ids[k],ids[(k+1)%4]);key=tuple(sorted(e));edges[key]=None if key in edges else e
  for e in edges.values():
   if e:faces.append((e[0],e[0]+base,e[1]+base,e[1]))
  o=mesh(name,verts,faces,steel)
  for f in o.data.polygons:f.use_smooth=False
  parts.append(paint(o));return o
 def angle(name,p,q,width=.13):
  pp,qq=Vector(p),Vector(q);d=(qq-pp).normalized();side=d.cross(Vector((0,0,1)))
  if side.length<.1:side=Vector((1,0,0))
  side.normalize();up=d.cross(side).normalized()
  for cross in [side,up]:
   plate(name,lambda u,v:pp+(qq-pp)*u+cross*((v-.5)*width),max(3,int((qq-pp).length*10)),2,holes=[(.36,.86,.055,.3)] if (qq-pp).length>1 else [],thickness=.023,broken=True)
 ribs=id=='wreck-ribs';count=4 if ribs else 10
 for j in range(count):
  y=(j-1.5)*.7 if ribs else -3.5+j*.64;width=1.4 if ribs else 2.0-.025*max(j-5,0)**2
  angle('Exposed rectangular floor angle',(-width,y,.09),(width,y,.09),.13)
  for side in [-1,1]:
   h=rng.uniform(.48,.97);w=rng.uniform(.36,.64)
   plate('Broken triangular plate knee',lambda u,v,s=side,y=y,w=w,h=h,width=width:(s*(width-w*u),y+.025*math.sin(u*4),.12+h*(1-u)*v),7,7,holes=[(.26,.46,.10,.19)] if j%3==0 else[],broken=True,thickness=.036)
   angle('Knee outer angle',(side*width,y,.08),(side*width,y,h+.1),.095)
 if not ribs:
  for side in [-1,1]:
   plate('Jagged surviving exterior bow plating',lambda u,v,s=side:(s*(1.72*(1-u)**.72),1.6+u*2.4,.08+v*(1.05+.65*u)+.026*math.sin(u*28)*v),27,15,holes=[(.24,.5,.065,.18),(.65,.65,.05,.14)],broken=True,thickness=.043)
   angle('Broken sheer strake',(side*1.92,-3.6,.14),(side*1.9,1.4,.20),.17)
   for k in range(3):
    y=-3.3+k*1.48;w=rng.uniform(.5,.85)
    plate('Detached buckled hull plate',lambda u,v,s=side,y=y,w=w:(s*(1.13+u*w),y+v*1.14,.09+.045*math.sin(u*6+v*5)),9,9,holes=[(.48,.45,.2,.16)],broken=True,thickness=.02)
 else:
  plate('Collapsed side plate fragment',lambda u,v:(-1.43+u*.63,-1.26+v*2.1,.055+.05*math.sin(v*6)),7,14,holes=[(.54,.37,.22,.13)],broken=True)
 # Small irregular crust islands sit on steel, avoiding the former large stones.
 for i in range(65 if not ribs else 22):
  j=rng.randrange(count);y=(j-1.5)*.7 if ribs else -3.5+j*.64
  x=rng.uniform(-1.3,1.3);r=rng.uniform(.035,.11)
  o=ell('Calcareous encrusting patch',(x,y,.14),(r,r*rng.uniform(.7,1.8),rng.uniform(.017,.04)),steel,8,5)
  parts.append(paint(o,True))
 return join(id,parts)

def lobster(id):
 shell=material('Spiny lobster shell','9C7951');pale=material('Lobster pale bands','E1CE9B');parts=[ell('Spiny carapace',(0,.065,.04),(.058,.115,.05),shell,16,10)]
 for j in range(6):parts.append(ell('Segmented abdomen',(0,-.045-j*.026,.035-j*.003),(.055-j*.004,.020,.04-j*.003),shell,14,8))
 for s in [-1,1]:
  for j in range(5):
   y=.08-j*.027;parts.append(tube('Walking leg',[(s*.045,y,.02),(s*.10,y-.02,.02),(s*.14,y-.07,-.03)],[.007,.005,.002],shell,6))
  parts.append(tube('Long antenna',[(s*.025,.15,.08),(s*.07,.28,.10),(s*.16,.49,.15)],[.009,.005,.001],pale,6));parts.append(ell('Stalked eye',(s*.03,.165,.083),(.009,.012,.01),material('Eye ink','101824'),10,8));parts.append(fin('Tail fan',[(0,-.18,.02),(s*.08,-.24,.015),(s*.04,-.26,.013)],pale))
 for j in range(10):parts.append(tube('Carapace spine',[((j%2-.5)*.07,.11-(j//2)*.03,.077),((j%2-.5)*.09,.13-(j//2)*.03,.10)],[.008,.001],pale,5))
 return animal_root(id,parts,clip='walk',axis=2,amount=.01)

def moray(id):
 green=material('Moray olive skin','6E8760');pts=[]
 for i in range(18):
  t=i/17;pts.append((math.sin(t*math.pi*1.5)*.1,.5-t*1.3,.03+math.sin(t*math.pi)*.03))
 parts=[tube('Muscular eel body',pts,[.075*(1-i/19)**.7 for i in range(18)],green,14,transport=True),ell('Elongated moray head',(0,.48,.035),(.077,.15,.073),green,20,12)]
 dorsal=[(p[0],p[1],p[2]+.055) for p in pts[3:]];parts.append(tube('Continuous dorsal fin',dorsal,[.025*(1-i/18) for i in range(len(dorsal))],green,6,transport=True));eyes(parts,.069,.54,.067,.012)
 parts.append(tube('Quiet closed mouth',[(-.067,.56,.013),(0,.617,.005),(.067,.56,.013)],[.004]*3,material('Mouth crease','35483D'),5));return animal_root(id,parts,axis=2,amount=.07)

def krill(id):
 p=material('Krill rose shell','DAB2A8');dark=material('Krill eye','141B21');parts=[]
 for j in range(9):parts.append(ell('Crustacean segment',(0,.018-j*.005,0),(.005-j*.00025,.005,.006-j*.00035),p,12,8))
 for side in [-1,1]:
  parts.append(ell('Compound eye',(side*.005,.022,.005),(.002,.002,.002),dark,10,8))
  for j in range(6):parts.append(tube('Feeding limb',[(side*.004,.012-j*.004,0),(side*.008,.015-j*.004,-.01),(side*.005,.02-j*.004,-.012)],[.0007]*3,p,4))
  parts.append(tube('Antenna',[(side*.004,.024,.002),(side*.011,.047,.005)],[.0006,.0002],p,4))
  parts.append(fin('Tail fan',[(0,-.028,0),(side*.009,-.036,0),(0,-.034,.002)],p,.0005))
 return animal_root(id,parts,axis=0,amount=.03)

# No subject is constructed until its reference record says the photograph was inspected.
index_path=ROOT/'assets/source/model-reference-index.json'
if index_path.exists():
 for item in json.loads(index_path.read_text()):
  id=item['id']
  if a.only and id not in a.only.split(',') and item['builder'] not in a.only.split(','):continue
  if not item.get('visualInspected'):raise ValueError('Uninspected visual reference '+id)
  reset();kind=item['builder'];variant=item.get('variant','')
  if kind=='fish':fish(id,item.get('color','DDAC46'),variant)
  elif kind=='turtle':turtle(id)
  elif kind=='clam':clam(id)
  elif kind=='coral':coral(id,variant)
  elif kind=='grass':blades(id)
  elif kind=='bird':bird(id,variant)
  elif kind=='seal':seal(id,variant)
  elif kind=='jelly':jelly(id,variant)
  elif kind=='barreleye':barreleye(id)
  elif kind=='fan':sea_fan(id)
  elif kind=='lobster':lobster(id)
  elif kind=='eel':moray(id)
  elif kind=='krill':krill(id)
  elif kind=='feature':feature(id,variant)
  else:raise ValueError(kind)
  save(id,item['evidenceIds'])
