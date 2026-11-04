// Lightweight glow for the arrow mesh (Built-in RP, mobile friendly).
// Unlit, 1 pass, no lighting / GrabPass / normal map. Fresnel + pulse + sweep are all per-vertex math.
Shader "VFX/Mobile/ArrowGlow"
{
    Properties
    {
        [HDR] _Color ("Glow Color", Color) = (1, 0.65, 0.15, 1)
        _MainTex ("Mask / Albedo (optional)", 2D) = "white" {}
        _Intensity ("Intensity", Range(0, 8)) = 2

        [Header(Fresnel Rim)]
        _RimPower ("Rim Power", Range(0.5, 8)) = 2
        _RimStrength ("Rim Strength", Range(0, 4)) = 1
        _Core ("Core (brightness facing camera)", Range(0, 1)) = 0.35

        [Header(Pulse)]
        _PulseSpeed ("Pulse Speed", Range(0, 12)) = 4
        _PulseAmount ("Pulse Amount", Range(0, 1)) = 0.3

        [Header(Sweep)]
        _SweepStrength ("Sweep Strength", Range(0, 4)) = 1
        _SweepDir ("Sweep Axis (object space)", Vector) = (0, 0, 1, 0)
        _SweepSpeed ("Sweep Speed", Range(0, 8)) = 1.5
        _SweepWidth ("Sweep Width", Range(0.05, 1)) = 0.25
        _SweepLength ("Sweep Axis Length", Float) = 1

        [Header(Render)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 1
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend (1 = Additive, 10 = Alpha)", Float) = 1
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 2
    }

    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        LOD 50

        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull [_Cull]

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            float4 _MainTex_ST;
            half4 _Color;
            half _Intensity, _RimPower, _RimStrength, _Core;
            half _PulseSpeed, _PulseAmount;
            half _SweepStrength, _SweepSpeed, _SweepWidth;
            float4 _SweepDir;
            float _SweepLength;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                half3 glow : TEXCOORD1;   // x = fresnel/core, y = pulse, z = sweep
                UNITY_FOG_COORDS(2)
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);

                float3 viewDir = normalize(ObjSpaceViewDir(v.vertex));
                half ndv = saturate(dot(normalize(v.normal), viewDir));
                half fres = pow(1.0h - ndv, _RimPower) * _RimStrength;
                o.glow.x = fres + _Core * ndv;

                o.glow.y = 1.0h - _PulseAmount * (0.5h + 0.5h * sin(_Time.y * _PulseSpeed));

                // Bright band travelling along the chosen object-space axis.
                float t = dot(v.vertex.xyz, _SweepDir.xyz) / max(_SweepLength, 1e-4) * 0.5 + 0.5;
                float d = frac(t - _Time.y * _SweepSpeed) ;
                o.glow.z = saturate(1.0 - abs(d - 0.5) / max(_SweepWidth * 0.5, 1e-3)) * _SweepStrength;

                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half4 tex = tex2D(_MainTex, i.uv);
                half g = (i.glow.x + i.glow.z) * i.glow.y * _Intensity;
                half4 col;
                col.rgb = tex.rgb * _Color.rgb * g;
                col.a = saturate(tex.a * _Color.a * g);
                UNITY_APPLY_FOG_COLOR(i.fogCoord, col, half4(0, 0, 0, 0));
                return col;
            }
            ENDCG
        }
    }
    Fallback Off
}
