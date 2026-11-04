Shader "Custom/BlackHole_TextureFresnel"
{
    Properties
    {
        [HDR] _GlowColor ("Glow Color", Color) = (0, 0.5, 1, 1)
        _MainTex ("Energy Texture (Noise)", 2D) = "white" {}
        _FresnelPower ("Fresnel Power", Range(0.1, 10.0)) = 3.0
        _ScrollSpeed ("Scroll Speed", Vector) = (0.1, 0.1, 0, 0)
        _Smoothness ("Edge Smoothness", Range(0.01, 1.0)) = 0.5
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" }
        LOD 100

        Pass
        {
            ZWrite Off
            Blend One One // Additive

            CGPROGRAM
#pragma target 3.5
#include "UnityCG.cginc"
#include "Assets/VFX/_Imported/RpgGame/Common/VfxPortable.cginc"
            #pragma vertex vert
            #pragma fragment frag


            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv         : TEXCOORD0;
                float3 normalOS   : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv         : TEXCOORD0;
                float3 worldNormal : TEXCOORD1;
                float3 viewDirWS   : TEXCOORD2;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _GlowColor;
            float _FresnelPower;
            float _Smoothness;
            float4 _ScrollSpeed;

            Varyings vert (Attributes input)
            {
                Varyings output;
                VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);
                output.positionCS = vertexInput.positionCS;
                
                // Tính toán UV scrolling
                output.uv = TRANSFORM_TEX(input.uv, _MainTex);
                output.uv += _Time.y * _ScrollSpeed.xy;

                output.worldNormal = TransformObjectToWorldNormal(input.normalOS);
                float3 worldPos = TransformObjectToWorld(input.positionOS.xyz);
                output.viewDirWS = GetWorldSpaceViewDir(worldPos);
                
                return output;
            }

            half4 frag (Varyings input) : SV_Target
            {
                float3 normal = normalize(input.worldNormal);
                float3 viewDir = normalize(input.viewDirWS);

                // 1. Lấy Texture năng lượng
                float4 texColor = tex2D(_MainTex, input.uv);

                // 2. Tính toán Fresnel
                float nv = saturate(dot(normal, viewDir));
                float fresnel = 1.0 - nv;
                fresnel = smoothstep(0.0, _Smoothness, fresnel);
                fresnel = pow(fresnel, _FresnelPower);

                // 3. Kết hợp Texture và Fresnel
                // Texture sẽ chỉ hiện lên ở vùng có Fresnel sáng
                float3 finalRGB = texColor.rgb * fresnel * _GlowColor.rgb * _GlowColor.a;

                return half4(finalRGB, 1.0);
            }
            ENDCG
        }
    }
}