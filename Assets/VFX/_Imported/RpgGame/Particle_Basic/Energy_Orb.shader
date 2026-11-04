Shader "Vibe-Code/Mobile/EnergyOrb_SurfaceOptions"
{
    Properties
    {
        [Header(Surface Options)]
        [Enum(Opaque, 0, Transparent, 1)] _Surface("Surface Type", Float) = 1
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend("Src Blend", Float) = 1
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend("Dst Blend", Float) = 1
        [Enum(Off, 0, On, 1)] _ZWrite("ZWrite", Float) = 0
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 2

        [Header(Colors)]
        [HDR] _InnerColor ("Inner Color", Color) = (0.1, 0.02, 0, 1)
        [HDR] _EdgeColor ("Edge Color", Color) = (1, 0.5, 0, 1)
        
        [Header(Fresnel Settings)]
        _FresnelPower ("Fresnel Power", Range(0.1, 10)) = 3.0
        _FresnelScale ("Fresnel Scale", Range(0, 2)) = 1.0

        [Header(Distortion)]
        _NoiseMap ("Noise Map", 2D) = "white" {}
        _DistortionSpeed ("Distortion Speed", Vector) = (0.1, 0.1, 0, 0)
        _DistortionStrength ("Distortion Strength", Range(0, 1)) = 0.2
    }

    SubShader
    {
        // Tag "RenderType" sẽ được điều chỉnh thông qua Script hoặc để mặc định Transparent cho VFX
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" }
        
        Blend [_SrcBlend] [_DstBlend]
        ZWrite [_ZWrite]
        Cull [_Cull]

        Pass
        {
            CGPROGRAM
#pragma target 3.5
#include "UnityCG.cginc"
#include "Assets/VFX/_Imported/RpgGame/Common/VfxPortable.cginc"
            #pragma vertex vert
            #pragma fragment frag

            struct Attributes {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
                float4 color      : COLOR;
            };

            struct Varyings {
                float4 positionCS : SV_POSITION;
                float2 uv         : TEXCOORD0;
                float3 normalWS   : TEXCOORD1;
                float3 viewDirWS  : TEXCOORD2;
                float4 vertexColor : TEXCOORD3;
            };

            TEXTURE2D(_NoiseMap); SAMPLER(sampler_NoiseMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _InnerColor;
                float4 _EdgeColor;
                float _FresnelPower;
                float _FresnelScale;
                float4 _NoiseMap_ST;
                float2 _DistortionSpeed;
                float _DistortionStrength;
            CBUFFER_END

            Varyings vert(Attributes input) {
                Varyings output;
                VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);
                output.positionCS = vertexInput.positionCS;
                output.uv = TRANSFORM_TEX(input.uv, _NoiseMap);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.viewDirWS = GetWorldSpaceViewDir(vertexInput.positionWS);
                output.vertexColor = input.color;
                return output;
            }

            half4 frag(Varyings input) : SV_Target {
                float2 scrollingUV = input.uv + _DistortionSpeed * _Time.y;
                float noise = SAMPLE_TEXTURE2D(_NoiseMap, sampler_NoiseMap, scrollingUV).r;
                
                float3 N = normalize(input.normalWS);
                float3 V = normalize(input.viewDirWS);
                
                // Công thức Fresnel kinh điển: $F = (1 - N \cdot V)^{Power} \times Scale$
                float fresnel = 1.0 - saturate(dot(N, V));
                fresnel = pow(fresnel + (noise * _DistortionStrength), _FresnelPower) * _FresnelScale;

                half4 baseColor = lerp(_InnerColor, _EdgeColor, fresnel);
                
                return baseColor * input.vertexColor; 
            }
            ENDCG
        }
    }
}