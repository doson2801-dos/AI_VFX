import json,pathlib,re,hashlib,collections
P=pathlib.Path('D:/Projects/animlibrary'); O=pathlib.Path(__file__).parent
gm=json.loads((O/'GuidIndex.json').read_text(encoding='utf-8')); reverse={p:g for g,p in gm.items()}
root='Assets/CannonVFX_LibraryReuse_v1/'
initial=['Assets/VFX_Library/VFX/Gameplay/RPG/VFX_Cannon_Shoot.prefab','Assets/VFX_Library/VFX/Gameplay/RPG/VFX_Cannon_Impact_InUse.prefab','Assets/VFX_Library/Editor/CFXR_ShaderImporter.cs']
todo=initial[:]; seen={}; unresolved=set(); external=[]
texttypes={'.prefab','.mat','.shader','.shadergraph','.shadersubgraph','.cfxrshader','.cginc','.hlsl'}
while todo:
    p=todo.pop()
    if p in seen: continue
    f=P/p
    if not f.is_file(): external.append(p); continue
    ext=f.suffix.lower()
    if ext=='.cs' and p!=initial[-1]: continue
    target=root+'Sources/'+p.removeprefix('Assets/VFX_Library/')
    e={'source':p,'sourceGuid':reverse.get(p),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'destination':target,'operation':'reuse-copy-with-new-guid-and-reference-remap','modifications':'No visual/timing/module changes; references remapped to copied assets.'}
    if ext=='.cs': e['destination']=root+'Editor/CFXR_ShaderImporter.cs';e['operation']='reuse-editor-importer-only'
    if ext=='.shadergraph':
        e['operation']='reuse-or-variant-builtin-active-target-only-if-import-requires'
        e['modifications']='Remap references. If missing URP/HDRP targets block import, restrict active target to existing Built-in target on copy only; preserve nodes/properties/channels.'
    if ext=='.mat':
        e['modifications']='Remap references. Remove only unresolvable Editor material version metadata subassets without GameObject; preserve visual properties/keywords and prefab components.'
    seen[p]=e
    if ext not in texttypes: continue
    t=f.read_text(encoding='utf-8-sig',errors='replace')
    guids=set(re.findall(r'guid: ([a-f0-9]{32})',t)+re.findall(r'"(?:m_Guid|guid)"\s*:\s*"([a-f0-9]{32})"',t))
    for g in guids:
        if g.startswith('00000000'): continue
        source=gm.get(g)
        if source: todo.append(source)
        else: unresolved.add(g)
    for include in re.findall(r'#include\s+"([^"]+)"',t):
        local=(f.parent/include)
        if local.is_file(): todo.append(local.relative_to(P).as_posix())
        elif include.startswith('Packages/'): external.append(include)
manifest={'kind':'asset-plan-inventory-not-builder-manifest','planVersion':'v2','approved':False,'approvalEvidence':None,'targetProject':'D:/Game_prj/VFX_LIb','pipeline':'Built-in','sourcePrefabs':initial[:2],'outputRoot':root,'packagesProposed':{'com.unity.shadergraph':'14.0.12'},'transitivePackagesFromInspectedManifests':{'com.unity.render-pipelines.core':'14.0.12','com.unity.searcher':'4.9.2'},'excluded':['URP pipeline package','HDRP package','CFXR source asmdef and its Spine references','CFXR runtime controllers','Other VFX/preview JPEG/unitypackage files'],'unresolvedGuidReferences':sorted(unresolved),'packageIncludeReferences':sorted(set(external)),'assets':sorted(seen.values(),key=lambda x:x['source'])}
(O/'AssetInventory_v2_Pending.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Danh mục asset cụ thể cho Asset Plan v2','','CHƯA DUYỆT; bảng này mô tả thay đổi dự kiến, chưa copy tài nguyên vào Assets. Root đích `Assets/CannonVFX_LibraryReuse_v1/`.','', '| Source | GUID | Operation | Destination | Source SHA256 |','|---|---|---|---|---|']
for e in manifest['assets']: lines+=['| '+e['source']+' | '+str(e['sourceGuid'])+' | '+e['operation']+' | '+e['destination']+' | '+e['sha256']+' |']
(O/'AssetInventory_v2_Pending.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'assetCount':len(seen),'byExtension':dict(collections.Counter(pathlib.Path(p).suffix for p in seen)),'unresolved':sorted(unresolved),'includes':sorted(set(external))},indent=2))
