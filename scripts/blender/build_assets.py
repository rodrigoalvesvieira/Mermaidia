"""Original deterministic Mermaidia models. Run with Blender 5.2, --background --python-exit-code 1."""
import bpy, math, random, json, hashlib, sys, argparse
from pathlib import Path
from mathutils import Vector
P=argparse.ArgumentParser();P.add_argument('--seed',type=int,default=4107);P.add_argument('--output',default='public/assets');P.add_argument('--only',default='');P.add_argument('--portraits',action='store_true');P.add_argument('--views',action='store_true')
a=P.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/a.output; random.seed(a.seed)
for p in ['models','portraits']: (OUT/p).mkdir(parents=True,exist_ok=True)
M={}; records=[]
def material(name,hex,rough=.5,metal=0):
 if name in M:return M[name]
 srgb=tuple(int(hex[i:i+2],16)/255 for i in (0,2,4));rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb);m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;M[name]=m;return m

def mesh(name,verts,faces,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for f in me.polygons:f.use_smooth=True
 # Procedural UVs are reproducible even though palette surfaces use no textures.
 uv=me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  for li in poly.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(.5+math.atan2(co.y,co.x)/(2*math.pi),.5+co.z*.2)
 return o

def ell(name,loc,scale,mat,segments=16,rings=10):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o

def tube(name,pts,radii,mat,sides=8,transport=False):
 verts=[];last_normal=None
 for i,p in enumerate(pts):
  tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)]);tangent.normalize();normal=tangent.cross(Vector((0,1,0)))
  if normal.length<.1:normal=tangent.cross(Vector((1,0,0)))
  if transport:
   if last_normal is None:normal=tangent.cross(Vector((0,0,1))) if abs(tangent.z)<.9 else tangent.cross(Vector((0,1,0)))
   else:normal=last_normal-tangent*last_normal.dot(tangent)
  normal.normalize();last_normal=normal.copy();b=tangent.cross(normal)
  for k in range(sides):verts.append(Vector(p)+radii[i]*(normal*math.cos(2*math.pi*k/sides)+b*math.sin(2*math.pi*k/sides)))
 faces=[]
 for i in range(len(pts)-1):
  for k in range(sides):faces.append((i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k))
 faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+k for k in range(sides))]);return mesh(name,verts,faces,mat)

def fin(name,pts,mat,thick=.008):
 # Rounded membrane with real volume, never a camera billboard.
 c=sum((Vector(p) for p in pts),Vector())/len(pts);normal=Vector((0,0,0))
 for i in range(1,len(pts)-1):
  normal=(Vector(pts[i])-Vector(pts[0])).cross(Vector(pts[i+1])-Vector(pts[0]))
  if normal.length>.0000001:break
 normal.normalize();v=[tuple(c+normal*thick)]+pts+[tuple(c-normal*thick)];n=len(pts);f=[]
 for i in range(n):f.extend([(0,i+1,(i+1)%n+1),(n+1,(i+1)%n+1,i+1)])
 o=mesh(name,v,f,mat)
 for face in o.data.polygons:face.use_smooth=False
 return o


def join(name,objects):
 objects=[o for o in objects if o and o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o

def empty(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);M.clear()
 for ac in list(bpy.data.actions):bpy.data.actions.remove(ac)

def animate(o,clips,axis=0,amount=.15,position=False):
 o.rotation_mode='XYZ';base=o.location.copy()
 for name,seconds in clips.items():
  o.animation_data_create();ac=bpy.data.actions.new(name+'_'+o.name);o.animation_data.action=ac
  strength=amount.get(name,.025) if isinstance(amount,dict) else amount
  for frame,t in [(1,0),(1+seconds*6,.25),(1+seconds*12,.5),(1+seconds*18,.75),(1+seconds*24,1)]:
   if position:o.location.z=base.z+strength*math.sin(t*2*math.pi);o.keyframe_insert(data_path='location',frame=frame)
   else:o.rotation_euler[axis]=strength*math.sin(t*2*math.pi);o.keyframe_insert(data_path='rotation_euler',frame=frame)
  o.animation_data.action=None;tr=o.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,1,ac)
 o.location=base;o.rotation_euler=(0,0,0)

