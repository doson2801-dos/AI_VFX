import pathlib,json,re,hashlib
O=pathlib.Path(__file__).parent;T=O.parents[1]
statuspath=O/'AuditStatus.json';s=json.loads(statuspath.read_text(encoding='utf-8'))
s.update({'runtimeAssetsCreatedOrIntentionallyModified':True,'runtimeLifecycleValidated':True,'assetPlanApproved':True,'approvedAdditionalPlan':'v2-delta1 D01-D04','sourceAssetFilesImported':37,'runtimeTargetVerifiedViaIsolatedCopy':True,'importedUnityCatalog':'RuntimeValidation/UnityImportedCatalog.json','importedAuditComplete':True,'importedAuditAssetCount':36,'importedUnityDependencyHashesAvailable':True,'fullSourceUnityAuditStillBlocked':True,'fullSourceUnityAuditNote':'The original animlibrary full audit remains blocked by UI Particle compile errors. Imported scope of 2 prefabs + source dependencies was audited in Built-in validation clone.','validationReport':'RuntimeValidation/ValidationReport.md','runtimeVisualApproval':False,'knownVisualIssue':'Impact contains a solid brown curved mesh; preserved from source, not artistically approved.','executedManifest':'BuildManifest_v2_Executed.json'})
statuspath.write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
manifest=json.loads((O/'BuildManifest_v2_Executed.json').read_text(encoding='utf-8'));cat=json.loads((O/'RuntimeValidation/UnityImportedCatalog.json').read_text(encoding='utf-8'))
facts={a['path']:a for a in cat['assets']};overlay=[]
for a in manifest['assets']:
    if a['source'].endswith('.prefab'):
        x=facts[a['destination']];overlay.append({'sourcePath':a['source'],'sourceGuid':a['sourceGuid'],'targetPath':a['destination'],'targetGuid':a['targetGuid'],'targetDependencyHash':x['dependencyHash'],'unity':'2022.3.62f3','pipeline':'Built-in','actualPlayModeValidated':True,'artApproved':False,'validationProject':manifest['validationProject'],'report':'RuntimeValidation/ValidationReport.md'})
(O/'CatalogVerificationOverlay_v2.json').write_text(json.dumps(overlay,ensure_ascii=False,indent=2),encoding='utf-8')
htmlpath=O/'Catalog.html';page=htmlpath.read_text(encoding='utf-8')
if '<th>Verification</th>' not in page:
    page=page.replace('<th>GUID</th>','<th>GUID</th><th>Verification</th>')
    verified={a['sourceGuid'] for a in overlay}
    def row(m):
        txt=m[0];tag='File/YAML'
        if any(g in txt for g in verified):tag='Unity Built-in + Play mode (art pending)'
        return txt.replace('</tr>','<td>'+tag+'</td></tr>')
    page=re.sub(r'<tr><td>[\s\S]*?</tr>',row,page)
    page=page.replace('<input id="q"','<p>Update: 2 source prefabs verified as Built-in copies in actual Play mode. <a href="RuntimeValidation/ValidationReport.md">Runtime report</a>. Full source-library Unity audit is still incomplete.</p><input id="q"')
htmlpath.write_text(page,encoding='utf-8')
# Validate copied scene references point at the matching runtime demo script.
demo=T/'Assets/CannonVFX_LibraryReuse_v1/Demo/CannonLibraryReuseDemo.cs.meta'
scriptguid=re.search(r'^guid: (\w+)',demo.read_text(encoding='utf-8-sig'),re.M)[1]
scenerel='Assets/CannonVFX_LibraryReuse_v1/Scenes/CannonLibraryReuse_Demo.unity'
assert scriptguid in (T/scenerel).read_text(encoding='utf-8')
assert len(overlay)==2 and s['sourceAssetFilesImported']==37
for file in O.glob('*.json'):json.loads(file.read_text(encoding='utf-8'))
for file in (O/'RuntimeValidation').glob('*.json'):json.loads(file.read_text(encoding='utf-8'))
assert (T/scenerel).read_bytes()==(O/'UnityValidation'/scenerel).read_bytes()
print('Final status: 37 imported source files, 2 verified prefabs, matched scene/script refs, valid JSON and scoped catalog overlay.')
