"""Compose already-rendered model views for review; requires Pillow (verified 12.3.0)."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path(__file__).resolve().parents[2]
records=json.loads((root/'assets/source/model-reference-index.json').read_text())
items=[{'id':'elise','evidenceIds':['original-fictional-design']},{'id':'reef-kit','evidenceIds':['original-generic-limestone']}]+records
out=root/'artifacts/art';(out/'sheets').mkdir(exist_ok=True)
summary=Image.new('RGB',(1200,((len(items)+4)//5)*264),'#18323E');d=ImageDraw.Draw(summary)
for i,row in enumerate(items):
 id=row['id'];impath=root/'public/assets/portraits'/f'{id}.png'
 if not impath.exists():continue
 im=Image.open(impath).convert('RGBA');thumb=Image.new('RGBA',(240,240),'#24424E');thumb.alpha_composite(im.resize((240,240)));summary.paste(thumb.convert('RGB'),((i%5)*240,(i//5)*264));d.text(((i%5)*240+7,(i//5)*264+242),id,fill='white')
 sheet=Image.new('RGB',(960,372),'#24424E');sd=ImageDraw.Draw(sheet)
 for j,view in enumerate([out/f'{id}-front.png',impath,out/f'{id}-side.png']):
  if not view.exists():continue
  tile=Image.new('RGBA',(320,320),'#24424E');tile.alpha_composite(Image.open(view).convert('RGBA').resize((320,320)));sheet.paste(tile.convert('RGB'),(j*320,24))
 sd.text((12,6),id+' — front / three-quarter / side',fill='white');sd.text((12,351),'Evidence: '+', '.join(row['evidenceIds']),fill='white');sheet.save(out/'sheets'/f'{id}.png')
summary.save(out/'contact-sheet.png')
print('Contact sheets:',len(items))
