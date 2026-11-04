// SH_VFX_ErodeSphere — eroding lit smoke sphere (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: technique of Beyond-FX's "Zelda-inspired explosion" smoke (art lead reference 2026-11-04):
//   a sphere mesh per particle, an erosion mask read in VIEW space (its centre always faces the camera) or wrapped
//   on the sphere's own UVs (_MESH_UV: erosion leaves vertical strands), lumpy outline (_Lumps), ramp colour by
//   depth below the emissive threshold (_HeatRange),
//   alpha threshold eats it from the dark swirl outwards, a second threshold on the same mask drives the hot
//   emissive through a heat ramp, the mesh bulges out along its normals and the mask grows from the centre.
// Cost: 2 texture samples (mask + ramp), no expensive functions in the fragment (sin/cos for the per-particle
//   UV turn and the light term are in the vertex shader).
// Particle inputs (ParticleSystemRenderer.SetActiveVertexStreams, Mesh render mode):
//   Position, Normal, Color, UV, Custom1XYZW, StableRandomX, Center
//   -> TEXCOORD0.zw = Custom1.xy, TEXCOORD1.xy = Custom1.zw, TEXCOORD1.z = stable random,
//      TEXCOORD1.w + TEXCOORD2.xy = particle centre (world).
//   The sphere direction is (vertex - centre), not the mesh normal: low-poly / flat-shaded spheres would
//   otherwise sample one mask value per face (disco-ball look, found 2026-11-04 with SM_VFX_Sphere).
//   Custom1.x = alpha threshold 0..1 (0 = whole, 1 = gone)    Custom1.y = emissive threshold (1 = all hot, <=0 = cold)
//   Custom1.z = bulge 0..1                                     Custom1.w = normal (light/shadow) intensity 0..1
// Vertex color = smoke tint * alpha (Start Color, Color over Lifetime).
Shader "VFX/FX/Erode Sphere"
{
    Properties
    {
        _MainTex ("Erosion Mask (grey, linear; dark = eaten first)", 2D) = "white" {}
        _RampTex ("Heat Ramp (u = heat: 0 dark red -> 1 hottest)", 2D) = "white" {}
        _MaskScale ("Mask Scale On Sphere (view mode)", Range(0.5, 1.5)) = 1.0
        [Toggle(_MESH_UV)] _UseMeshUV ("Mask On Mesh UV (wraps the sphere; mask must use Repeat)", Float) = 0
        _MaskTiling ("Mask Tiling (mesh UV mode)", Vector) = (1, 1, 0, 0)
        _Soft ("Erosion Edge Softness", Range(0.005, 0.3)) = 0.06
        _RimIn ("Erode Rim First (0 = mask only, centre out; 1 = silhouette in)", Range(0, 1)) = 0.8
        _EmisSoft ("Emissive Band Width", Range(0.02, 0.6)) = 0.25
        _EmisBoost ("Emissive Brightness", Range(0.5, 3)) = 1.4
        _HeatRange ("Heat Depth Range (mask units below the threshold to reach the hottest colour)", Range(0.05, 1)) = 0.5
        _BulgeAmount ("Vertex Bulge (object units at Custom1.z = 1)", Range(0, 0.5)) = 0.12
        _Lumps ("Lumpy Silhouette (fraction of the radius)", Range(0, 0.4)) = 0
        _LumpFreq ("Lump Frequency", Range(1, 12)) = 5
        _UVBulge ("Mask Grows From Centre (at Custom1.z = 1)", Range(0, 1)) = 0.35
        _LightDir ("Light Direction (world)", Vector) = (-0.4, 0.8, -0.45, 0)
        _ShadowTone ("Shadow Tone", Range(0, 1)) = 0.45

        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5    // SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10   // OneMinusSrcAlpha
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Sphere" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0
            #pragma shader_feature_local _MESH_UV
            #include "UnityCG.cginc"

            sampler2D _MainTex, _RampTex;
            float4 _MaskTiling;
            half _MaskScale, _Soft, _RimIn, _EmisSoft, _EmisBoost, _BulgeAmount, _UVBulge, _ShadowTone, _Lumps, _LumpFreq, _HeatRange;
            float4 _LightDir;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                fixed4 color : COLOR;
                float4 uv0 : TEXCOORD0;   // xy mesh UV (unused), zw = Custom1.xy
                float4 uv1 : TEXCOORD1;   // xy = Custom1.zw, z = stable random, w = centre.x
                float4 uv2 : TEXCOORD2;   // xy = centre.yz
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float4 a : TEXCOORD0;     // xy mask UV, z alpha threshold, w emissive threshold
                half2 b : TEXCOORD1;      // x light factor, y facing (1 = faces the camera, 0 = silhouette)
            };

            v2f vert(appdata v)
            {
                v2f o;
                half bulge = v.uv1.x, normalAmt = v.uv1.y;
                float3 centre = float3(v.uv1.w, v.uv2.xy);
                float3 rv = v.vertex.xyz - centre;
                float3 n = normalize(rv + 1e-5);                                // smooth radial direction (particle verts are world space)
                // lumps (v5, art lead: "khói của họ đâu có tròn"): a cheap 3-sine bump field on the sphere direction,
                // offset per particle, so no sphere keeps a perfect round outline (cauliflower look)
                float3 ph = n * _LumpFreq + v.uv1.z * float3(17.0, 29.0, 41.0);
                half lump = sin(ph.x) * sin(ph.y + 1.7) * sin(ph.z + 0.6) * 0.5 + sin(ph.x * 2.1 + ph.z * 1.3) * 0.25;
                v.vertex.xyz += n * (length(rv) * _Lumps * lump);
                v.vertex.xyz += n * (bulge * _BulgeAmount);                     // push out radially: expanding
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;

            #if _MESH_UV
                // mask wrapped on the sphere's own UVs (reference look: erosion leaves curved vertical strands);
                // stable random shifts u so no two spheres match; bulge stretches the mask vertically from the middle
                float2 uv = v.uv0.xy * _MaskTiling.xy;
                uv.x += v.uv1.z;
                uv.y = 0.5 + (uv.y - 0.5) / (1.0 + bulge * _UVBulge);
                o.a.xy = uv;
            #else
                // mask UV from the view-space normal: the mask centre always faces the camera (matcap style),
                // turned by a stable random angle per particle so no two spheres share the same swirl
                float2 nv = mul((float3x3)UNITY_MATRIX_V, n).xy;
                float ang = v.uv1.z * 6.2831853;
                float s = sin(ang), c = cos(ang);
                nv = float2(c * nv.x - s * nv.y, s * nv.x + c * nv.y);
                nv /= (1.0 + bulge * _UVBulge);                                // mask grows from the centre
                o.a.xy = nv * (0.5 * _MaskScale) + 0.5;
            #endif
                o.a.z = v.uv0.z;
                o.a.w = v.uv0.w;

                half lit = saturate(dot(n, normalize(_LightDir.xyz)) * 0.5 + 0.5);   // half-lambert
                o.b.x = lerp(1.0h, lerp(_ShadowTone, 1.0h, lit), saturate(normalAmt));
                o.b.y = saturate(dot(n, normalize(_WorldSpaceCameraPos.xyz - v.vertex.xyz)));
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half m = tex2D(_MainTex, i.a.xy).r;
                // erosion order: mask alone eats the centre first and leaves a hollow rim (reads as a ring);
                // blending in the facing term eats the silhouette first and keeps a solid core (v2, 2026-11-04)
                half e = lerp(m, 0.6h * i.b.y + 0.4h * m, _RimIn);
                half alpha = smoothstep(i.a.z, i.a.z + _Soft, e);
                half heat = smoothstep(i.a.w, i.a.w - _EmisSoft, m);             // 1 below the emissive threshold
                // ramp u = how deep below the threshold (v5): vein edges dark red -> orange -> hottest only deep inside;
                // v4 used u = heat (always ~1) and the whole mass read pale yellow
                half depth = saturate((i.a.w - m) / _HeatRange);
                half3 hot = tex2D(_RampTex, float2(depth, 0.5)).rgb * _EmisBoost;
                half3 smoke = i.color.rgb * i.b.x;
                half3 col = lerp(smoke, hot, heat);
                return half4(col, alpha * i.color.a);
            }
            ENDCG
        }
    }
    Fallback Off
}
