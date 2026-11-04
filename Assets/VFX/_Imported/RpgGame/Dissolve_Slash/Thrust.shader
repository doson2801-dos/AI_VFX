Shader "Custom/RPG/ThrustEffect_FinalSoft_CustomData_UV2_LengthFade_Instanced"
{
    Properties
    {
        [Header(Blend Settings)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 5 
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10 
        
        [Enum(UnityEngine.Rendering.CullMode)] _CullMode ("Cull Mode", Float) = 2 

        [Toggle] _FadeBothEnds ("Fade Both Ends (Double Fade)", Float) = 0

        [Space(10)]
        [Header(Main Textures)]
        _MainTex ("Main Mask", 2D) = "white" {}
        _NoiseTex ("Flow Noise", 2D) = "gray" {}
        _DissolveTex ("Dissolve Tex", 2D) = "gray" {}

        [HDR]_ColorInner ("Inner Color", Color) = (1.0, 0.85, 0.35, 1)
        [HDR]_ColorOuter ("Outer Color", Color) = (1.0, 0.45, 0.10, 1)
        [HDR]_EdgeColor  ("Dissolve Edge Color", Color) = (1.0, 0.95, 0.65, 1)

        _NoiseScroll1 ("Noise Scroll 1 (X,Y)", Vector) = (0, -2.0, 0, 0)
        _NoiseScroll2 ("Noise Scroll 2 (X,Y)", Vector) = (0, -3.2, 0, 0)
        _NoiseTiling1 ("Noise Tiling 1", Vector) = (1.0, 2.0, 0, 0)
        _NoiseTiling2 ("Noise Tiling 2", Vector) = (2.0, 3.0, 0, 0)
        _NoiseStrength ("Noise Strength", Range(0,2)) = 0.7

        _Opacity ("Opacity", Range(0,5)) = 1.5
        _LengthFade ("Base Length Fade", Range(0.1,6)) = 1.8
        _CustomLengthMultiplier ("Custom Length Multiplier", Range(-5,5)) = 1.0 
        _TipFade ("Tip Fade", Range(0.1,6)) = 2.0
        _MainMaskPower ("Main Mask Power", Range(0.1,4)) = 1.0

        _ViewEdgeFade ("View Edge Fade", Range(0,1)) = 0.2

        _FresnelPower ("Fresnel Power", Range(0.1,8)) = 2.0
        _FresnelColorStrength ("Fresnel Color Strength", Range(0,3)) = 0.35

        _VertexWobble ("Vertex Wobble", Range(0,0.5)) = 0.03
        _VertexSpeed ("Vertex Speed", Float) = 3.0
        _VertexFrequency ("Vertex Frequency", Float) = 6.0

        _Dissolve ("Base Dissolve", Range(0,1)) = 0
        _CustomDissolveMultiplier ("Custom Dissolve Multiplier", Range(0,2)) = 1
        _DissolveSoftness ("Dissolve Softness", Range(0.001,0.5)) = 0.08
        _EdgeIntensity ("Edge Intensity", Range(0,5)) = 1.5
        
        _DissolveScroll ("Dissolve Scroll (X,Y)", Vector) = (0, -0.5, 0, 0)
        
        _DirectionalDissolve ("Directional Dissolve", Range(0,1)) = 0.6
        _DissolveDirection ("Dissolve Direction", Range(0,1)) = 1

        _InvertY ("Invert UV Y", Range(0,1)) = 0
    }

    SubShader
    {
        Tags
        {
            "Queue"="Transparent"
            "RenderType"="Transparent"
            "IgnoreProjector"="True"
        }

        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull [_CullMode] 
        Lighting Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing 
            
            #pragma shader_feature _FADEBOTHENDS_ON

            #include "UnityCG.cginc" 

            sampler2D _MainTex;
            sampler2D _NoiseTex;
            sampler2D _DissolveTex;

            float4 _MainTex_ST;
            float4 _NoiseTex_ST;
            float4 _DissolveTex_ST;

            // [TỐI ƯU] Chuyển biến màu và các hệ số sang half (16-bit)
            half4 _ColorInner, _ColorOuter, _EdgeColor;

            float4 _NoiseScroll1, _NoiseScroll2; 
            half4 _NoiseTiling1, _NoiseTiling2;
            half _NoiseStrength;

            half _Opacity, _LengthFade, _CustomLengthMultiplier, _TipFade, _MainMaskPower;
            half _ViewEdgeFade;
            half _FresnelPower, _FresnelColorStrength;

            half _VertexWobble, _VertexSpeed, _VertexFrequency;

            half _Dissolve, _CustomDissolveMultiplier, _DissolveSoftness;
            half _EdgeIntensity, _DirectionalDissolve, _DissolveDirection, _InvertY;
            float4 _DissolveScroll;

            struct appdata
            {
                float4 vertex    : POSITION;
                float3 normal    : NORMAL;
                float4 color     : COLOR;     
                float4 texcoord0 : TEXCOORD0;  
                float4 texcoord1 : TEXCOORD1;  
                
                UNITY_VERTEX_INPUT_INSTANCE_ID 
            };

            struct v2f
            {
                float4 pos           : SV_POSITION;
                half4 color          : COLOR;
                float4 uv_custom     : TEXCOORD0; 
                
                // [TỐI ƯU] Bỏ worldPos, worldNorm, viewDir để tiết kiệm bộ nhớ interpolator
                // Chỉ truyền 1 giá trị Fresnel xuống Fragment
                half fresnel         : TEXCOORD1; 

                UNITY_VERTEX_INPUT_INSTANCE_ID 
            };

            v2f vert(appdata v)
            {
                v2f o;

                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_TRANSFER_INSTANCE_ID(v, o);

                float2 uv = TRANSFORM_TEX(v.texcoord0.xy, _MainTex);
                
                half customDissolve = v.texcoord1.x; 
                half customLength = v.texcoord1.y; 

                if (_InvertY > 0.5)
                    uv.y = 1.0 - uv.y;

                float angleWave = sin(uv.x * 6.2831853 * _VertexFrequency + _Time.y * _VertexSpeed);
                float lengthMask = pow(saturate(1.0 - uv.y), 1.2);

                float3 localOffset = v.normal * angleWave * _VertexWobble * lengthMask;
                float4 localPos = v.vertex + float4(localOffset, 0.0);

                o.pos = UnityObjectToClipPos(localPos);
                
                o.uv_custom.xy = uv;
                o.uv_custom.z = customDissolve;
                o.uv_custom.w = customLength; 
                o.color = v.color; 

                // [TỐI ƯU] Tính Fresnel tại Vertex thay vì Fragment
                float3 worldPos = mul(unity_ObjectToWorld, localPos).xyz;
                float3 worldNorm = UnityObjectToWorldNormal(v.normal);
                float3 viewDir = _WorldSpaceCameraPos.xyz - worldPos; 
                
                float3 N = normalize(worldNorm);
                float3 V = normalize(viewDir);
                o.fresnel = pow(1.0 - saturate(dot(N, V)), _FresnelPower);

                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(i);

                // Giữ float cho UV để tránh lỗi chính xác khi chơi game lâu (time lớn)
                float2 uv = i.uv_custom.xy; 
                half customDissolve = i.uv_custom.z;
                half customLength = i.uv_custom.w; 

                half fadeUV = 1.0 - uv.y; 
                
                #if defined(_FADEBOTHENDS_ON)
                    fadeUV = 1.0 - abs(uv.y - 0.5) * 2.0;
                #endif

                float2 noiseUV1 = uv * _NoiseTiling1.xy + (_NoiseScroll1.xy * _Time.y);
                float2 noiseUV2 = uv * _NoiseTiling2.xy + (_NoiseScroll2.xy * _Time.y);

                half noise1 = tex2D(_NoiseTex, noiseUV1).r;
                half noise2 = tex2D(_NoiseTex, noiseUV2).r;
                half flowNoise = lerp(noise1, noise2, 0.5);
                flowNoise = lerp(1.0, flowNoise, _NoiseStrength);

                half mainMask = tex2D(_MainTex, uv).r;
                mainMask = pow(saturate(mainMask), _MainMaskPower);

                half finalLengthFadeExponent = max(0.01, _LengthFade + customLength * _CustomLengthMultiplier);
                half lengthFade = pow(saturate(fadeUV), finalLengthFadeExponent);
                
                half tipFade = saturate(1.0 - pow(1.0 - fadeUV, _TipFade));

                // [TỐI ƯU] Nhận giá trị fresnel đã tính từ Vertex Shader
                half fresnel = i.fresnel; 

                half3 col = lerp(_ColorOuter.rgb, _ColorInner.rgb, lengthFade);

                half alpha = mainMask * flowNoise * lengthFade * tipFade;
                alpha *= _Opacity;

                alpha *= lerp(1.0, 1.0 - fresnel, _ViewEdgeFade);
                col += _EdgeColor.rgb * fresnel * _FresnelColorStrength * lengthFade;

                float2 dissolveUV = TRANSFORM_TEX(uv, _DissolveTex);
                dissolveUV += (_DissolveScroll.xy * _Time.y);

                half dissolveNoise = tex2D(_DissolveTex, dissolveUV).r;
                half directionalY = lerp(uv.y, 1.0 - uv.y, _DissolveDirection);
                half dissolveTex = lerp(dissolveNoise, directionalY, _DirectionalDissolve);

                half finalDissolve = saturate(_Dissolve + customDissolve * _CustomDissolveMultiplier);
                half dissolveFactor = 1.0 - finalDissolve;

                half dissolveMask = smoothstep(
                    dissolveFactor - _DissolveSoftness,
                    dissolveFactor + _DissolveSoftness,
                    dissolveTex
                );

                alpha *= dissolveMask;

                half edgeBand = smoothstep(dissolveFactor - _DissolveSoftness * 0.5, dissolveFactor, dissolveTex) -
                                 smoothstep(dissolveFactor, dissolveFactor + _DissolveSoftness * 0.5, dissolveTex);

                col += _EdgeColor.rgb * edgeBand * _EdgeIntensity;

                col *= i.color.rgb;
                alpha *= i.color.a;

                half finalAlpha = saturate(alpha);
                return half4(col * finalAlpha, finalAlpha);
            }
            ENDCG
        }
    }
}