from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import json,hashlib,shutil,re
O=Path(__file__).parent;T=O.parents[1];S=Path('D:/Projects/animlibrary');V=O/'UnityValidation';R=O/'RuntimeValidation'
approved=json.loads((O/'AssetInventory_v2_Approved.json').read_text(encoding='utf-8'));delta=json.loads((O/'AssetPlan_v2_Delta1_Pending.json').read_text(encoding='utf-8'))
assets=approved['assets']+delta['assets'];reverse={x['targetGuid']:x['sourceGuid'] for x in assets};proof={'sourceFilesUnchanged':True,'sourceFileCount':len(assets),'prefabVisualDataUnchanged':True,'pipelineSettingsUnchanged':True,'identicalValidatedSourceBytes':True,'checks':[]}
for a in assets:
    f=S/a['source'];target=T/a['destination'];validated=V/a['destination']
    same=hashlib.sha256(f.read_bytes()).hexdigest()==a['sha256']
    if not same:proof['sourceFilesUnchanged']=False
    if target.read_bytes()!=validated.read_bytes():proof['identicalValidatedSourceBytes']=False
    if target.suffix=='.prefab':
        raw=target.read_text(encoding='utf-8')
        for new,old in reverse.items():raw=raw.replace(new,old)
        equal=raw==f.read_text(encoding='utf-8-sig');proof['prefabVisualDataUnchanged'] &= equal
        proof['checks'].append({'prefab':a['destination'],'equalToSourceExceptGuidRemaps':equal})
for name in ['GraphicsSettings.asset','QualitySettings.asset']:
    same=(T/'ProjectSettings'/name).read_bytes()==(O/('Before_'+name)).read_bytes();proof['pipelineSettingsUnchanged'] &= same
    proof['checks'].append({'settings':name,'unchanged':same})
play=json.loads((R/'PlayReport.json').read_text(encoding='utf-8'));technical=json.loads((R/'UnityTechnicalReport.json').read_text(encoding='utf-8'));catalog=json.loads((R/'UnityImportedCatalog.json').read_text(encoding='utf-8'))
assert all(play[k] for k in ['completed','stopClears','muzzleEnds','impactEnds','replayEmits','loopRepeats']) and not play['errors']
assert technical['completed'] and not technical['errors'] and catalog['complete']
assert all(proof[k] for k in ['sourceFilesUnchanged','prefabVisualDataUnchanged','pipelineSettingsUnchanged','identicalValidatedSourceBytes'])
scene='Assets/CannonVFX_LibraryReuse_v1/Scenes/CannonLibraryReuse_Demo.unity'
(T/scene).parent.mkdir(parents=True,exist_ok=True)
if (T/scene).exists():
    expected=(O/'BeforeReframeScene.sha256').read_text(encoding='utf-8-sig').strip().lower()
    if hashlib.sha256((T/scene).read_bytes()).hexdigest()!=expected:raise RuntimeError('Target scene changed since generated output; do not overwrite.')
for rel in [scene,scene+'.meta']:
    shutil.copyfile(V/rel,T/rel)
shutil.copyfile(V/'Packages/packages-lock.json',T/'Packages/packages-lock.json')
proof['sceneCopiedFromValidatedProject']=scene
(R/'IntegrityReport.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8')
manifest={'planVersion':'v2 + delta1','approved':True,'approvalEvidence':['User: ok tiếp đi after C01-C07 approval request.','User: Duyệt bổ sung D01–D04.'],'sourceFileCount':37,'targetProject':str(T),'validationProject':str(V),'validationMode':'Actual Unity Play mode in isolated project with byte-identical copied source assets and project settings. Target editor remained open and untouched.','prefabs':[x['destination'] for x in assets if x['destination'].endswith('.prefab')],'scene':scene,'catalog':'RuntimeValidation/UnityImportedCatalog.json','technicalReport':'RuntimeValidation/UnityTechnicalReport.json','playReport':'RuntimeValidation/PlayReport.json','assets':assets}
(O/'BuildManifest_v2_Executed.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
framesChosen=[0,1,2,3,5,8,12,18,25,40,65,100]
contact=Image.new('RGB',(1536,158*3),(25,28,34));draw=ImageDraw.Draw(contact)
for row,name in enumerate(['Muzzle','Impact','Sequence']):
    files=sorted((R/name).glob('*.png'));assert len(files)==120
    frames=[Image.open(f).convert('RGB') for f in files]
    durations=[30 if i%3!=2 else 40 for i in range(len(frames))]
    frames[0].save(R/(name+'_PlayMode.gif'),save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True)
    for col,i in enumerate(framesChosen):
        contact.paste(ImageOps.contain(frames[i],(128,128)),(col*128,row*158+16))
        draw.text((col*128+4,row*158+144),str(i)+' / '+format((i+1)/30,'.2f')+'s',fill='white')
    draw.text((4,row*158+1),name+' (real Play mode, 30fps)',fill='white')
    # Every captured frame is also available in a compact storyboard for review.
    full=Image.new('RGB',(1200,120*10),(25,28,34));fd=ImageDraw.Draw(full)
    for i,frame in enumerate(frames):
        full.paste(ImageOps.contain(frame,(100,100)),((i%12)*100,(i//12)*120));fd.text(((i%12)*100+2,(i//12)*120+100),str(i),fill='white')
    full.save(R/(name+'_AllFrames.png'))
contact.save(R/'PlaybackContactSheet.png')
print(json.dumps({'sourceFiles':len(assets),'unityCatalogAssets':len(catalog['assets']),'technicalErrors':technical['errors'],'play':play,'integrity':proof,'scene':str(T/scene)},ensure_ascii=True,indent=2))
