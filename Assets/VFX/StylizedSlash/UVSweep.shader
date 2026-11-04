Shader "VFX/UV Sweep"
{
    Properties
    {
        _MainTex ("Opacity Mask (R)", 2D) = "white" {}
        _NoiseTex ("UV Noise", 2D) = "gray" {}
        _Tint ("Tint", Color) = (1,1,1,1)
        _Distortion ("UV Distortion", Range(0,0.1)) = 0.015
        _Dissolve ("Dissolve", Range(0,1)) = 0.8
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Cull Off ZWrite Off
        Blend SrcAlpha [_DstBlend]
        Pass
        {
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "UnityCG.cginc"
            sampler2D _MainTex, _NoiseTex;
            half4 _Tint;
            half _Distortion, _Dissolve;
            struct Input { float4 position : POSITION; half4 color : COLOR; float4 uv : TEXCOORD0; };
            struct Varying { float4 position : SV_POSITION; half4 color : COLOR; float3 uv : TEXCOORD0; };
            Varying Vert(Input v)
            {
                Varying o;
                o.position = UnityObjectToClipPos(v.position);
                o.color = v.color * _Tint;
                o.uv = v.uv.xyz;
                return o;
            }
            half4 Frag(Varying i) : SV_Target
            {
                float age = saturate(i.uv.z);
                float travel = 1 - saturate(age / 0.48);
                float2 uv = float2(i.uv.x + 0.94 * travel * travel, i.uv.y);
                uv.y += (tex2D(_NoiseTex, i.uv.xy * 2 + float2(age * 0.31, 0)).r - 0.5) * _Distortion;
                half mask = tex2D(_MainTex, saturate(uv)).r;
                half bounds = saturate(uv.x * 80) * saturate((1 - uv.x) * 80);
                half erosion = smoothstep(0.42, 0.98, age) * _Dissolve;
                half opacity = mask * bounds * smoothstep(erosion, erosion + 0.15, mask);
                return half4(i.color.rgb, i.color.a * opacity * (1 - smoothstep(0.87, 1, age)));
            }
            ENDHLSL
        }
    }
}
