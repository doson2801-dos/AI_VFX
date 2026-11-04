// SH_VFX_Blast — shader-only VFX (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: explosion on one square quad = white flash + expanding shockwave ring + eroded fireball that dissolves edge-in.
// Cost: 2 noise samples (scroll UVs computed in the vertex shader), no loops, no atan2/pow/sin per pixel.
// Particle inputs (enable with VfxShaderBuild.UseFxStreams): vertex color = tint * alpha,
//   TEXCOORD0.xy = UV, TEXCOORD0.z = Custom1.x progress 0..1, TEXCOORD0.w = Custom1.y random seed.
// Without a particle (MeshRenderer): progress = _Progress, seed = 0.
// Keywords (default off): _NO_RING = flash + fireball only (upright quad); _RING_ONLY = ring only (ground quad).
// Units: quad centered, p in -1..1; radii are fractions of the quad half-size.
Shader "VFX/FX/Blast"
{
    Properties
    {
        [HDR] _ColorOuter ("Fire Edge Color", Color) = (0.5, 0.05, 0.02, 1)
        [HDR] _ColorMid ("Fire Color", Color) = (1, 0.38, 0.06, 1)
        [HDR] _ColorCore ("Core / Flash Color", Color) = (1, 0.92, 0.6, 1)
        _Band1 ("Edge -> Fire Threshold", Range(0, 1)) = 0.3
        _Band2 ("Fire -> Core Threshold", Range(0, 1)) = 0.7
        _BandSoft ("Band Softness", Range(0.005, 0.3)) = 0.06

        _FlashSize ("Flash Radius", Range(0.1, 1)) = 0.55
        _FlashTime ("Flash Duration (progress)", Range(0.05, 0.6)) = 0.25
        _RingRadius ("Shockwave Final Radius", Range(0.1, 1)) = 0.92
        _RingWidth ("Shockwave Start Half-Width", Range(0.005, 0.2)) = 0.06
        _RingFade ("Shockwave Fade Start (progress)", Range(0.1, 0.9)) = 0.35
        _FireRadius ("Fireball Final Radius", Range(0.1, 1)) = 0.62
        _Erosion ("Fireball Edge Erosion", Range(0, 0.6)) = 0.3
        _DissolveSoft ("Dissolve Softness", Range(0.01, 0.4)) = 0.12

        _NoiseTex ("Noise (tileable, linear; R and G used)", 2D) = "gray" {}
        _NoiseScroll ("Noise Scroll (xy = R, zw = G)", Vector) = (0.15, -0.25, -0.2, 0.1)
        [Toggle(_DISTORT)] _UseDistort ("Noise Distortion", Float) = 1
        _DistortAmount ("Distortion Amount", Range(0, 0.3)) = 0.07

        [Toggle(_NO_RING)] _NoRing ("Hide Shockwave Ring (flash + fireball only)", Float) = 0
        [Toggle(_RING_ONLY)] _RingOnly ("Shockwave Ring Only", Float) = 0

        _Progress ("Progress (MeshRenderer only)", Range(0, 1)) = 0
        [Toggle(_USE_PARTICLE_DATA)] _UseParticle ("Progress From Particle Custom1", Float) = 1

        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5   // SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend (1 Add, 10 Alpha)", Float) = 1
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Plane" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0
            #pragma shader_feature_local _DISTORT
            #pragma shader_feature_local _USE_PARTICLE_DATA
            #pragma shader_feature_local _NO_RING
            #pragma shader_feature_local _RING_ONLY
            #include "UnityCG.cginc"
            #include "Assets/VFX/_Shared/Shaders/VfxShaderLib.cginc"

            half4 _ColorOuter, _ColorMid, _ColorCore;
            half _Band1, _Band2, _BandSoft;
            half _FlashSize, _FlashTime, _RingRadius, _RingWidth, _RingFade, _FireRadius, _Erosion, _DissolveSoft;
            half _DistortAmount, _Progress;
            sampler2D _NoiseTex;
            float4 _NoiseTex_ST;
            float4 _NoiseScroll;

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
                float4 uv : TEXCOORD0;      // xy UV, z progress, w seed
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float3 uv : TEXCOORD0;      // xy UV, z progress
                float4 nuv : TEXCOORD1;     // two scrolled noise UVs
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
            #if _USE_PARTICLE_DATA
                float progress = v.uv.z, seed = v.uv.w;
            #else
                float progress = _Progress, seed = 0;
            #endif
                o.uv = float3(v.uv.xy, progress);
                float2 baseUV = TRANSFORM_TEX(v.uv.xy, _NoiseTex) + seed;
                float t = _Time.y;
                o.nuv.xy = baseUV + _NoiseScroll.xy * t;
                o.nuv.zw = baseUV * 1.7 + _NoiseScroll.zw * t;
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half life = saturate(i.uv.z);
                half2 n = half2(tex2D(_NoiseTex, i.nuv.xy).r, tex2D(_NoiseTex, i.nuv.zw).g);

                float2 p = vfxCentered(i.uv.xy);
            #if _DISTORT
                p += (n - 0.5h) * (2.0h * _DistortAmount);
            #endif
                half r = length(p);

                // ---- flash: soft white blob, gone after _FlashTime
                half fk = saturate(life / _FlashTime);
                half flash = saturate(1.0h - r / (_FlashSize * (0.6h + 0.4h * fk)));
                flash = flash * flash * (1.0h - fk);

                // ---- shockwave ring: expands fast, thins, fades
                half rr = _RingRadius * vfxEaseOut(life * 1.4h);
                half rw = _RingWidth * (1.0h - life) + 0.004h;
                half ring = vfxFill(abs(r - rr) - rw, rw * 0.8h + 0.01h);
                ring *= 1.0h - vfxBand(life, _RingFade + 0.25h, 0.25h);

                // ---- fireball: grows, edge eroded by noise, dissolves from the edge to the core
                half R = _FireRadius * lerp(0.3h, 1.0h, vfxEaseOut(life * 1.6h));
                half shape = vfxFill(r - R * (1.0h + (n.x - 0.5h) * 2.0h * _Erosion), 0.04h);
                half heat = saturate(1.0h - r / R) + (n.y - 0.5h) * 0.3h;
                half thr = lerp(-0.2h, 1.0h, life * life);
                half fire = shape * smoothstep(thr, thr + _DissolveSoft, heat);
                half fireHeat = saturate(heat * 1.2h + 0.15h) * (1.0h - life * 0.5h);

            #if _NO_RING
                ring = 0;
            #endif
            #if _RING_ONLY
                flash = 0; fire = 0;
            #endif

                // ---- combine
                half h = max(max(fireHeat * fire, ring * 0.75h), flash);
                half alpha = saturate(max(max(fire, ring), flash));

                half3 col = vfxRamp3(h, _ColorOuter.rgb, _ColorMid.rgb, _ColorCore.rgb, _Band1, _Band2, _BandSoft);
                alpha *= i.color.a;
                return half4(col * i.color.rgb, alpha);
            }
            ENDCG
        }
    }
    Fallback Off
}
