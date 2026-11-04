using UnityEngine;

namespace VfxKit
{
    /// <summary>Put on an effect placed under VFX_Instances: category and name shown in the showcase list. Without it the effect is listed under "Scene" with its GameObject name.</summary>
    public class VfxShowcaseTag : MonoBehaviour
    {
        public string category;
        public string displayName;
    }
}