def elise():
 skin=material('Warm skin','D99C77');hair=material('Espresso hair','201622',.34);teal=material('Teal tail','158F96',.3,.15);edge=material('Fin turquoise','5BD5BF',.32,.12);top=material('Orchid swim top','AE6CC8');eye=material('Dark iris','26323E');white=material('Eye light','FFF4DD');pink=material('Warm smile','9A495B');gold=material('Sun gold','E8C577',.3,.4)
 root=empty('Elise');body=[]
 body+=[ell('Torso',(0,0,.47),(.235,.14,.35),skin),ell('Head',(0,0,1.05),(.24,.205,.28),skin,24,16),ell('Neck',(0,0,.79),(.085,.08,.14),skin)]
 body+=[ell('Comfortable swim top',(0,-.002,.49),(.24,.15,.235),top),tube('Top neckline',[(-.18,.1,.64),(0,.15,.65),(.18,.1,.64)],[.022]*3,gold)]
 for side in [-1,1]:
  body+=[ell('Ear',(side*.235,0,1.03),(.04,.038,.066),skin),ell('Eye white',(side*.088,.183,1.09),(.052,.022,.062),white),ell('Iris',(side*.084,.204,1.09),(.03,.012,.041),eye),ell('Eye sparkle',(side*.074,.215,1.107),(.008,.005,.012),white)]
  body+=[tube('Curious eyebrow',[(side*.13,.19,1.175),(side*.085,.209,1.186),(side*.047,.195,1.176)],[.012]*3,hair)]
  body+=[tube('Arm',[(side*.20,0,.64),(side*.31,.012,.40),(side*.40,.05,.26)],[.074,.056,.045],skin),ell('Hand',(side*.41,.06,.22),(.055,.046,.08),skin)]
 body+=[ell('Nose',(0,.21,1.026),(.032,.035,.04),skin),tube('Smile',[(-.065,.189,.955),(0,.213,.94),(.065,.189,.955)],[.01,.014,.01],pink)]
 headparts=[o for o in body if any(o.name.startswith(n) for n in ['Head','Ear','Eye','Iris','Curious','Nose','Smile'])]
 b=join('Elise_body',[o for o in body if o not in headparts]);b.parent=root
 head=join('Elise_head',headparts);head.parent=root
 h=[ell('Hair cap',(0,-.035,1.13),(.252,.201,.225),hair)]
 for s in [-1,1]:
  for j in range(4):
   x=s*(.15+j*.03);h+=[tube('Silky hair',[(x,-.06,1.20),(x*1.3,-.13,.98),(x*1.4,-.19,.72),(x*1.3,-.25,.52)],[.07,.065,.07,.018],hair,10)]
 h+=[tube('Swept fringe',[(-.21,.07,1.20),(-.12,.17,1.29),(.01,.2,1.29),(.15,.17,1.23)],[.062,.07,.06,.024],hair)]
 hh=join('Elise_hair',h);hh.parent=root
 t=[tube('Tapered mermaid tail',[(0,0,.22),(0,0,.02),(0,-.02,-.27),(0,-.10,-.52),(0,-.19,-.72)],[.22,.205,.16,.105,.055],teal,24)]
 for s in [-1,1]:
  t+=[fin('Tail fluke',[(0,-.19,-.70),(s*.24,-.19,-.79),(s*.40,-.12,-1.05),(s*.31,-.08,-1.17),(s*.07,-.13,-.98),(0,-.19,-.84)],edge)]
  for j in range(3):t+=[tube('Fluke vein',[(0,-.18,-.77),(s*(.12+j*.07),-.165,-.91),(s*(.12+j*.085),-.105,-1.07)],[.009,.007,.002],teal,5)]
 for z in [.1,-.04,-.18,-.32]:
  for x in [-.1,0,.1]:t+=[ell('Iridescent scale',(x,.16+(z*.08),z),(.028,.008,.02),edge,8,6)]
 tail=join('Elise_tail',t);tail.parent=root
 clips={'idle':4,'swim':2,'fast':1.2,'turn':2.4,'look':3,'surface':3.5};animate(tail,clips,amount={'idle':.05,'swim':.18,'fast':.27,'turn':.12,'look':.025,'surface':.07});animate(hh,clips,axis=1,amount=.035);animate(head,clips,axis=2,amount={'look':.24,'turn':.12,'idle':.035,'swim':.025,'fast':.025,'surface':.04});animate(root,clips,amount={'surface':.05,'idle':.025,'swim':.015,'fast':.015,'turn':.015,'look':.015},position=True)
 return root

