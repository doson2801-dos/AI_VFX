// SH_VFX_ErodeSphere — eroding lit smoke sphere for explosion smoke (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: technique of Beyond-FX's "Zelda-inspired explosion" smoke (art lead reference 2026-11-04, rule "khói vụ nổ"):
//   a sphere mesh per particle (SM_VFX_SphereUV), an erosion mask wrapped on the sphere's own UVs, an alpha threshold
//   eats it from the dark areas (centre out -> curved vertical strands), a second threshold on the same mask drives the
//   hot emissive veins through a heat ramp (colour by depth below the threshold), the outline is broken into lumps and
//   the sphere bulges out along its radius.
// v2 (2026-11-04, art lead: "thuộc tính quá nhiều"): 16 -> 7 properties. Removed the view-space mask mode (_MaskScale,
//   _UseMeshUV, _RimIn) and fixed the rest as constants below (tiling 1, vein edge 0.1, lump frequency 5, bulge 0.12,
//   mask growth 0.35, light from above-left-front, alpha blend).
// Cost: 2 texture samples (mask + ramp), no expensive functions in the fragment (sin in the vertex shader only).
// v3 (2026-11-04, art lead: bỏ z và w): Custom Data cut to 2 channels; bulge and light are fixed (full) in the shader.
// v4 (2026-11-04, art lead: "thêm thuộc tính điều chỉnh độ mờ viền vào custom data"): Custom1.z = edge softness,
//   replaces the material's _Soft, so the edge can go soft -> crisp (or back) over each particle's life.
// Particle inputs (ParticleSystemRenderer.SetActiveVertexStreams, Mesh render mode):
//   Position, Normal, Color, UV, Custom1XYZ, StableRandomX, Center
//   -> TEXCOORD0.xy = mesh UV, TEXCOORD0.zw = Custom1.xy, TEXCOORD1.x = Custom1.z, TEXCOORD1.y = stable random,
//      TEXCOORD1.zw + TEXCOORD2.x = particle centre (world).
//   The sphere direction is (vertex - centre), not the mesh normal (flat-shaded meshes would look like a disco ball).
//   Custom1.x = when the smoke dissolves: alpha threshold 0..1 (0 = whole, 1 = gone)
//   Custom1.y = when the fire cools: emissive threshold (1 = all hot, <= 0 = cold)
//   Custom1.z = edge softness (mask units; ~0.03 crisp toon edge, 0.15+ blurry)
// Vertex color = smoke tint * alpha (Start Color, Color over Lifetime). Mask texture: linear, Repeat.
Shader "VFX/FX/Erode Sphere"
{
    Properties
    {
        _MainTex ("Erosion Mask (grey, linear, Repeat; dark = eaten first)", 2D) = "white" {}
        _RampTex ("Heat Ramp (dark red -> hottest)", 2D) = "white" {}
        _EmisBoost ("Fire Brightness", Range(0.5, 3)) = 1.1
        _HeatRange ("Vein Colour Depth (small = bright orange fast)", Range(0.05, 1)) = 0.35
        _Lumps ("Lumpy Outline", Range(0, 0.4)) = 0.22
        _ShadowTone ("Shadow Tone", Range(0, 1)) = 0.3
        [Toggle(_MESH_NORMAL)] _MeshNormal ("Whole Shape Mesh (light from mesh normals, e.g. one mushroom mesh)", Float) = 0
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Sphere" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0
            #pragma shader_feature_local _MESH_NORMAL
            #include "UnityCG.cginc"

            // fixed look constants (were properties before v2)
            #define EMIS_SOFT   0.1     // vein edge width
            #define LUMP_FREQ   5.0     // lumps around the sphere
            #define BULGE       0.12    // radial push (object units); swelling over time comes from Size over Lifetime
            #define UV_BULGE    0.35    // mask stretch from the middle
            static const float3 LIGHT_DIR = float3(-0.4, 0.8, -0.45);    // world, from above-left-front (old _LightDir default)

            sampler2D _MainTex, _RampTex;
            float4 _MainTex_ST;   // mask Tiling / Offset from the material's texture slot (no extra property)
            half _EmisBoost, _HeatRange, _Lumps, _ShadowTone;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                fixed4 color : COLOR;
                float4 uv0 : TEXCOORD0;   // xy mesh UV, zw = Custom1.xy
                float4 uv1 : TEXCOORD1;   // x = Custom1.z (edge softness), y = stable random, zw = centre.xy
                float4 uv2 : TEXCOORD2;   // x = centre.z
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float4 a : TEXCOORD0;     // xy mask UV, z alpha threshold, w emissive threshold
                half2 b : TEXCOORD1;      // x light, y edge softness
            };

            v2f vert(appdata v)
            {
                v2f o;
                half rnd = v.uv1.y;
                float3 centre = float3(v.uv1.zw, v.uv2.x);
                float3 rv = v.vertex.xyz - centre;
            #ifdef _MESH_NORMAL
                // one whole-shape mesh (e.g. SM_MushroomBlast_Cloud): light + push along the mesh normal (world, from the
                // Normal stream); the mesh is already lumpy, its UVs are cylindrical (u around, v up)
                float3 n = normalize(v.normal);
                float3 ph = v.vertex.xyz * (LUMP_FREQ * 0.5) + rnd * float3(17.0, 29.0, 41.0);
                half lump = sin(ph.x) * sin(ph.y + 1.7) * sin(ph.z + 0.6);
                v.vertex.xyz += n * (_Lumps * lump * 0.5 + BULGE);
            #else
                float3 n = normalize(rv + 1e-5);                                // smooth radial direction (particle verts are world space)
                // lumps: cheap sine bump field on the sphere direction, offset per particle -> no perfect round outline
                float3 ph = n * LUMP_FREQ + rnd * float3(17.0, 29.0, 41.0);
                half lump = sin(ph.x) * sin(ph.y + 1.7) * sin(ph.z + 0.6) * 0.5 + sin(ph.x * 2.1 + ph.z * 1.3) * 0.25;
                v.vertex.xyz += n * (length(rv) * _Lumps * lump + BULGE);
            #endif
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;

                // mask on the mesh's own UVs; stable random shifts u so no two particles match
                float2 uv = v.uv0.xy;
                uv.x += rnd;
            #ifndef _MESH_NORMAL
                uv.y = 0.5 + (uv.y - 0.5) / (1.0 + UV_BULGE);                  // sphere: stretched v from the middle
            #endif
                uv = uv * _MainTex_ST.xy + _MainTex_ST.zw;                     // big meshes need a finer mask (tiling > 1)
                o.a = float4(uv, v.uv0.z, v.uv0.w);

                half lit = saturate(dot(n, normalize(LIGHT_DIR)) * 0.5 + 0.5);   // half-lambert
            #ifdef _MESH_NORMAL
                // whole-shape mesh: 2-tone toon light (lit top / shadow underside) with a short soft step, so the big
                // mass reads as volume instead of one flat grey (MushroomBlast v3 preview)
                lit = smoothstep(0.48, 0.58, lit) * 0.85 + lit * 0.15;
            #endif
                o.b = half2(lerp(_ShadowTone, 1.0h, lit), max(v.uv1.x, 0.002));   // softness > 0 keeps smoothstep valid
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half m = tex2D(_MainTex, i.a.xy).r;
                half alpha = smoothstep(i.a.z, i.a.z + i.b.y, m);              // eaten from the dark areas out, edge width per particle
                half heat = smoothstep(i.a.w, i.a.w - EMIS_SOFT, m);           // 1 below the emissive threshold
                half depth = saturate((i.a.w - m) / _HeatRange);               // vein edge dark red -> deep inside hottest
                half3 hot = tex2D(_RampTex, float2(depth, 0.5)).rgb * _EmisBoost;
                half3 col = lerp(i.color.rgb * i.b.x, hot, heat);
                return half4(col, alpha * i.color.a);
            }
            ENDCG
        }
    }
    Fallback Off
}
