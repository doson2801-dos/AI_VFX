// SH_VFX_SmokeMesh — realtime toon SMOKE on a 3D mesh + noise dissolve (codefx "SmokeMesh", art lead 2026-11-03).
// Smoke only: all fire colouring (heat ramp, crease fire, burning edge, glow) was removed on the art lead's request.
// The shader holds only its own look: dissolve shape, edge softness and LIGHT / DARK. Everything else is the particle's:
//   Start Color x Color over Lifetime   the smoke COLOUR (lit side) and fade (alpha)  (art lead 2026-11-03)
//   Custom1.x                           Dissolve 0..1 (0 = whole, 1 = gone). Drift (spread + side curl) follows it.
// Size (grow / swell) = Size over Lifetime, rise = Velocity over Lifetime.
// Mesh: Blender metaball mass (codefx/mesh/blender_passes.py, CFX_EXPORT) in CAMERA space -> View-aligned mesh particle.
// Per-vertex data baked in Blender, fixed on the surface (frames stay coherent: a dissolved point never comes back):
//   uv0.x = AO (creases between lobes -> shadow), uv0.y = region noise (which areas dissolve first), uv1.x = detail noise
// Streams (enable _USE_PARTICLE_DATA): POSITION, NORMAL, COLOR, TEXCOORD0 = (UV.xy, UV2.xy), TEXCOORD1 = (Custom1.x, Center.xyz).
// One pass: alpha blend + depth write (eaten pixels clipped). Renderer Sort Mode = By Distance. 0 texture samples. Built-in, UnityCG only.
Shader "VFX/FX/Smoke Mesh"
{
    Properties
    {
        [Header(Dissolve)]
        [HideInInspector] _Thr ("Threshold curve at 0 / .25 / .5 / .75 (from the mesh, set by the build)", Vector) = (0, 0.37, 0.5, 0.62)
        [HideInInspector] _Thr4 ("Threshold at 1 (from the mesh)", Float) = 0.86
        _RegionWeight ("Region vs Detail noise (rebuild to re-pace)", Range(0, 1)) = 0.5
        _EdgeSoft ("Soft eaten edge (noise units)", Range(0.005, 0.3)) = 0.05

        [Header(Light and dark   colour comes from the particle)]
        _ShadowDarkness ("Shadow side = particle colour x", Range(0, 1)) = 0.6
        _LitThreshold ("Shadow -> Lit threshold", Range(0, 1)) = 0.33
        _ToneNoise ("Noise on the tone border", Range(0, 0.5)) = 0.15
        _LightDir ("Light (view space: x right, y up, z to viewer)", Vector) = (-0.45, 0.7, 0.55, 0)

        [Header(Drift shape)]
        _Spread ("Spread at Drift 1", Range(0, 0.5)) = 0.12
        _Curl ("Side curl at Drift 1 (rad)", Range(0, 1)) = 0.4
        _CurlRadius ("Curl radius (m)", Float) = 1.6

        [Header(Preview)]
        [Toggle] _PreviewOverride ("Preview: override Dissolve", Float) = 0
        _ManualDissolve ("Dissolve", Range(0, 1)) = 0
        [Toggle(_USE_PARTICLE_DATA)] _UseParticle ("Particle streams (off = MeshRenderer)", Float) = 1
    }

    CGINCLUDE
    #include "UnityCG.cginc"

    float4 _Thr, _LightDir;
    float _Thr4, _RegionWeight, _EdgeSoft, _LitThreshold, _ToneNoise, _ShadowDarkness;
    float _Spread, _Curl, _CurlRadius, _ManualDissolve, _PreviewOverride;

    struct appdata
    {
        float4 vertex : POSITION;
        float3 normal : NORMAL;
        float4 color : COLOR;       // Start Color x Color over Lifetime: rgb = smoke colour, a = fade
        float4 uv : TEXCOORD0;      // (ao, region, detail, -)
        float4 c1 : TEXCOORD1;      // x = Custom1.x dissolve, yzw = particle centre
    };

    struct v2f
    {
        float4 pos : SV_POSITION;
        float3 nv : TEXCOORD0;      // view-space normal
        float4 d : TEXCOORD1;       // ao, region, detail, dissolve
        half4 color : COLOR;
    };

    inline float tanh1(float x) { float e = exp(-2.0 * abs(x)); return sign(x) * (1.0 - e) / (1.0 + e); }

    v2f vert(appdata v)
    {
        v2f o;
    #if _USE_PARTICLE_DATA
        float3 wp = v.vertex.xyz;                        // particle meshes arrive in world space
        float3 wn = v.normal;
        float3 c = v.c1.yzw;
        float dis = v.c1.x;
        half4 col = v.color;
    #else
        float3 wp = mul(unity_ObjectToWorld, v.vertex).xyz;
        float3 wn = UnityObjectToWorldNormal(v.normal);
        float3 c = unity_ObjectToWorld._m03_m13_m23;
        float dis = 0.0;
        half4 col = half4(1, 1, 1, 1);
    #endif
        dis = lerp(dis, _ManualDissolve, _PreviewOverride);   // material preview on a paused particle

        // drift follows the dissolve (approved timing: drift = smoothstep(0.45, 1.2, t), dissolve = seg(0.3, 1.164, t)^1.2)
        float tDis = 0.3 + 0.864 * pow(saturate(dis), 1.0 / 1.2);
        float e = dis > 0.0 ? smoothstep(0.45, 1.2, tDis) : 0.0;
        float3 R = UNITY_MATRIX_V[0].xyz, U = UNITY_MATRIX_V[1].xyz;
        float3 rel = wp - c;
        float xr = dot(rel, R), yr = dot(rel, U);
        float cr = max(_CurlRadius, 0.01);                // 0 would divide by zero (broken positions)
        float th = _Curl * e * saturate(length(float2(xr, yr)) / cr) * tanh1(xr / (0.35 * cr));
        float cs = cos(th), sn = sin(th);
        float2 q = float2(xr * cs - yr * sn, xr * sn + yr * cs);
        rel += R * (q.x - xr) + U * (q.y - yr);
        wp = c + rel * (1.0 + _Spread * e);

        o.pos = mul(UNITY_MATRIX_VP, float4(wp, 1.0));
        o.nv = mul((float3x3)UNITY_MATRIX_V, wn);
        o.d = float4(v.uv.x, v.uv.y, v.uv.z, saturate(dis));
        o.color = col;
        return o;
    }

    // dissolve: ONE fixed threshold curve (area quantiles from the mesh) -> frame coherent
    half DissolveAlpha(v2f i)
    {
        float region = i.d.y, detail = i.d.z, dis = i.d.w;
        float field = region * _RegionWeight + detail * (1.0 - _RegionWeight);
        float margin = (_Thr4 - _Thr.x) * 0.06;
        float thr = dis < 0.25 ? lerp(_Thr.x, _Thr.y, dis * 4.0)
                  : dis < 0.5  ? lerp(_Thr.y, _Thr.z, dis * 4.0 - 1.0)
                  : dis < 0.75 ? lerp(_Thr.z, _Thr.w, dis * 4.0 - 2.0)
                  :              lerp(_Thr.w, _Thr4, dis * 4.0 - 3.0);
        thr = dis <= 0.0 ? _Thr.x - margin * 2.0 : (dis >= 1.0 ? _Thr4 + margin * 2.0 : thr);
        // soft edge in NOISE units: stable while the mass moves. A width in pixels (fwidth) jumped from triangle to
        // triangle (the noise is per vertex) and shimmered along the eaten edge. fwidth only keeps a 1 px minimum (AA).
        float w = max(_EdgeSoft, fwidth(field));
        return saturate(0.5 + (field - thr) / w) * i.color.a;   // x particle fade
    }

    half4 frag(v2f i) : SV_Target
    {
        float ao = saturate(i.d.x), region = i.d.y, detail = i.d.z;
        float3 nv = normalize(i.nv);
        // light direction (0,0,0 would be NaN -> fall back to the default top-left-front light)
        float3 L = dot(_LightDir.xyz, _LightDir.xyz) > 1e-6 ? normalize(_LightDir.xyz) : float3(-0.45, 0.7, 0.55) / 0.9898;
        float lam = saturate(dot(nv, L)) * ao * ao;      // AO: creases between lobes go to shadow
        float nd = saturate(detail * 0.6 + region * 0.4);

        // light / dark only: lit = the particle colour, shadow = the particle colour x _ShadowDarkness (border wobbled by noise)
        half shade = (lam + (nd - 0.5) * _ToneNoise) > _LitThreshold ? 1.0 : _ShadowDarkness;

        half a = DissolveAlpha(i);
        clip(a - 0.004);                                  // eaten: no colour, no depth
        return half4(i.color.rgb * shade, a);
    }
    ENDCG

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Sphere" }

        // ONE pass: colour + depth together (art lead 2026-11-03: flicker while dissolving). A separate depth prepass ran
        // for ALL particles before any colour, so a front particle's half-eaten edge hid the particle behind and blended
        // over the background, then the back one popped in as the edge passed 0.5. Sorted by distance (far first), each
        // particle is drawn over the ones behind it; depth still hides the far side of its own mass.
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite On
            ZTest LEqual
            Cull Back
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #pragma shader_feature_local _USE_PARTICLE_DATA
            ENDCG
        }
    }
    Fallback Off
}
