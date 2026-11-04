import pathlib,json,hashlib,re,uuid,shutil,datetime
O=pathlib.Path(__file__).parent; T=O.parents[1]; S=pathlib.Path('D:/Projects/animlibrary')
plan=json.loads((O/'AssetInventory_v2_Pending.json').read_text(encoding='utf-8'))
approval={'planVersion':'v2','scope':'C01-C07','approved':True,'evidence':'User replied "ok tiếp đi" after the displayed Asset Plan v2 approval request, 2026-10-17.','recordedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
target=T/plan['outputRoot']; stage=O/'ImportStaging_v2'
if target.exists() or stage.exists(): raise RuntimeError('Output/staging already exists; inspect state before repeating import.')
for a in plan['assets']:
    if hashlib.sha256((S/a['source']).read_bytes()).hexdigest()!=a['sha256']: raise RuntimeError('Source changed: '+a['source'])
mapping={a['sourceGuid']:uuid.uuid4().hex for a in plan['assets'] if a['sourceGuid']}
def remap(t):
    for old,new in mapping.items(): t=t.replace(old,new)
    return t
def trim_material_metadata(t):
    chunks=re.split(r'(?=^--- !u!)',t,flags=re.M); kept=[]
    for c in chunks:
        if c.startswith('--- !u!114') and 'm_GameObject: {fileID: 0}' in c and any(g in c for g in ['d0353a89b1f911e48b9e16bdc9f2e058','da692e001514ec24dbc4cca1949ff7e8']): continue
        kept.append(c)
    return ''.join(kept)
texttypes={'.mat','.prefab','.shader','.shadergraph','.shadersubgraph','.cfxrshader','.cs','.cginc','.hlsl'}
records=[]; stage.mkdir()
for a in plan['assets']:
    rel=pathlib.PurePosixPath(a['destination']).relative_to(pathlib.PurePosixPath(plan['outputRoot']))
    d=stage/rel; d.parent.mkdir(parents=True,exist_ok=True); s=S/a['source']
    if s.suffix.lower() in texttypes:
        text=s.read_text(encoding='utf-8-sig')
        if s.suffix.lower()=='.mat': text=trim_material_metadata(text)
        d.write_text(remap(text),encoding='utf-8',newline='\n')
    else: shutil.copyfile(s,d)
    if s.suffix.lower()=='.cfxrshader':
        importer=mapping['fe56ec25963759b49955809beeb4324b']
        meta=f'fileFormatVersion: 2\nguid: {mapping[a["sourceGuid"]]}\nScriptedImporter:\n  internalIDToNameTable: []\n  externalObjects: {{}}\n  serializedVersion: 2\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n  script: {{fileID: 11500000, guid: {importer}, type: 3}}\n  renderPipelineDetection: 1\n'
    else: meta=remap(pathlib.Path(str(s)+'.meta').read_text(encoding='utf-8-sig'))
    pathlib.Path(str(d)+'.meta').write_text(meta,encoding='utf-8',newline='\n')
    records.append({**a,'targetGuid':mapping.get(a['sourceGuid']),'importedSourceSha256':hashlib.sha256(d.read_bytes()).hexdigest()})
for p in ['ProjectSettings/GraphicsSettings.asset','ProjectSettings/QualitySettings.asset','Packages/manifest.json','Packages/packages-lock.json']:
    f=T/p
    if f.exists(): shutil.copyfile(f,O/('Before_'+f.name))
manifestpath=T/'Packages/manifest.json'; manifest=json.loads(manifestpath.read_text(encoding='utf-8-sig'))
manifest['dependencies']['com.unity.shadergraph']='14.0.12'
manifestpath.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
target.parent.mkdir(parents=True,exist_ok=True); stage.rename(target)
plan.update({'approved':True,'approvalEvidence':approval['evidence'],'assets':records})
(O/'AssetInventory_v2_Approved.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(O/'Approval_v2.json').write_text(json.dumps(approval,ensure_ascii=False,indent=2),encoding='utf-8')
md=O/'AssetPlan_v2_Pending.md'; text=md.read_text(encoding='utf-8').replace('**CHƯA DUYỆT.**','**ĐÃ DUYỆT C01–C07** — người dùng trả lời “ok tiếp đi” ngày 2026-10-17 sau yêu cầu duyệt Asset Plan v2. Tên file giữ nguyên để bảo toàn link.')
text=text.replace('Approval evidence: **chưa có**. “Tiếp tục” và lựa chọn project đích trước khi bảng này được hiển thị không tự phê duyệt khoản package/33 assets chưa trình lúc đó.','Approval evidence: người dùng trả lời **“ok tiếp đi”** sau yêu cầu duyệt Asset Plan v2, ngày 2026-10-17. Thay trạng thái chưa duyệt trước đó; không phê duyệt mỹ thuật runtime hoặc thay đổi ngoài C01–C07.')
md.write_text(text,encoding='utf-8')
print(json.dumps({'copied':len(records),'output':str(target),'guidRemaps':len(mapping),'shaderGraphRequested':'14.0.12','approval':approval},ensure_ascii=True))
