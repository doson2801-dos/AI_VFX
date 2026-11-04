// SH_VFX_Spark — shader-only VFX (vfx-shader skill). Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: spark / ember streak = capsule with a bright head and a tapered tail. Use with a Stretched Billboard particle:
//   the quad's long side (X) follows the velocity; the head is at +X, the tail at -X.
// Cost: 0 texture samples, no loops, no atan2/pow/sin per pixel.
// Particle inputs (enable with FxProgress): vertex color = tint * alpha, TEXCOORD0.z = Custom1.x progress 0..1.
// Without a particle (MeshRenderer): progress = _Progress.
Shader "VFX/FX/Spark"
{
    Properties
    {
        [HDR] _ColorTail ("Tail Color", Color) = (1, 0.3, 0.04, 1)
        [HDR] _ColorHead ("Head Color", Color) = (1, 0.9, 0.55, 1)
        _Taper ("Tail Taper (0 even, 1 to a point)", Range(0, 1)) = 0.8
        _HeadSize ("Head Size (fraction of length)", Range(0.05, 0.6)) = 0.25
        _Soft ("Edge Softness", Range(0.02, 0.6)) = 0.25
        _Shrink ("Shrink With Life", Range(0, 1)) = 0.7

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
            #pragma shader_feature_local _USE_PARTICLE_DATA
            #include "UnityCG.cginc"
            #include "Assets/VFX/_Shared/Shaders/VfxShaderLib.cginc"

            half4 _ColorTail, _ColorHead;
            half _Taper, _HeadSize, _Soft, _Shrink, _Progress;

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
                float4 uv : TEXCOORD0;      // xy UV, z progress
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
                float progress = v.uv.z;
            #else
                float progress = _Progress;
            #endif
                o.uv = float3(v.uv.xy, progress);
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half life = saturate(i.uv.z);
                half s = i.uv.x;                                   // 0 = tail end, 1 = head end
                half y = abs(i.uv.y * 2.0h - 1.0h);                // 0 on axis, 1 at the quad edge

                // half-width along the length: wide at the head, tapering to the tail tip
                half w = lerp(1.0h, s, _Taper) * (1.0h - life * _Shrink);
                half body = 1.0h - smoothstep(w - _Soft, w + 0.001h, y);
                body *= smoothstep(0.0h, 0.12h, s);                // soft tip at the tail end
                body *= 1.0h - smoothstep(0.9h, 1.0h, s);          // round-ish head end

                half head = smoothstep(1.0h - _HeadSize * 2.0h, 1.0h - _HeadSize * 0.5h, s) * (1.0h - y);
                half3 col = lerp(_ColorTail.rgb, _ColorHead.rgb, saturate(head * (1.0h - life)));
                half alpha = body * (1.0h - life * life) * i.color.a;
                return half4(col * i.color.rgb, alpha);
            }
            ENDCG
        }
    }
    Fallback Off
}
