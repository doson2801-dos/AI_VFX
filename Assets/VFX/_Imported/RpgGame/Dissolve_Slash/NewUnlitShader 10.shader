Shader "Custom/VFX/BasicDissolve_Pan_Sweep_BlendModes"
{
    Properties
    {
        [Header(Surface Blend States)]
        [Space(5)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 1
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10
        [Enum(Off, 0, On, 1)] _ZWrite ("ZWrite", Float) = 0
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Culling", Float) = 2

        [Header(Main Visuals)]
        [Space(5)]
        [HDR] _BaseColor ("Base Color", Color) = (1, 1, 1, 1)
        _MainTex ("Main Texture (Grayscale)", 2D) = "white" {}
        [NoScaleOffset] _EffectMask ("Effect Area Mask (R)", 2D) = "white" {}
        
        [Header(Internal Color Blending)]
        [Space(5)]
        [KeywordEnum(Multiply, Additive, Screen, Overlay)] _ColorBlend ("Color Blend Mode", Float) = 0

        [Header(One Shot Sweep Module)]
        [Space(5)]
        _SweepDirection ("Sweep Direction (X, Y)", Vector) = (1, 0, 0, 0)

        [Header(Alpha Dissolve Module)]
        [Space(5)]
        _DissolveNoiseTex ("Panning Dissolve Mask", 2D) = "white" {}
        _DissolveNoisePower ("Dissolve Noise Power", Range(0.1, 5.0)) = 1.0
        _DissolvePanSpeed ("Dissolve Pan Speed (XY)", Vector) = (0.0, -0.2, 0.0, 0.0)
        _DissolveAmount ("Dissolve Progress", Range(0.0, 1.05)) = 0.0
        _Smoothness ("Fade Smoothness", Range(0.001, 0.5)) = 0.1
    }

    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" }
        LOD 100

        Pass
        {
            Blend [_SrcBlend] [_DstBlend]
            ZWrite [_ZWrite]
            Cull [_Cull]

            CGPROGRAM
#pragma target 3.5
#include "UnityCG.cginc"
#include "Assets/VFX/_Imported/RpgGame/Common/VfxPortable.cginc"
            #pragma vertex vert
            #pragma fragment frag
            
            // Biên dịch cục bộ các variants blend mode
            #pragma shader_feature_local _COLORBLEND_MULTIPLY _COLORBLEND_ADDITIVE _COLORBLEND_SCREEN _COLORBLEND_OVERLAY
            

            struct Attributes
            {
                float4 positionOS : POSITION;
                float4 color : COLOR;
                float4 uv0 : TEXCOORD0;
                float4 customStream : TEXCOORD1;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float4 color : COLOR;
                float2 uvMain : TEXCOORD0;
                float2 uvStaticMask : TEXCOORD1;
                float2 uvPanNoise : TEXCOORD2;
                float customDissolve : TEXCOORD3;
            };

            // Khai báo Texture và Sampler (ĐÃ FIX: Tách độc lập Sampler cho Noise)
            TEXTURE2D(_MainTex);            SAMPLER(sampler_MainTex);
            TEXTURE2D(_EffectMask);
            TEXTURE2D(_DissolveNoiseTex);   SAMPLER(sampler_DissolveNoiseTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _DissolveNoiseTex_ST;
                
                half4 _BaseColor;
                half2 _SweepDirection;
                
                float _DissolveNoisePower;
                float4 _DissolvePanSpeed;
                float _DissolveAmount;
                float _Smoothness;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.color = IN.color;
                
                // Trích xuất dữ liệu Custom từ Particle System
                OUT.customDissolve = IN.uv0.z;
                OUT.uvStaticMask = IN.uv0.xy; 
                
                // Trượt UV 1 lần (One Shot Sweep)
                float sweepProgress = IN.customStream.x;
                float2 sweepOffset = _SweepDirection * sweepProgress;
                OUT.uvMain = TRANSFORM_TEX(IN.uv0.xy, _MainTex) - sweepOffset;
                
                // Tịnh tiến liên tục theo Time (Đã gỡ bỏ frac() để tránh giật/khựng UV)
                float2 panOffset = _DissolvePanSpeed.xy * _Time.y;
                OUT.uvPanNoise = TRANSFORM_TEX(IN.uv0.xy, _DissolveNoiseTex) + panOffset;
                
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                // Đọc Main Texture bằng sampler mặc định
                half4 mainTexColor = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uvMain);
                
                // Đọc Noise Texture bằng sampler ĐỘC LẬP (tránh bị lây Wrap Mode Clamp từ MainTex)
                float panNoiseVal = SAMPLE_TEXTURE2D(_DissolveNoiseTex, sampler_DissolveNoiseTex, IN.uvPanNoise).r;
                
                panNoiseVal = pow(max(panNoiseVal, 0.0001), _DissolveNoisePower);

                // === ALPHA DISSOLVE ===
                float finalDissolve = saturate(_DissolveAmount + IN.customDissolve);
                float alphaMask = smoothstep(finalDissolve, finalDissolve + _Smoothness, panNoiseVal);

                // === LOGIC MASK ORIGINAL ===
                half staticMask = SAMPLE_TEXTURE2D(_EffectMask, sampler_MainTex, IN.uvStaticMask).r;
                alphaMask *= staticMask;

                clip(alphaMask - 0.001);

                // === COLOR BLENDING MODULE ===
                half3 tintColor = _BaseColor.rgb * IN.color.rgb;
                half3 finalColor = mainTexColor.rgb;

                #if defined(_COLORBLEND_MULTIPLY)
                    finalColor *= tintColor;
                #elif defined(_COLORBLEND_ADDITIVE)
                    finalColor = saturate(finalColor + tintColor);
                #elif defined(_COLORBLEND_SCREEN)
                    finalColor = 1.0h - (1.0h - finalColor) * (1.0h - tintColor);
                #elif defined(_COLORBLEND_OVERLAY)
                    half3 check = step(0.5h, finalColor);
                    half3 darkBlend = 2.0h * finalColor * tintColor;
                    half3 lightBlend = 1.0h - 2.0h * (1.0h - finalColor) * (1.0h - tintColor);
                    finalColor = lerp(darkBlend, lightBlend, check);
                #else
                    finalColor *= tintColor; 
                #endif

                // === ALPHA OUTPUT & PRE-MULTIPLY (FIX ĐEN NỀN) ===
                // Lấy kênh Red làm hệ số trong suốt thay vì Alpha do đây là ảnh Grayscale
                half finalAlpha = alphaMask * mainTexColor.r * _BaseColor.a * IN.color.a;

                // Pre-multiply Alpha triệt tiêu hoàn toàn rác màu tại vùng vô hình
                finalColor *= finalAlpha;

                return half4(finalColor, finalAlpha);
            }
            ENDCG
        }
    }
}