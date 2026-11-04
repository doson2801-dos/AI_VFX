Shader "Custom/VFX/UltimateGradient_MultiplyNoiseDissolve_Sweep"
{
    Properties
    {
        [Header(Surface Blend States)]
        [Space(5)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10
        [Enum(Off, 0, On, 1)] _ZWrite ("ZWrite", Float) = 0
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Culling", Float) = 2

        [Header(Textures And Mask)]
        [Space(5)]
        _MainTex ("Grayscale Base Texture", 2D) = "white" {}
        [NoScaleOffset] _EffectMask ("Effect Area Mask (R)", 2D) = "white" {}
        
        [Header(One Shot Sweep Module)]
        [Space(5)]
        _SweepDirection ("Sweep Direction (X, Y)", Vector) = (1, 0, 0, 0)
        
        [Header(Procedural Gradient Colors)]
        [Space(5)]
        [HDR] _ColorBot ("Color Bottom (Cool)", Color) = (0.1, 0.1, 0.1, 1)
        _BotPos ("Bottom Color Position", Range(0.0, 1.0)) = 0.1
        [HDR] _ColorMid ("Color Mid Tone", Color) = (2.5, 1.2, 0.2, 1)
        _MidPos ("Mid Tone Position", Range(0.0, 1.0)) = 0.5
        [HDR] _ColorTop ("Color Top (Hot)", Color) = (0.9, 0.8, 0.6, 1)
        _TopPos ("Top Color Position", Range(0.0, 1.0)) = 0.9

        [Header(Thermal Cooling Module)]
        [Space(5)]
        [Toggle(_COOLING_ON)] _EnableCooling ("Enable Thermal Cooling", Float) = 0
        _NoiseTex ("Static Noise Texture", 2D) = "white" {}
        _CoolingProgress ("Cooling Progress (0 to 2)", Range(0.0, 2.0)) = 0.0
        _CoolingNoise ("Cooling Raggedness", Range(0.0, 1.0)) = 0.2

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
            #pragma shader_feature_local _COOLING_ON
            

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
                float2 uvStaticNoise : TEXCOORD1;
                float2 uvStaticMask : TEXCOORD2;
                float2 customData : TEXCOORD3;
                float2 uvPanNoise : TEXCOORD4;
            };

            TEXTURE2D(_MainTex);                SAMPLER(sampler_MainTex);
            TEXTURE2D(_EffectMask);
            TEXTURE2D(_NoiseTex);               SAMPLER(sampler_NoiseTex);
            TEXTURE2D(_DissolveNoiseTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _NoiseTex_ST;
                float4 _DissolveNoiseTex_ST;
                
                half2 _SweepDirection;
                
                half4 _ColorBot;    float _BotPos;
                half4 _ColorMid;    float _MidPos;
                half4 _ColorTop;    float _TopPos;
                
                float _CoolingProgress;
                float _CoolingNoise;
                
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
                OUT.customData.x = IN.uv0.z; // Dissolve Progress
                OUT.customData.y = IN.uv0.w; // Cooling Progress
                
                // === UV GROUP 0: Không gian UV Cố định ===
                // Gắn chặt Effect Mask vào Local UV, bỏ qua mọi can thiệp transform/offset
                OUT.uvStaticMask = IN.uv0.xy; 
                
                // === UV GROUP 1: Trượt UV 1 lần theo Custom Stream ===
                float sweepProgress = IN.customStream.x;
                float2 sweepOffset = _SweepDirection * sweepProgress;
                
                OUT.uvMain = TRANSFORM_TEX(IN.uv0.xy, _MainTex) - sweepOffset;
                OUT.uvStaticNoise = TRANSFORM_TEX(IN.uv0.xy, _NoiseTex) - sweepOffset;
                
                // === UV GROUP 2: Tịnh tiến liên tục theo Time ===
                float time = _Time.y;
                // Bọc frac() bảo vệ bộ nhớ float16 trên Mobile, giới hạn vòng lặp [0, 1)
                float2 panOffset = frac(_DissolvePanSpeed.xy * time);
                OUT.uvPanNoise = TRANSFORM_TEX(IN.uv0.xy, _DissolveNoiseTex) + panOffset;
                
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half grayValue = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uvMain).r;
                float staticNoiseVal = SAMPLE_TEXTURE2D(_NoiseTex, sampler_NoiseTex, IN.uvStaticNoise).r;
                
                float panNoiseVal = SAMPLE_TEXTURE2D(_DissolveNoiseTex, sampler_NoiseTex, IN.uvPanNoise).r;
                // Clamp cận dưới để tránh lỗi kiến trúc biên dịch pow(0, n) sinh NaN trên Mobile
                panNoiseVal = pow(max(panNoiseVal, 0.0001), _DissolveNoisePower);
                
                float combinedNoise = staticNoiseVal * panNoiseVal;

                // === 1. THERMAL COOLING ===
                float shift = 0.0;
                
                #if defined(_COOLING_ON)
                    float currentCooling = _CoolingProgress + IN.customData.y;
                    shift = currentCooling + (staticNoiseVal - 0.5) * _CoolingNoise;
                #endif
                
                half wBot = smoothstep(_BotPos + shift, _MidPos + shift, grayValue);
                half wTop = smoothstep(_MidPos + shift, _TopPos + shift, grayValue);
                half3 proceduralColor = lerp(lerp(_ColorBot.rgb, _ColorMid.rgb, wBot), _ColorTop.rgb, wTop);

                // === 2. ALPHA DISSOLVE & MASK ===
                float finalDissolve = saturate(_DissolveAmount + IN.customData.x);
                float alphaMask = smoothstep(finalDissolve, finalDissolve + _Smoothness, combinedNoise);

                // Áp dụng Effect Mask cố định từ Local UV Space
                half staticMask = SAMPLE_TEXTURE2D(_EffectMask, sampler_MainTex, IN.uvStaticMask).r;
                alphaMask *= staticMask;

                clip(alphaMask - 0.001);

                half3 finalColor = proceduralColor * IN.color.rgb;
                half finalAlpha = alphaMask * IN.color.a;

                return half4(finalColor, finalAlpha);
            }
            ENDCG
        }
    }
}