def reef():
 rock=material('Limestone','8B9B8B');sand=material('Pale sand','D8C89F');obs=[]
 for i in range(12):
  ang=i*2.4;r=(i%3)*.35;obs.append(ell('Porous reef limestone',(math.sin(ang)*r,math.cos(ang)*r,.15+(.4 if i>7 else 0)),(.45,.4,.24),rock,12,8))
 obs.append(ell('Sand bank',(0,0,-.08),(1.5,1.3,.13),sand,20,8));return join('Reef_limestone',obs)

def bounds():
 pts=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box];lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)));hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)));return lo,hi

def render(id):
 sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=20;sc.cycles.use_denoising=True;sc.render.resolution_x=512;sc.render.resolution_y=512;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.film_transparent=True;sc.world.color=(.055,.095,.12);sc.view_settings.view_transform='AgX'
 lo,hi=bounds();center=(hi+lo)*.5;size=max(hi-lo)*1.55
 bpy.ops.object.camera_add(location=center+Vector((size*.62,size*.9,size*.35)));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*.86;sc.camera=cam
 for loc,power,s in [((3,4,6),650,5),((-4,1,3),400,4),((0,-4,3),850,3)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));li=bpy.context.object;li.data.energy=power;li.data.shape='DISK';li.data.size=s;li.rotation_euler=(center-li.location).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/'portraits'/f'{id}.png');bpy.ops.render.render(write_still=True)
 if a.views:
  for label,vec in [('front',(0,1,.12)),('side',(1,0,.12))]:
   cam.location=center+Vector(vec)*size;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(ROOT/'artifacts/art'/f'{id}-{label}.png');bpy.ops.render.render(write_still=True)

def save(id,evidence=[]):
 bpy.context.scene.render.fps=24;bpy.context.scene.frame_set(1);bpy.context.view_layer.update();path=OUT/'models'/f'{id}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_copyright='Original Mermaidia project artwork; CC0-1.0')
 records.append({'id':id,'localPath':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'creator':'Mermaidia original procedural Blender artwork','licenseIdOrTerms':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','attribution':'Original Mermaidia artwork, released under CC0-1.0. Scientific references are not redistributed.','modifications':['Authored in Blender 5.2.1 from deterministic recipe; glTF Y-up export'],'distribution':'approved','evidenceIds':evidence,'buildRecipe':'scripts/blender/build_assets.py --seed 4107'})
 if a.portraits:render(id);p=OUT/'portraits'/f'{id}.png';records.append({**records[-1],'id':id+'-portrait','localPath':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})

if not a.only or a.only in ['elise','reef-kit']:
 for id,fn in [('elise',elise),('reef-kit',reef)]:
  if a.only and id!=a.only:continue
  reset();fn();save(id)
# Biological builders and inspected reference index are loaded as a separate original recipe.
species_file=ROOT/'scripts/blender/species.py'
if species_file.exists():exec(compile(species_file.read_text(),str(species_file),'exec'))
manifest=ROOT/'assets/manifests/models.json';old=json.loads(manifest.read_text()) if manifest.exists() else [];ids={r['id'] for r in records};manifest.write_text(json.dumps([r for r in old if r['id'] not in ids]+records,indent=2)+'\n')
(ROOT/'assets/source/build.json').write_text(json.dumps({'blenderVersion':bpy.app.version_string,'seed':a.seed,'recipe':'scripts/blender/build_assets.py','axes':'Blender Z up +Y forward; glTF Y up -Z forward','units':'meters','license':'CC0-1.0'},indent=2)+'\n')
print('MERMAIDIA_ASSETS_COMPLETE',len(records))
