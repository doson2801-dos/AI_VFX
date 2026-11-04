// Stylized (cel) one-shot smoke burst on a sphere-CLUSTER mesh (built by SmokeStylized3DBuild) - Built-in and URP.
// Look-dev shader: bake to a sheet. One unlit pass without LightMode; UnityCG.cginc only.
//
// Mesh data per puff: POSITION = unit-sphere point * 0.5, UV0 = (puff centre xyz, radius), UV1 = (seed, delay).
//   * vertex: each puff blooms in after its delay (ease-out), the whole cluster spreads outward and rises;
//   * fragment: light comes from the cluster's core (each puff is bright on the side facing the core, dark on
//     the outside - art lead ref) mixed with a key light; blobby terminator from noise; 4 cel tones
//     (shadow / mid / light / core);
//   * dissolve over _Life: big + small noise holes (L/M/S), small puffs and rims go first, softer toward the motion.
// _Life 0..1 drives everything (bake: frame i -> _Life = i / (n - 1)); no loop.
Shader "VFX/Smoke Stylized 3D"
{
    Properties
    {
        _NoiseTex ("Noise (tileable, R, linear)", 2D) = "gray" {}
        _DissolveTex ("Dissolve Noise (tileable, R, linear; holes where dark)", 2D) = "gray" {}
        _DissolveScale ("Dissolve Tiling", Float) = 0.35
        _Life ("Life 0..1", Range(0, 1)) = 0.35
        _BloomTime ("Puff Bloom Time (life)", Range(0.05, 1)) = 0.35
        _ScaleStart ("Puff Scale Start", Range(0, 1)) = 0.2
        _GrowLate ("Puff Growth After Bloom", Range(0, 1)) = 0.25
        _SpreadStart ("Cluster Spread Start", Range(0, 2)) = 0.45
        _SpreadEnd ("Cluster Spread End", Range(0, 3)) = 1.6
        _Rise ("Rise (object units)", Range(0, 3)) = 0.5
        _Bumps ("Surface Bumps", Range(0, 0.5)) = 0.06
        _NoiseScale ("Noise Tiling (big, small)", Vector) = (0.8, 2.2, 0, 0)
        _LightDir ("Key Light Dir (view space)", Vector) = (-0.55, 0.75, -0.35, 0)
        _InnerLight ("Light From Core (0 key .. 1 core)", Range(0, 1)) = 0.65
        _CoreGlow ("Core Glow", Range(0, 1)) = 0.35
        _CoreRadius ("Core Radius", Range(0.1, 3)) = 0.9
        _ToneNoise ("Blobby Shadow Edge", Range(0, 1)) = 0.12
        _Band1 ("Shadow -> Mid", Range(0, 1.5)) = 0.4
        _Band2 ("Mid -> Light", Range(0, 1.5)) = 0.72
        _Band3 ("Light -> Core", Range(0, 1.5)) = 0.98
        _ToneSoft ("Tone Edge Softness", Range(0, 0.2)) = 0.01
        _DissolveStart ("Dissolve Start (life)", Range(0, 1)) = 0.4
        _DissolveSmallFirst ("Small Puffs Go First (additive, legacy)", Range(0, 2)) = 0
        _CutRange ("Dissolve Cut Range (mask low, high)", Vector) = (0.18, 0.85, 0, 0)
        _SizeStagger ("Dissolve Order Small -> Big (stagger)", Range(0, 0.9)) = 0.55
        _DissolveSoft ("Dissolve Edge Softness", Range(0, 0.3)) = 0.0
        _DissolveFacing ("Dissolve From Rim (0 holes .. 1 rim bites)", Range(0, 1)) = 0.5
        _RimPow ("Rim Shape Power", Range(0.3, 3)) = 0.8
        _EdgeWidth ("Dissolve Edge Line Width", Range(0, 0.2)) = 0.05
        _EdgeColor ("Dissolve Edge Line Colour (a = strength)", Color) = (0.25, 0.23, 0.3, 1)
        _InsideOut ("Dissolve Inside -> Out (cluster core first)", Range(0, 1)) = 1
        [Toggle] _EraseMode ("Crescent Erase Mode (art lead video ref)", Float) = 0
        _SweepDir ("Erase Sweep Direction (view xy)", Vector) = (0.7, 0.6, 0, 0)
        _SweepSpread ("Erase Sweep Stagger (life)", Range(0, 0.8)) = 0.35
        _EraseOffset ("Eraser Offset (x puff radius)", Range(0, 1.5)) = 0.75
        _EraseJitter ("Eraser Angle Jitter (rad)", Range(0, 3)) = 1.2
        _DarkenEnd ("Darken While Dissolving", Range(0, 1)) = 0.7
        _ClusterRadius ("Cluster Radius (for inside-out)", Range(0.3, 3)) = 1.3
        _CoreFirst ("Puffs Near The Core Go First", Range(0, 1)) = 0
        _ColorShadow ("Shadow Colour", Color) = (0.36, 0.34, 0.42, 1)
        _ColorMid ("Mid Colour", Color) = (0.6, 0.58, 0.64, 1)
        _ColorLight ("Light Colour", Color) = (0.84, 0.83, 0.87, 1)
        _ColorCore ("Core Colour", Color) = (0.98, 0.97, 0.98, 1)
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10
        [Enum(Off, 0, On, 1)] _ZWrite ("ZWrite (On sorts the puffs)", Float) = 1
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend [_SrcBlend] [_DstBlend], One OneMinusSrcAlpha
        ZWrite [_ZWrite]
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            sampler2D _NoiseTex, _DissolveTex;
            float _DissolveScale;
            float4 _NoiseScale, _LightDir;
            float _Life, _BloomTime, _ScaleStart, _GrowLate, _SpreadStart, _SpreadEnd, _Rise, _Bumps;
            float _InnerLight, _CoreGlow, _CoreRadius, _ToneNoise, _Band1, _Band2, _Band3, _ToneSoft;
            float _DissolveStart, _DissolveSmallFirst, _DissolveSoft, _DissolveFacing, _RimPow, _EdgeWidth, _InsideOut, _CoreFirst, _ClusterRadius, _SizeStagger;
            float _EraseMode, _SweepSpread, _EraseOffset, _EraseJitter, _DarkenEnd;
            float4 _SweepDir, _CutRange;
            half4 _EdgeColor;
            half4 _ColorShadow, _ColorMid, _ColorLight, _ColorCore;

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
                float4 puff : TEXCOORD0;   // centre xyz, radius
                float4 data : TEXCOORD1;   // seed, delay
            };
            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float3 np : TEXCOORD0;     // noise position (cluster space, undeformed surface)
                float3 nrmV : TEXCOORD1;
                float3 coreV : TEXCOORD2;  // view-space direction from the puff toward the cluster core
                float3 posV : TEXCOORD3;
                float4 info : TEXCOORD4;   // radius, core distance, seed, height 0..1
                float3 cp : TEXCOORD5;     // undeformed surface point in cluster space
                float4 erase : TEXCOORD6;  // crescent mode: eraser centre (view xy), eraser radius, puff radius (view)
            };

            float NoiseAt(float3 p, float scale, float scroll)
            {
                float2 a = float2(p.x + p.z * 0.5, p.y) * scale + float2(0, -scroll);
                float2 b = float2(p.z - p.x * 0.5, p.y) * scale + float2(0.37, -scroll);
                return (tex2Dlod(_NoiseTex, float4(a, 0, 0)).r + tex2Dlod(_NoiseTex, float4(b, 0, 0)).r) * 0.5;
            }

            float DissolveAt(float3 p, float scroll)
            {
                float2 a = float2(p.x + p.z * 0.5, p.y) * _DissolveScale + float2(0, -scroll);
                float2 b = float2(p.z - p.x * 0.5, p.y) * _DissolveScale + float2(0.37, -scroll);
                return (tex2Dlod(_DissolveTex, float4(a, 0, 0)).r + tex2Dlod(_DissolveTex, float4(b, 0, 0)).r) * 0.5;
            }

            v2f vert (appdata v)
            {
                v2f o;
                float life = saturate(_Life);
                float3 dir = normalize(v.vertex.xyz);
                float3 centre = v.puff.xyz;
                float r = v.puff.w;
                float seed = v.data.x, delay = v.data.y;

                float bloom = saturate((life - delay) / _BloomTime);
                bloom = 1.0 - (1.0 - bloom) * (1.0 - bloom);                 // ease-out
                float spread = 1.0 - pow(1.0 - life, 3.0);                  // finishes expanding early (peak ~mid-life)
                float scale = r * lerp(_ScaleStart, 1.0, bloom) * (1.0 + _GrowLate * life) * step(0.0001, bloom);

                float3 np = centre + dir * r + seed * 7.13;
                float bump = (NoiseAt(np, _NoiseScale.y, life * 0.5) - 0.5) * _Bumps;
                float3 c = centre * lerp(_SpreadStart, _SpreadEnd, spread) + float3(0, _Rise * spread, 0);
                float3 q = c + dir * scale * (1.0 + bump);

                o.pos = UnityObjectToClipPos(float4(q, 1));
                o.posV = UnityObjectToViewPos(q);
                o.nrmV = normalize(mul((float3x3)UNITY_MATRIX_IT_MV, dir));
                o.coreV = normalize(mul((float3x3)UNITY_MATRIX_MV, -normalize(centre + float3(1e-4, 1e-4, 1e-4))));
                o.np = np;
                o.cp = centre + dir * r;

                // crescent erase (video ref): a growing circle eats each puff from the sweep's source side, leaving
                // a sharp-tipped crescent; puffs go one after another along the sweep direction
                float3 cV = UnityObjectToViewPos(c);
                float3 oV = UnityObjectToViewPos(float3(0, 0, 0));
                float rV = scale * length(UNITY_MATRIX_MV[0].xyz);
                float2 sw = normalize(_SweepDir.xy + 1e-5);
                float proj = dot(cV.xy - oV.xy, sw) / (_ClusterRadius * length(UNITY_MATRIX_MV[0].xyz));
                float t0 = _DissolveStart + saturate(proj * 0.5 + 0.5) * _SweepSpread + (seed - 0.5) * 0.06;
                float lp = saturate((life - t0) / max(1.08 - t0, 0.05));   // last frame keeps a few slivers
                float ang = atan2(-sw.y, -sw.x) + (seed - 0.5) * _EraseJitter;
                float2 eC = cV.xy + float2(cos(ang), sin(ang)) * rV * _EraseOffset;
                o.erase = float4(eC, rV * 2.4 * pow(lp, 0.8), rV);
                o.info = float4(r, length(centre), seed, saturate(dir.y * 0.5 + 0.5));
                o.color = v.color;
                return o;
            }

            half4 frag (v2f i) : SV_Target
            {
                float life = saturate(_Life);
                float3 N = normalize(i.nrmV);
                float3 V = normalize(-i.posV);
                float facing = saturate(dot(N, V));
                float key = dot(N, normalize(_LightDir.xyz)) * 0.5 + 0.5;
                float inner = dot(N, normalize(i.coreV)) * 0.5 + 0.5;

                float nBig = NoiseAt(i.np, _NoiseScale.x, life * 0.8);

                // cel tones: light from the core + key light, core glow for puffs near the centre, blobby terminator
                float core = 1.0 - saturate(i.info.y / _CoreRadius);
                float tone = lerp(key, inner, _InnerLight) + core * _CoreGlow + (nBig - 0.5) * _ToneNoise;
                float ts = fwidth(tone) + _ToneSoft;
                float t1 = smoothstep(_Band1 - ts, _Band1 + ts, tone);
                float t2 = smoothstep(_Band2 - ts, _Band2 + ts, tone);
                float t3 = smoothstep(_Band3 - ts, _Band3 + ts, tone);
                half3 col = lerp(_ColorShadow.rgb, _ColorMid.rgb, t1);
                col = lerp(col, _ColorLight.rgb, t2);
                col = lerp(col, _ColorCore.rgb, t3);

                // STYLIZED dissolve: clean shapes, hard edge, a coloured line along the edge.
                //   m mixes the dissolve texture (hole shapes) with the puff's own form (rim first -> curved bites
                //   that follow each sphere); no fine speckle noise.
                float d = DissolveAt(i.np, life * 0.3);
                // form term: rim-first (each puff shrinks from its outline) or inside-out over the whole cluster
                // (holes open at the core and spread to the outer puffs, which go last)
                float form = pow(facing, _RimPow);
                float radial = saturate(length(i.cp) / _ClusterRadius);
                form = lerp(form, radial * 0.8 + form * 0.2, _InsideOut);
                float m = lerp(d, form, _DissolveFacing);
                float prog = smoothstep(_DissolveStart, 1.0, life);
                // order by size (art lead): small puffs start dissolving first, big ones last
                float sizeRank = saturate((0.7 - i.info.x) / (0.7 - 0.17));      // 1 = smallest, 0 = biggest
                float start = (1.0 - sizeRank) * _SizeStagger;
                float lin = saturate((life - _DissolveStart) / max(1.0 - _DissolveStart, 0.05));   // even pacing
                float pp = saturate((lin - start) / max(1.0 - start, 0.05));
                // even area loss (art lead: not all at the end): the mask m is bell-shaped, so a linear cut loses
                // most area in the middle. Inverse-smoothstep pacing + starting the cut at m's low end spreads it out.
                float even = 0.5 - sin(asin(1.0 - 2.0 * pp) / 3.0);
                float cut = lerp(_CutRange.x, _CutRange.y, even);
                cut += (0.45 - i.info.x) * _DissolveSmallFirst * prog;          // small puffs go first
                cut += (1.0 - saturate(i.info.y / _CoreRadius)) * _CoreFirst * prog;   // core of the cluster first
                float aa = fwidth(m) * 0.75 + _DissolveSoft;
                float alpha = smoothstep(cut - aa, cut + aa, m);
                // edge line: the band just inside the cut, only once the dissolve has started
                float band = 1.0 - smoothstep(cut + _EdgeWidth - aa, cut + _EdgeWidth + aa, m);
                if (_EraseMode > 0.5)
                {
                    float dist = length(i.posV.xy - i.erase.xy);
                    float ea = fwidth(dist) * 0.75;
                    alpha = smoothstep(i.erase.z - ea, i.erase.z + ea, dist);
                    float w = _EdgeWidth * 2.0 * i.erase.w;
                    band = (1.0 - smoothstep(i.erase.z + w - ea, i.erase.z + w + ea, dist))
                         * smoothstep(0.25 * i.erase.w, 0.6 * i.erase.w, i.erase.z);   // no ring around a tiny new hole
                }
                col *= lerp(1.0, _DarkenEnd, prog);
                col = lerp(col, _EdgeColor.rgb, band * _EdgeColor.a * smoothstep(0.0, 0.04, prog));
                clip(alpha - 0.02);   // dissolved pixels must not write depth (would hide the puffs behind)

                // (non-HDR colour properties are already linear in Linear projects - no manual conversion)
                return half4(col, alpha) * i.color;
            }
            ENDCG
        }
    }
}
