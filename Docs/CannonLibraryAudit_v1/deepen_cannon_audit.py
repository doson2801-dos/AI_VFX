import pathlib,json,re,hashlib,collections
P=pathlib.Path('D:/Projects/animlibrary'); O=pathlib.Path(__file__).parent
gm=json.loads((O/'GuidIndex.json').read_text(encoding='utf-8'))
names=['VFX_Cannon_Shoot','VFX_Cannon_Impact_InUse']
stream_names=['Position','Normal','Tangent','Color','UV','UV2','UV3','UV4','AnimBlend','AnimFrame','Center','VertexID','SizeX','SizeXY','SizeXYZ','Rotation','Rotation3D','RotationSpeed','RotationSpeed3D','Velocity','Speed','AgePercent','InvStartLifetime','StableRandomX','StableRandomXY','StableRandomXYZ','StableRandomXYZW','VaryingRandomX','VaryingRandomXY','VaryingRandomXYZ','VaryingRandomXYZW','Custom1X','Custom1XY','Custom1XYZ','Custom1XYZW','Custom2X','Custom2XY','Custom2XYZ','Custom2XYZW']
def scalar(t,k,indent=2):
    m=re.search(r'^'+' '*indent+re.escape(k)+r': (.*)$',t,re.M)
    return m[1] if m else None
def fid(t,k):
    v=scalar(t,k) or ''; m=re.search(r'fileID: (-?\d+)',v); return m[1] if m else None
def guid_of(p):
    m=re.search(r'^guid: (\w+)',(P/(p+'.meta')).read_text(encoding='utf-8-sig'),re.M)
    return m[1] if m else None
def section(t,k):
    m=re.search(r'^  '+re.escape(k)+r':\n([\s\S]*?)(?=^  [A-Za-z]|\Z)',t,re.M); return m[1] if m else ''
prefabs=[]; material_guids=set()
for name in names:
    path='Assets/VFX_Library/VFX/Gameplay/RPG/'+name+'.prefab'; t=(P/path).read_text(encoding='utf-8-sig')
    blocks={}
    for b in re.split(r'^--- !u!',t,flags=re.M)[1:]:
        head,_,body=b.partition('\n'); cls,local=head.split(' &'); blocks[local]={'class':cls,'body':body}
    gos={k:{'name':scalar(v['body'],'m_Name'),'active':scalar(v['body'],'m_IsActive')} for k,v in blocks.items() if v['class']=='1'}
    systems={fid(v['body'],'m_GameObject'):v['body'] for v in blocks.values() if v['class']=='198'}
    renders=[]
    for k,v in blocks.items():
        if v['class']!='199': continue
        body=v['body']; go=fid(body,'m_GameObject'); ps=systems.get(go,''); matsec=section(body,'m_Materials')
        mats=re.findall(r'guid: ([a-f0-9]{32})',matsec); material_guids.update(g for g in mats if not g.startswith('00000000'))
        raw=scalar(body,'m_VertexStreams') or ''; streams=[int.from_bytes(bytes.fromhex(raw[i:i+8]),'little') for i in range(0,len(raw),8)] if len(raw)%8==0 else []
        # Unity serializes byte vector as bytes, not Int32; each byte is the enum value.
        streams=list(bytes.fromhex(raw)) if raw else []
        render={'object':gos.get(go,{}),'rendererEnabled':scalar(body,'m_Enabled'),'mode':scalar(body,'m_RenderMode'),'useCustomStreams':scalar(body,'m_UseCustomVertexStreams'),'streamBytes':raw,'streams':[stream_names[n] if n<len(stream_names) else str(n) for n in streams],'materials':[{'guid':g,'path':gm.get(g)} for g in mats],'customDataEnabled':scalar(section(ps,'CustomDataModule'),'enabled',4),'customDataModes':{q:scalar(section(ps,'CustomDataModule'),q,4) for q in ['mode0','mode1','vectorComponentCount0','vectorComponentCount1']},'textureSheetEnabled':scalar(section(ps,'UVModule'),'enabled',4)}
        renders.append(render)
    prefabs.append({'path':path,'guid':guid_of(path),'renderers':renders})
materials=[]
for g in sorted(material_guids):
    path=gm.get(g)
    if not path: continue
    t=(P/path).read_text(encoding='utf-8-sig'); m=re.search(r'm_Shader: \{fileID: (-?\d+), guid: ([a-f0-9]{32})',t)
    shader={'fileID':m[1],'guid':m[2],'path':gm.get(m[2])} if m else None
    props={k:v for k,v in re.findall(r'^    - (\w+): (.+)$',t,re.M)}
    materials.append({'path':path,'guid':g,'shader':shader,'properties':props,'keywords':re.findall(r'm_(?:Valid|Invalid)Keywords:[\s\S]*?(?=\n  m_)',t),'textures':[{'property':k,'guid':gg,'path':gm.get(gg)} for k,gg in re.findall(r'    - (\w+):\s*\n        m_Texture: \{fileID: \d+, guid: ([a-f0-9]{32})',t)]})
