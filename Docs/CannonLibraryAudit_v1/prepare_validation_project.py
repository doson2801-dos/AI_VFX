import pathlib,shutil,uuid,json
O=pathlib.Path(__file__).parent; T=O.parents[1]; V=O/'UnityValidation'
if V.exists(): raise RuntimeError('Validation project already exists; do not reset it blindly.')
root=T/'Assets/CannonVFX_LibraryReuse_v1'
for p in root.rglob('*.cs'):
    meta=pathlib.Path(str(p)+'.meta')
    if not meta.exists(): meta.write_text('fileFormatVersion: 2\nguid: '+uuid.uuid4().hex+'\nMonoImporter:\n  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n  executionOrder: 0\n  icon: {instanceID: 0}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n',encoding='utf-8')
V.mkdir();(V/'Assets').mkdir()
shutil.copytree(root,V/'Assets/CannonVFX_LibraryReuse_v1')
shutil.copytree(T/'ProjectSettings',V/'ProjectSettings')
shutil.copytree(T/'Packages',V/'Packages')
(O/'ValidationProjectContext.json').write_text(json.dumps({'project':str(V),'targetEditorOpen':True,'reason':'Separate Unity editor process does not touch the scene open in the target project. Approved sources, script GUIDs and Built-in project settings mirrored for validation.','outputRoot':'Assets/CannonVFX_LibraryReuse_v1','target':str(T)},indent=2),encoding='utf-8')
print(str(V))
