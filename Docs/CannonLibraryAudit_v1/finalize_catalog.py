import pathlib,json,re,hashlib,collections,html
from PIL import Image,ImageOps,ImageDraw
O=pathlib.Path(__file__).parent; P=pathlib.Path('D:/Projects/animlibrary')
data=json.loads((O/'Inventory.json').read_text(encoding='utf-8')); gm=json.loads((O/'GuidIndex.json').read_text(encoding='utf-8'))
names=['VFX_Cannon_Shoot','VFX_Cannon_Shoot_Scrab','VFX_Cannon_Impact','VFX_Cannon_Impact_InUse','VFX_Impact_Bomb','VFX_Trail_Missile','HCFX_Explosion_01']
candidates=[a for n in names for a in data['prefabs'] if pathlib.PurePosixPath(a['path']).stem==n]
deps={}; todo=[r['guid'] for a in candidates for r in a['directGuidReferences']]
while todo:
    g=todo.pop()
    if g in deps or g.startswith('00000000'): continue
    p=gm.get(g); entry={'guid':g,'path':p}; deps[g]=entry
    if not p: entry['status']='unresolved'; continue
    f=P/p
    if not f.is_file(): entry['status']='not a file'; continue
    entry['sourceSha256']=hashlib.sha256(f.read_bytes()).hexdigest(); ext=f.suffix.lower()
    if ext in ['.mat','.shader','.shadergraph','.prefab','.cs']:
        t=f.read_text(encoding='utf-8-sig',errors='replace')
        refs=sorted(set(re.findall(r'guid: ([a-f0-9]{32})',t))); entry['references']=refs; todo+=refs
        if ext=='.mat':
            entry['shaderReference']=next(iter(re.findall(r'm_Shader: (.+)',t)),None)
            entry['savedKeywordBlocks']=re.findall(r'  m_(?:Valid|Invalid)Keywords:[\s\S]*?(?=\n  \w)',t)
            entry['textureProperties']=[{'property':k,'guid':gg,'path':gm.get(gg)} for k,gg in re.findall(r'    - (\w+):\s*\n        m_Texture: \{fileID: \d+, guid: ([a-f0-9]{32})',t)]
            entry['warning']='Saved properties/keywords are not proof of active shader branches; built-in IDs require Unity resolution.'
        elif ext=='.shadergraph': entry['warning']='Graph source identified; graph wiring and compiled channel behavior not verified.'
        elif ext=='.shader': entry['sourceChannelLines']=[{'line':i+1,'text':line.strip()} for i,line in enumerate(t.splitlines()) if any(k in line for k in ['tex2D','SAMPLE_TEXTURE','Blend ','RenderPipeline','return ','clip('])]
    if ext in ['.png','.tga','.jpg','.psd']:
        try:
            im=Image.open(f); entry['pixels']={'mode':im.mode,'size':im.size,'extrema':im.getextrema()}
        except Exception as e: entry['pixelError']=str(e)
