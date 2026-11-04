import pathlib, re, json, hashlib, collections, datetime, csv, subprocess
P=pathlib.Path('D:/Projects/animlibrary')
R=P/'Assets/VFX_Library/VFX'
O=pathlib.Path(__file__).parent
errors=[]; records=[]; prefabs=[]
source_paths=[pathlib.Path(p) for p in subprocess.check_output(['rg','--files',str(R)],text=True,encoding='utf-8').splitlines()]
print('Inventory paths: '+str(len(source_paths)),flush=True)
for f in sorted(source_paths):
    if not f.is_file(): continue
    try:
        records.append({'path':f.relative_to(P).as_posix(),'extension':f.suffix.lower(),'bytes':f.stat().st_size})
        if f.suffix=='.prefab': prefabs.append(f)
    except Exception as e: errors.append({'path':str(f),'error':str(e)})
guidmap={}; duplicates=[]
meta_paths=[pathlib.Path(p) for p in subprocess.check_output(['rg','--files',str(P/'Assets'),'-g','*.meta','-g','!**/Preview/**','-g','!**/preview/**'],text=True,encoding='utf-8').splitlines()]
print('Dependency GUID metadata paths excluding preview: '+str(len(meta_paths)),flush=True)
for mi,m in enumerate(meta_paths):
    if mi%5000==0: print('GUID metadata '+str(mi),flush=True)
    try:
        match=re.search(r'^guid: ([a-f0-9]{32})',m.read_text(encoding='utf-8-sig',errors='replace'),re.M)
        if match:
            g=match[1]; path=m.with_suffix('').relative_to(P).as_posix()
            if g in guidmap and guidmap[g]!=path: duplicates.append({'guid':g,'paths':[guidmap[g],path]})
            guidmap[g]=path
    except Exception as e: errors.append({'path':str(m),'error':str(e)})
path_to_guid={p:g for g,p in guidmap.items()}
def scalar(t,key):
    m=re.search(r'^  '+re.escape(key)+r': (.+)$',t,re.M)
    return m[1] if m else None
def refs(t):
    return sorted(set(re.findall(r'guid: ([a-f0-9]{32})',t)))
for f in prefabs:
    try:
        t=f.read_text(encoding='utf-8-sig'); blocks=re.split(r'^--- !u!',t,flags=re.M)[1:]
        own=path_to_guid.get(f.relative_to(P).as_posix())
        components=[]
        for b in blocks:
            cid=b.split(' ',1)[0]; body=b.partition('\n')[2]
            item={'classId':cid,'fileId':b.splitlines()[0].split('&')[-1]}
            if cid=='198':
                item['particleFacts']={k:scalar(body,k) for k in ['lengthInSec','looping','playOnAwake','moveWithTransform','simulationSpeed','stopAction']}
                item['modules']={k:bool(int(v)) for k,v in re.findall(r'^  (\w+Module):\s*\n    (?:serializedVersion: \d+\s*\n    )?enabled: (\d+)',body,re.M)}
                item['gameObject']=scalar(body,'m_GameObject')
            elif cid=='199':
                item['rendererFacts']={k:scalar(body,k) for k in ['m_RenderMode','m_Enabled','m_UseCustomVertexStreams','m_VertexStreams']}
                item['refs']=refs(body)
            elif cid=='114': item['scriptRefs']=refs(body)
            elif cid=='1': item['name']=scalar(body,'m_Name'); item['active']=scalar(body,'m_IsActive')
            elif cid=='1001': item['refs']=refs(body)
            else: continue
            components.append(item)
        dependencies=[{'guid':g,'path':guidmap.get(g),'status':'resolved' if g in guidmap else 'unresolved-or-built-in'} for g in refs(t)]
        entry={'path':f.relative_to(P).as_posix(),'guid':own,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'components':components,'directGuidReferences':dependencies,'particleSystemsSerialized':sum(x['classId']=='198' for x in components),'monoBehavioursSerialized':sum(x['classId']=='114' for x in components),'nestedPrefabInstances':sum(x['classId']=='1001' for x in components),'candidateTags':[x for x in ['cannon','muzzle','flash','smoke','fire','explosion','impact','trail','projectile','dust','spark','poison','ice','slash','lightning'] if x in f.stem.lower()],'visualStatus':'not viewed; filename tags are candidates only'}
        records_entry=entry
        # Full serialized facts above are disk evidence, not loaded Unity module/graph behavior.
        if 'catalog' not in globals(): catalog=[]
        catalog.append(entry)
    except Exception as e: errors.append({'path':str(f),'error':str(e)})
counts=collections.Counter(x['extension'] for x in records)
packs=collections.Counter(pathlib.PurePosixPath(x['path']).parts[4] for x in records if x['extension']=='.prefab')
summary={'generatedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceProject':str(P),'roots':[str(R)],'mode':'filesystem YAML inventory, not Unity runtime validation','filesystemComplete':not errors,'unityComplete':False,'fileCountIncludingMeta':len(records),'extensionCounts':dict(counts),'prefabsByPack':dict(packs),'errors':errors,'duplicateGuids':duplicates,'dependencyHashNote':'sha256 is source file only, not Unity dependency hash','previewNote':'JPEG preview frames are not source textures; packages are not imported or internally audited'}
(O/'Inventory.json').write_text(json.dumps({'summary':summary,'files':records,'prefabs':catalog},ensure_ascii=False,indent=2),encoding='utf-8')
(O/'GuidIndex.json').write_text(json.dumps(guidmap,ensure_ascii=False),encoding='utf-8')
with (O/'Prefabs.csv').open('w',encoding='utf-8-sig',newline='') as h:
    w=csv.writer(h); w.writerow(['path','guid','particleSystemsSerialized','monoBehavioursSerialized','nestedPrefabInstances','candidateTags','sha256'])
    for a in catalog: w.writerow([a[k] if k!='candidateTags' else ';'.join(a[k]) for k in ['path','guid','particleSystemsSerialized','monoBehavioursSerialized','nestedPrefabInstances','candidateTags','sha256']])
(O/'Summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
