import pathlib,json,uuid,hashlib,shutil
O=pathlib.Path(__file__).parent;T=O.parents[1];S=pathlib.Path('D:/Projects/animlibrary');V=O/'UnityValidation'
p=O/'AssetPlan_v2_Delta1_Pending.json';d=json.loads(p.read_text(encoding='utf-8'));a=json.loads((O/'AssetInventory_v2_Approved.json').read_text(encoding='utf-8'))
mapping={x['sourceGuid']:x['targetGuid'] for x in a['assets']};mapping.update({x['sourceGuid']:uuid.uuid4().hex for x in d['assets']})
def remap(t):
    for old,new in mapping.items():t=t.replace(old,new)
    return t
for x in d['assets']:
    f=S/x['source'];target=T/x['destination']
    if hashlib.sha256(f.read_bytes()).hexdigest()!=x['sha256']:raise RuntimeError('Changed source '+str(f))
    if target.exists():raise RuntimeError('Delta output exists '+str(target))
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text(remap(f.read_text(encoding='utf-8-sig')),encoding='utf-8')
    pathlib.Path(str(target)+'.meta').write_text(remap(pathlib.Path(str(f)+'.meta').read_text(encoding='utf-8-sig')),encoding='utf-8')
    x['targetGuid']=mapping[x['sourceGuid']]
    for f2 in [target,pathlib.Path(str(target)+'.meta')]:shutil.copyfile(f2,V/f2.relative_to(T))
graphrel='Assets/CannonVFX_LibraryReuse_v1/Sources/Shaders/UberFXSG.shadergraph'
for project in [T,V]:
    f=project/graphrel;f.write_text(remap(f.read_text(encoding='utf-8')),encoding='utf-8')
d['approved']=True;d['approvalEvidence']='User explicitly selected D01-D04 approval in response to Delta1 question, 2026-10-17.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
md=O/'AssetPlan_v2_Delta1_Pending.md';text=md.read_text(encoding='utf-8').replace('**CHƯA DUYỆT PHẦN BỔ SUNG.**','**ĐÃ DUYỆT D01–D04.** Người dùng chọn rõ “Duyệt bổ sung D01–D04” ngày 2026-10-17.').replace('Approval evidence: chưa có cho D01–D04. Không xin duyệt lại C01–C07.','Approval evidence: người dùng chọn “Duyệt bổ sung D01–D04” ngày 2026-10-17. Giữ phê duyệt C01–C07; chưa phải duyệt mỹ thuật runtime.')
md.write_text(text,encoding='utf-8')
old=O/'RuntimeValidation';arch=O/'Diagnostic_BeforeDelta1'
if arch.exists():raise RuntimeError('Diagnostic archive already exists')
old.rename(arch);old.mkdir()
print('Imported 4 approved SubGraphs, remapped copied graph; diagnostic outputs archived.')
