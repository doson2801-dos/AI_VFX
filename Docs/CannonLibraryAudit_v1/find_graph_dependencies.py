import pathlib,json,re,hashlib
O=pathlib.Path(__file__).parent;S=pathlib.Path('D:/Projects/animlibrary')
gm=json.loads((O/'GuidIndex.json').read_text(encoding='utf-8'));plan=json.loads((O/'AssetInventory_v2_Approved.json').read_text(encoding='utf-8'))
existing={a['source'] for a in plan['assets']};seen=set();todo=['Assets/VFX_Library/Shaders/UberFXSG.shadergraph'];extra=[];unresolved=set()
def scan_json(v):
    result=set()
    if isinstance(v,dict):
        for k,x in v.items():
            if k.lower() in ['guid','m_guid'] and isinstance(x,str) and re.fullmatch('[a-f0-9]{32}',x):result.add(x)
            result.update(scan_json(x))
    elif isinstance(v,list):
        for x in v:result.update(scan_json(x))
    elif isinstance(v,str) and v.lstrip().startswith(('{','[')):
        try:result.update(scan_json(json.loads(v)))
        except (ValueError,RecursionError):pass
    return result
while todo:
    p=todo.pop()
    if p in seen:continue
    seen.add(p);f=S/p;t=f.read_text(encoding='utf-8-sig');refs=set(re.findall(r'guid: ([a-f0-9]{32})',t))
    dec=json.JSONDecoder();pos=0
    while pos<len(t):
        while pos<len(t) and t[pos].isspace():pos+=1
        if pos>=len(t):break
        try:v,pos=dec.raw_decode(t,pos);refs.update(scan_json(v))
        except ValueError:break
    for g in refs:
        if g.startswith('00000000'):continue
        path=gm.get(g)
        if path:
            if path not in existing and path not in {a['source'] for a in extra}:
                extra.append({'source':path,'sourceGuid':g,'sha256':hashlib.sha256((S/path).read_bytes()).hexdigest(),'destination':'Assets/CannonVFX_LibraryReuse_v1/Sources/'+path.removeprefix('Assets/VFX_Library/'),'operation':'reuse-copy-with-guid-remap','reason':'ShaderGraph dependency serialized inside JSON string, missed by initial GUID-only scanner.'})
            if pathlib.Path(path).suffix.lower() in ['.shadergraph','.shadersubgraph']:todo.append(path)
        else:unresolved.add(g)
result={'planVersion':'v2-delta1','approved':False,'parentPlanApproved':True,'reason':'Unity import reported missing Shader SubGraphs. Parent C01-C07 approval remains valid.','assets':sorted(extra,key=lambda a:a['source']),'unresolved':sorted(unresolved)}
(O/'AssetPlan_v2_Delta1_Pending.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True,indent=2))
