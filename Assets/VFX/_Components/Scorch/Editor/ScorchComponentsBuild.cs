#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using static VfxKit.VfxBuildKit;

namespace VfxEffects
{
    // Component 06 - Scorch. Spec: Docs/VFX/_ArtDirection/components/06_Scorch.md
    // Style C Burn + Cracks (art lead 2026-11-02), made with codefx (/vfx-maker mode C):
    //   Docs/VFX/_ArtDirection/components/codefx/scorch.py --opts {"style":"both"} -> Textures/T_CFX_Scorch_Body/Light_4x4.png + CFX_Scorch.json
    // Ground only: lies flat (Billboard + Render Alignment Local, from json space.plane = ground), sorting -2 (under Dust -1).
    public static class ScorchComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Scorch";
        const string DocsRoot = "Docs/VFX/_Components/Scorch";

        [MenuItem("VFX/Components/Scorch - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            CodeFxComponentsBuild.MakeFlipbook(Root, DocsRoot, "SCR_Ground_01", "CFX_Scorch", -9,
                Load("Impact/Prefabs/CMP_IMP_Hit_Ground_01"), Load("Glow/Prefabs/CMP_GLW_Ground_01"),
                Load("Ring/Prefabs/CMP_RNG_Ground_01"), Load("Sparks/Prefabs/CMP_SPK_Ground_01"), Load("Dust/Prefabs/CMP_DST_Ground_01"));
            AssetDatabase.SaveAssets();
            Debug.Log("[Scorch] components built OK");
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
