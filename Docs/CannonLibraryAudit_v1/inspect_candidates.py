from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json,re,hashlib
root=Path('D:/Projects/animlibrary/Assets/VFX_Library/VFX/Gameplay')
out=Path(__file__).parent
names=['VFX_Cannon_Shoot','VFX_Cannon_Shoot_Scrab','VFX_Cannon_Impact','VFX_Cannon_Impact_InUse','VFX_Impact_Bomb','VFX_Trail_Missile','HCFX_Explosion_01']
sheet=Image.new('RGB',(1280,190*len(names)),(25,25,30))
d=ImageDraw.Draw(sheet); metadata=[]
for row,name in enumerate(names):
    matches=list(root.glob('*/Preview/'+name)); files=sorted(matches[0].glob('*.jpg')) if matches else []
    metadata.append({'name':name,'frames':len(files),'directory':str(matches[0]) if matches else None,'timing':'GIF uses arbitrary 50 ms/frame for review; original capture FPS unknown'})
    d.text((8,row*190+3),name+' | frames='+str(len(files)),fill='white')
    for col in range(8):
        if not files: continue
        i=round(col*(len(files)-1)/7)
        im=ImageOps.contain(Image.open(files[i]).convert('RGB'),(156,150))
        sheet.paste(im,(col*160,row*190+22)); d.text((col*160+5,row*190+172),str(i),fill='white')
    if files:
        frames=[ImageOps.contain(Image.open(f).convert('RGB'),(320,320)) for f in files]
        frames[0].save(out/(name+'_preview.gif'),save_all=True,append_images=frames[1:],duration=50,loop=0)
sheet.save(out/'CandidateContactSheet.png')
(out/'PreviewMetadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
for name in names[:4]:
    directory=next(root.glob('*/Preview/'+name))
    files=sorted(directory.glob('*.jpg'))
    allframes=Image.new('RGB',(1200,140*6),(25,25,30)); draw=ImageDraw.Draw(allframes)
    for i,f in enumerate(files):
        im=ImageOps.contain(Image.open(f).convert('RGB'),(118,118)); x=(i%10)*120; y=(i//10)*140
        allframes.paste(im,(x,y)); draw.text((x+2,y+119),str(i),fill='white')
    allframes.save(out/(name+'_allframes.png'))
print(json.dumps(metadata,indent=2))