(O/'CandidateDependencies.json').write_text(json.dumps(list(deps.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(O/'CannonCandidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8')
textures=[a for a in deps.values() if a.get('pixels')][:16]
sheet=Image.new('RGB',(1000,160*len(textures)),(35,35,40)); draw=ImageDraw.Draw(sheet)
for row,a in enumerate(textures):
    im=Image.open(P/a['path']).convert('RGBA')
    draw.text((5,row*160),pathlib.PurePosixPath(a['path']).name+' | '+str(a['pixels']['size']),fill='white')
    rgb=Image.new('RGBA',im.size,(0,0,0,255)); rgb.alpha_composite(im)
    for col,channel in enumerate([rgb.convert('RGB'),im.getchannel('R'),im.getchannel('G'),im.getchannel('B'),im.getchannel('A')]):
        tile=ImageOps.contain(channel.convert('RGB'),(180,125)); sheet.paste(tile,(col*200,row*160+20)); draw.text((col*200+5,row*160+145),['RGBA on black','R','G','B','A'][col],fill='white')
sheet.save(O/'TextureChannels.png')
remaining=[a for a in deps.values() if a.get('pixels')][16:]
sheet2=Image.new('RGB',(1000,160*len(remaining)),(35,35,40)); draw2=ImageDraw.Draw(sheet2)
for row,a in enumerate(remaining):
    im=Image.open(P/a['path']).convert('RGBA'); draw2.text((5,row*160),pathlib.PurePosixPath(a['path']).name+' | '+str(a['pixels']['size']),fill='white')
    rgb=Image.new('RGBA',im.size,(0,0,0,255)); rgb.alpha_composite(im)
    for col,channel in enumerate([rgb.convert('RGB'),im.getchannel('R'),im.getchannel('G'),im.getchannel('B'),im.getchannel('A')]):
        sheet2.paste(ImageOps.contain(channel.convert('RGB'),(180,125)),(col*200,row*160+20)); draw2.text((col*200+5,row*160+145),['RGBA on black','R','G','B','A'][col],fill='white')
sheet2.save(O/'TextureChannels_RPG.png')
lines=['# Cannon candidates — dữ kiện từ YAML','', 'Chưa load Unity thành công; tên module và stream dưới đây là serialized source, chưa kiểm chứng runtime.','']
for a in candidates:
    lines+=['## '+pathlib.PurePosixPath(a['path']).stem,'','- Path: `'+a['path']+'`','- GUID: `'+str(a['guid'])+'`','- SHA256: `'+a['sha256']+'`',f"- Particle systems serialized: {a['particleSystemsSerialized']}; MonoBehaviour: {a['monoBehavioursSerialized']}; nested prefab instances: {a['nestedPrefabInstances']}",'','| Object | Duration/loop/space | Modules enabled |','|---|---|---|']
    objects={c['fileId']:c for c in a['components'] if c['classId']=='1'}
    for c in a['components']:
        if c['classId']!='198': continue
        go=re.search(r'fileID: (\d+)',c['particleFacts'].get('gameObject') or c.get('gameObject') or '')
        obj=objects.get(go[1],{}).get('name','?') if go else '?'
        lines+=['| '+obj+' | '+str(c['particleFacts'])+' | '+', '.join(k for k,v in c['modules'].items() if v)+' |']
    lines+=['','### Direct references','']+[f"- `{r['guid']}` → `{r['path']}` ({r['status']})" for r in a['directGuidReferences']]+['']
(O/'CandidateTechnicalFacts.md').write_text('\n'.join(lines),encoding='utf-8')
rows=''.join('<tr><td>'+html.escape(a['path'])+'</td><td>'+str(a['particleSystemsSerialized'])+'</td><td>'+str(a['monoBehavioursSerialized'])+'</td><td>'+html.escape(', '.join(a['candidateTags']))+'</td><td>'+str(a['guid'])+'</td></tr>' for a in data['prefabs'])
page='''<!doctype html><meta charset="utf-8"><title>VFX Catalog v1</title><style>body{background:#141820;color:#e7ecf5;font:15px system-ui;margin:30px}input{padding:12px;width:600px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{text-align:left;padding:9px;border-bottom:1px solid #394352}td:first-child{max-width:650px;overflow-wrap:anywhere}th{position:sticky;top:0;background:#253044}</style><h1>VFX Library — catalog v1</h1><p>827 prefab · filename tags là candidate · audit Unity bị lỗi compile, chưa xác nhận runtime/pipeline.</p><input id="q" placeholder="Lọc theo pack, tên, GUID hoặc tag…"><p id="count"></p><table><thead><tr><th>Prefab</th><th>PS trong YAML</th><th>MonoBehaviour trong YAML</th><th>Candidate tags</th><th>GUID</th></tr></thead><tbody>'''+rows+'''</tbody></table><script>const rows=[...document.querySelectorAll('tbody tr')];function filter(){let n=0;for(const r of rows){let ok=r.textContent.toLowerCase().includes(q.value.toLowerCase());r.hidden=!ok;if(ok)n++}count.textContent=n+' prefab'}q.oninput=filter;filter()</script>'''
(O/'Catalog.html').write_text(page,encoding='utf-8')
print(json.dumps({'candidates':[(pathlib.PurePosixPath(a['path']).stem,a['guid'],a['particleSystemsSerialized'],a['monoBehavioursSerialized']) for a in candidates],'dependencies':len(deps),'sourceTextures':len(textures),'packs':data['summary']['prefabsByPack'],'errors':len(data['summary']['errors'])},indent=2))
