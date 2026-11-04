// SH_VFX_Meteor — shader-only VFX (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: meteor = eroded round head + tapered fire tail with streaks flowing backwards. Head at left of the quad, tail runs to +X.
//   The particle moves/rotates the quad; the shader only draws head + tail and shrinks/fades them with progress.
// Cost: 2 noise samples (scroll UVs computed in the vertex shader), no loops, no atan2/pow/sin per pixel.
// Particle inputs (enable with VfxShaderBuild.UseFxStreams): vertex color = tint * alpha,
//   TEXCOORD0.xy = UV, TEXCOORD0.z = Custom1.x progress 0..1, TEXCOORD0.w = Custom1.y random seed.
// Without a particle (MeshRenderer): progress = _Progress, seed = 0.
// Units: quad height = 2 (y in -1..1), quad width = 2 * _Aspect. Set _Aspect = quad width / height.
Shader "VFX/FX/Meteor"
{
    Properties
    {
        [HDR] _ColorOuter ("Tail Edge Color", Color) = (0.55, 0.06, 0.02, 1)
        [HDR] _ColorMid ("Flame Color", Color) = (1, 0.38, 0.06, 1)
        [HDR] _ColorCore ("Core Color", Color) = (1, 0.92, 0.6, 1)
        _Band1 ("Edge -> Flame Threshold", Range(0, 1)) = 0.32
        _Band2 ("Flame -> Core Threshold", Range(0, 1)) = 0.68
        _BandSoft ("Band Softness", Range(0.005, 0.3)) = 0.05

        _Aspect ("Quad Aspect (width / height)", Float) = 3
        _HeadX ("Head Position (x in height units, from center)", Float) = -1.9
        _HeadRadius ("Head Radius", Range(0.05, 1)) = 0.4
        _HeadSoft ("Head Edge Softness", Range(0.002, 0.2)) = 0.035
        _CrustAmount ("Head Crust Erosion", Range(0, 0.6)) = 0.22
        _CrustDark ("Head Crust Darkening", Range(0, 1)) = 0.45

        _TailLength ("Tail Length (height units)", Range(0.5, 5)) = 4.2
        _TailWidth ("Tail Width (x head radius)", Range(0.2, 2)) = 1.3
        _TailTaper ("Tail Taper (0 linear, 1 sharp)", Range(0, 1)) = 0.6
        _TailNoise ("Tail Streak Erosion", Range(0, 1)) = 0.55

        _NoiseTex ("Noise (tileable, linear; R and G used)", 2D) = "gray" {}
        _NoiseScroll ("Noise Scroll (xy = streak R, zw = crust G)", Vector) = (-2.2, 0, 0.3, -0.2)
        [Toggle(_DISTORT)] _UseDistort ("Tail Wobble", Float) = 1
        _DistortAmount ("Wobble Amount", Range(0, 0.5)) = 0.05

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
            #include "UnityCG.cginc"
            #include "Assets/VFX/_Shared/Shaders/VfxShaderLib.cginc"

            half4 _ColorOuter, _ColorMid, _ColorCore;
            half _Band1, _Band2, _BandSoft;
            half _HeadRadius, _HeadSoft, _CrustAmount, _CrustDark;
            half _TailLength, _TailWidth, _TailTaper, _TailNoise;
            half _DistortAmount, _Progress;
            float _Aspect, _HeadX;
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
                // noise stretched by the quad aspect so streaks keep their shape; seed shifts it per particle
                float2 baseUV = TRANSFORM_TEX(v.uv.xy, _NoiseTex) * float2(_Aspect, 1) + seed;
                float t = _Time.y;
                o.nuv.xy = baseUV + _NoiseScroll.xy * t;
                o.nuv.zw = baseUV * 1.7 + _NoiseScroll.zw * t;
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half progress = i.uv.z;
                half2 n = half2(tex2D(_NoiseTex, i.nuv.xy).r, tex2D(_NoiseTex, i.nuv.zw).g);

                // height units: y in -1..1, x in -aspect..aspect; head at (_HeadX, 0), tail runs to +x
                float2 q = float2(vfxCentered(i.uv.xy).x * _Aspect - _HeadX, vfxCentered(i.uv.xy).y);

                // ---- head: round, eroded by crust noise
                half R = _HeadRadius;
                half dHead = length(q) - R * (1.0h + (n.y - 0.5h) * 2.0h * _CrustAmount);
                half headMask = vfxFill(dHead, _HeadSoft);
                half headHeat = 0.5h + 0.5h * saturate(-dHead / R);
                headHeat -= (1.0h - n.y) * _CrustDark;                      // dark pits in the crust

                // ---- tail: tapered, shrinks and shortens with progress
                half life = saturate(progress);
                half len = _TailLength * lerp(0.5h, 1.0h, saturate(life * 8.0h)) * (1.0h - life * life * 0.85h);
                half t = saturate(q.x / max(len, 0.01h));                   // 0 at head, 1 at tail tip
                half lin = 1.0h - t;
                half w = R * _TailWidth * lerp(lin, lin * lin, _TailTaper);
                float y = q.y;
            #if _DISTORT
                y += (n.y - 0.5h) * _DistortAmount * (0.3h + t);            // tail wobbles more towards the tip
            #endif
                half across = abs(y) / max(w, 0.001h);                      // 0 on axis, 1 at tail edge
                half profile = saturate(1.0h - across) * lin;               // brightest on axis near the head
                half tailHeat = saturate(profile * (1.5h + (n.x - 0.5h) * _TailNoise * 2.0h));
                half tailMask = smoothstep(0.08h, 0.2h, tailHeat) * smoothstep(-0.05h, 0.12h * R + 0.02h, q.x);
                tailMask *= 1.0h - t * t;

                // ---- combine
                half heat = max(headHeat * headMask, tailHeat * tailMask);
                half alpha = max(headMask, tailMask);
                alpha *= 1.0h - vfxBand(life, 0.97h, 0.03h);               // head switches off on impact

                half3 col = vfxRamp3(heat, _ColorOuter.rgb, _ColorMid.rgb, _ColorCore.rgb, _Band1, _Band2, _BandSoft);
                alpha *= i.color.a;
                return half4(col * i.color.rgb, alpha);
            }
            ENDCG
        }
    }
    Fallback Off
}
