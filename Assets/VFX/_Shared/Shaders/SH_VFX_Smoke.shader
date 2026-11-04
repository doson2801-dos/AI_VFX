// SH_VFX_Smoke — shader-only VFX (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: one stylized smoke puff = round blob with noise-eroded edge, 2-tone toon shading (lit from _LightDir), dissolves edge-in and fades.
//   Rising/drifting is done by the particle (velocity); the shader grows, shades and dissolves the blob.
//   Also used flat on the ground with a dark color for a scorch mark (set _Grow low, _Opacity, no rise).
// Cost: 2 noise samples (scroll UVs computed in the vertex shader), no loops, no atan2/pow/sin per pixel.
// Particle inputs (enable with FxProgress): vertex color = tint * alpha,
//   TEXCOORD0.xy = UV, TEXCOORD0.z = Custom1.x progress 0..1, TEXCOORD0.w = Custom1.y random seed.
// Without a particle (MeshRenderer): progress = _Progress, seed = 0.
Shader "VFX/FX/Smoke"
{
    Properties
    {
        _ColorLight ("Lit Color", Color) = (0.62, 0.55, 0.5, 1)
        _ColorDark ("Shade Color", Color) = (0.2, 0.16, 0.15, 1)
        _Band1 ("Shade -> Lit Threshold", Range(0, 1)) = 0.5
        _BandSoft ("Band Softness", Range(0.005, 0.3)) = 0.05
        _LightDir ("Light Direction (xy, in quad plane)", Vector) = (-0.5, 0.8, 0, 0)

        _Radius ("Final Radius", Range(0.2, 1)) = 0.75
        _Grow ("Growth (0 none, 1 from a point)", Range(0, 1)) = 0.5
        _Erosion ("Edge Erosion", Range(0, 0.6)) = 0.3
        _DissolveSoft ("Dissolve Softness", Range(0.01, 0.5)) = 0.2
        _Opacity ("Opacity", Range(0, 1)) = 0.9

        _NoiseTex ("Noise (tileable, linear; R and G used)", 2D) = "gray" {}
        _NoiseScroll ("Noise Scroll (xy = R, zw = G)", Vector) = (0.05, 0.12, -0.08, 0.06)

        _Progress ("Progress (MeshRenderer only)", Range(0, 1)) = 0
        [Toggle(_USE_PARTICLE_DATA)] _UseParticle ("Progress From Particle Custom1", Float) = 1

        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5   // SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend (1 Add, 10 Alpha)", Float) = 10
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
            #pragma shader_feature_local _USE_PARTICLE_DATA
            #include "UnityCG.cginc"
            #include "Assets/VFX/_Shared/Shaders/VfxShaderLib.cginc"

            half4 _ColorLight, _ColorDark;
            half _Band1, _BandSoft, _Radius, _Grow, _Erosion, _DissolveSoft, _Opacity, _Progress;
            half4 _LightDir;
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
                half r = length(p);
                half R = _Radius * lerp(1.0h - _Grow, 1.0h, vfxEaseOut(life * 1.6h));

                // blob with noise-eroded edge
                half mask = vfxFill(r - R * (1.0h + (n.x - 0.5h) * 2.0h * _Erosion), 0.04h);

                // dissolve edge-in: the dense middle stays last
                half body = saturate(1.0h - r / R) + (n.y - 0.5h) * 0.35h;
                half thr = lerp(-0.25h, 1.35h, life * life);
                half keep = smoothstep(thr, thr + _DissolveSoft, body + 0.2h);

                // 2-tone toon shade from a fixed direction in the quad plane
                half shade = 0.5h + 0.5h * dot(p, _LightDir.xy) / max(R, 0.05h) + (n.y - 0.5h) * 0.5h;
                half3 col = lerp(_ColorDark.rgb, _ColorLight.rgb, vfxBand(shade, _Band1, _BandSoft));

                half alpha = mask * keep * _Opacity * (1.0h - vfxBand(life, 0.85h, 0.15h)) * i.color.a;
                return half4(col * i.color.rgb, alpha);
            }
            ENDCG
        }
    }
    Fallback Off
}
