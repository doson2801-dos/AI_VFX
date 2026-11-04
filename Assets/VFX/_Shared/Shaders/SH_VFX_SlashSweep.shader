// SH_VFX_SlashSweep — slash crescent that runs around a ring/arc mesh by UV (mesh + UV, not a billboard).
// Mobile: Built-in + URP, one unlit pass, UnityCG only. Cost: 3 texture samples, no loops, no pow/atan2/sin.
// Mesh: u runs along the swing (0 -> 1), v across the band (0.5 = centre / sharp outer rim), e.g. SM_VFX_Slash_Circle_Thin.
// Mask texture (R): crescent drawn head-left / tail-right, full frame, original aspect (Slash group in Shape Lab).
// Particle inputs (Mesh renderer, streams Position, Color, UV, Custom1.x): vertex colour = tint * alpha,
//   TEXCOORD0.z = Custom1.x age 0..1 over the particle life. Without particle data: _Age.
// Look: head hot (core colour), tail cool (outer colour), toon 3 bands, detail texture scrolls against the swing,
//   erodes from the tail to the head, then fades.
Shader "VFX/FX/Slash Sweep"
{
    Properties
    {
        _MainTex ("Crescent Mask (R)", 2D) = "white" {}
        _DetailTex ("Detail Noise (R)", 2D) = "gray" {}
        [HDR] _ColorCore ("Core", Color) = (1, 0.95, 0.75, 1)
        [HDR] _ColorMid ("Mid", Color) = (1, 0.55, 0.12, 1)
        [HDR] _ColorOuter ("Outer", Color) = (0.75, 0.12, 0.03, 1)
        _Band1 ("Outer/Mid Threshold", Range(0, 1)) = 0.35
        _Band2 ("Mid/Core Threshold", Range(0, 1)) = 0.72
        _BandSoft ("Band Softness", Range(0.005, 0.2)) = 0.03
        _HeadHeat ("Head Heat", Range(0, 1)) = 0.45

        _Window ("Arc Length (fraction of the ring)", Range(0.1, 1)) = 0.55
        _Swing ("Swing Time (fraction of life)", Range(0.2, 1)) = 0.8
        _SweepIn ("Ease (0 linear, 1 fast start)", Range(0, 1)) = 0.35
        _HeadPoint ("Head Pointedness (arc length of the pinch)", Range(0.02, 0.6)) = 0.25
        _TailSoft ("Tail Fade Length", Range(0.02, 0.6)) = 0.2

        _DetailTile ("Detail Tiling XY", Vector) = (6, 1.5, 0, 0)
        _DetailScroll ("Detail Scroll XY /s-life", Vector) = (-1.5, 0, 0, 0)
        _DetailAmount ("Detail Amount", Range(0, 1)) = 0.5
        _DetailLo ("Detail Low", Range(0, 1)) = 0.3
        _DetailHi ("Detail High", Range(0, 1)) = 0.7
        _Distortion ("UV Distortion", Range(0, 0.15)) = 0.03

        _ErodeStart ("Erode Starts At Age", Range(0, 1)) = 0.45
        _Soft ("Edge Softness", Range(0.01, 0.4)) = 0.1
        _Intensity ("Intensity", Range(0, 4)) = 1.2
        _Age ("Age (no particle)", Range(0, 1)) = 0.3
        [Toggle(_USE_PARTICLE_DATA)] _UseParticle ("Age From Particle Custom1", Float) = 1

        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 2
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend (1 Add, 10 Alpha)", Float) = 1
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Plane" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull [_Cull]

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #pragma shader_feature_local _USE_PARTICLE_DATA
            #include "UnityCG.cginc"

            sampler2D _MainTex, _DetailTex;
            half4 _ColorCore, _ColorMid, _ColorOuter;
            half _Band1, _Band2, _BandSoft, _HeadHeat;
            half _Window, _Swing, _SweepIn, _HeadPoint, _TailSoft;
            half4 _DetailTile, _DetailScroll;
            half _DetailAmount, _DetailLo, _DetailHi, _Distortion;
            half _ErodeStart, _Soft, _Intensity, _Age;

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
                float4 uv : TEXCOORD0;      // xy UV, z age
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float3 uv : TEXCOORD0;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
            #if _USE_PARTICLE_DATA
                float age = v.uv.z;
            #else
                float age = _Age;
            #endif
                o.uv = float3(v.uv.xy, age);
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half age = saturate(i.uv.z);

                // head position along the ring; the crescent trails behind it over _Window of the ring
                half a = saturate(age / _Swing);
                half e = lerp(a, 1.0h - (1.0h - a) * (1.0h - a), _SweepIn);
                half head = (1.0h + _Window) * e;
                half l = (head - i.uv.x) / _Window;                 // 0 at the head, 1 at the tail tip

                // the leading end is pinched to a point on the outer rim (blunt texture heads would be cut flat)
                half pinch = lerp(0.08h, 1.0h, smoothstep(0.0h, _HeadPoint, l));
                half vv = 0.5h + (i.uv.y - 0.5h) / pinch;

                // slow distortion of the crescent so it is not a perfectly clean cut
                half n = tex2D(_DetailTex, float2(i.uv.x * 3.0 + age * 0.5, i.uv.y * 1.3)).r - 0.5h;
                half2 muv = half2(l + n * _Distortion * 2.0h, vv + n * _Distortion);
                half inside = smoothstep(0.0h, 0.03h, l) * (1.0h - smoothstep(1.0h - _TailSoft, 1.0h, l));
                half mask = tex2D(_MainTex, saturate(muv)).r * inside;

                // detail scrolls against the swing (u), tiled along the ring
                float2 duv = float2(i.uv.x * _DetailTile.x + age * _DetailScroll.x,
                                    i.uv.y * _DetailTile.y + age * _DetailScroll.y);
                half det = smoothstep(_DetailLo, _DetailHi, tex2D(_DetailTex, duv).r);
                half val = mask * lerp(1.0h, det, _DetailAmount);

                // erosion from the tail to the head, then the whole thing fades
                half ero = saturate((age - _ErodeStart) / max(0.001h, 1.0h - _ErodeStart));
                half thr = ero * (0.45h + 0.55h * saturate(l));
                half alpha = smoothstep(thr, thr + _Soft, val) * step(0.002h, val);
                alpha *= 1.0h - smoothstep(0.88h, 1.0h, age);

                // toon heat: hot at the head and where the mask is strong
                half lat = 1.0h - abs(i.uv.y * 2.0h - 1.0h);        // 1 on the band centre, 0 at its edges
                half heat = saturate(val * lerp(0.5h, 1.0h, lat) + (1.0h - saturate(l)) * _HeadHeat * mask * 0.6h);
                half3 col = _ColorOuter.rgb;
                col = lerp(col, _ColorMid.rgb, smoothstep(_Band1 - _BandSoft, _Band1 + _BandSoft, heat));
                col = lerp(col, _ColorCore.rgb, smoothstep(_Band2 - _BandSoft, _Band2 + _BandSoft, heat));

                col *= i.color.rgb * _Intensity;
                return half4(col, saturate(alpha * i.color.a));
            }
            ENDCG
        }
    }
}