# ShaderGraph stores concatenated JSON objects; distinguish active targets from stale object records.
graphpath='Assets/VFX_Library/Shaders/UberFXSG.shadergraph'; graph=(P/graphpath).read_text(encoding='utf-8-sig'); decoder=json.JSONDecoder(); pos=0; objs=[]
while pos<len(graph):
    while pos<len(graph) and graph[pos].isspace(): pos+=1
    if pos>=len(graph): break
    obj,pos=decoder.raw_decode(graph,pos); objs.append(obj)
byid={o.get('m_ObjectId'):o for o in objs}; root=objs[0]
active=[byid.get(x['m_Id'],{}).get('m_Type') for x in root.get('m_ActiveTargets',[])]
result={'target':'D:/Game_prj/VFX_LIb','targetPipeline':'Built-in selected by user','evidence':'Source analysis; stream enum names read by reflection from Unity 2022.3.62f3 ParticleSystemModule.dll; not loaded prefab/runtime validation','prefabs':prefabs,'materials':materials,'graph':{'path':graphpath,'activeTargetTypes':active,'graphObjectCount':len(objs)},'limitations':['Built-in shader fileIDs still require Unity resolution.','Graph-to-UberFX.shader is a proposed variant, not proven equivalent.','Target Unity lockfile exists; no second batch editor started.']}
(O/'CannonDeepAudit_v2.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Kiểm tra kỹ thuật Cannon — v2','','Project đích người dùng đã chọn: `D:/Game_prj/VFX_LIb`, Built-in.','', 'Đọc source và reflection enum từ DLL Unity 2022.3.62f3; chưa load prefab trong Unity. Không chạy batch thứ hai vì target có UnityLockfile.','']
for a in prefabs:
    lines+=['## '+pathlib.PurePosixPath(a['path']).stem,'','| Object | Active / renderer | Mode | Streams serialized | Material |','|---|---|---|---|---|']
    for r in a['renderers']:
        lines+=['| '+str(r['object'].get('name'))+' | '+str(r['object'].get('active'))+' / '+str(r['rendererEnabled'])+' | '+str(r['mode'])+' | '+', '.join(r['streams'])+' | '+'; '.join(str(m['path']) for m in r['materials'])+' |']
lines+=['','## ShaderGraph active targets','']+['- '+str(t) for t in active]+['','Không chỉ thấy tên type trong file: các target trên được lần từ m_ActiveTargets của GraphData. Có Built-in target vẫn cần package Shader Graph, không đồng nghĩa project đích hiện import được.','','## Material và shader đang tham chiếu','', '| Material GUID / path | Shader source | Các giá trị có liên quan |','|---|---|---|']
keys=['_MainAlphaChannel','_DetailDisolveChannel','_UseAlphaOverride','_UseUVOffset','_DisableErosion','_SrcBlend','_DstBlend','_CustomOpacityStrength','_CustomOffsetCenter','_UseDissolve','_UseSP']
for m in materials:
    lines+=['| '+m['guid']+' / '+m['path']+' | '+str(m['shader'])+' | '+'; '.join(k+'='+m['properties'][k] for k in keys if k in m['properties'])+' |']
lines+=['','## Packing cần giữ','', '- `UV, UV2, Custom1XYZW`: UV + UV2 chiếm TEXCOORD0.xyzw; Custom1 đi TEXCOORD1.xyzw. Cần đối chiếu thứ tự thực sau import.','- `UV, Custom1XYZW, Custom2X`: thứ tự compact dự kiến UV ở TEXCOORD0.xy, Custom1.xy ở TEXCOORD0.zw, Custom1.zw và Custom2.x ở TEXCOORD1.xyz. Chỉ tương ứng khi renderer thực giữ các streams đó.','- Shader scroll_XY_Base đọc offset XY, opacity Z, progress W từ TEXCOORD1. Shader còn nhân vertex alpha hai lần và lấy brightness từ RGB; đây là hành vi source cần giữ/đánh giá, không tự sửa shader dùng chung.','- UberFX.shader đọc UV0.z để boost màu, UV0.w để erosion; TEXCOORD1 phục vụ offset và các nhánh khác. Không thay UV2/Custom Data tùy tiện.','- CFXR .cfxrshader cần ScriptedImporter và include cginc. Catalog v1 chỉ lần GUID đã bỏ sót dependency đường dẫn #include; v2 bổ sung rõ trong asset plan.','- CFXR Editor.asmdef nguồn tham chiếu Spine; không nhập nguyên folder Editor/asmdef cho một shader. Importer standalone dùng UnityEditor/UnityEngine, nhưng vẫn phải compile/test trong project đích sau duyệt plan.','']
(O/'CannonDeepAudit_v2.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'activeTargets':active,'materials':[(m['guid'],m['path'],m['shader']) for m in materials]},indent=2))
