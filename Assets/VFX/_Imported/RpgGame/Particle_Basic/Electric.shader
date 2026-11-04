Shader "Custom/VFX/ElectricBeam"
{
    Properties
    {
        _MainTex ("Main Beam Texture", 2D) = "white" {}
        _NoiseTex ("Noise Texture", 2D) = "gray" {}
        _TintColor ("Tint Color", Color) = (0.3, 0.8, 2.0, 1)

        _CoreIntensity ("Core Intensity", Range(0, 10)) = 3
        _EdgeIntensity ("Edge Intensity", Range(0, 10)) = 2
        _BeamSoftness ("Beam Softness", Range(0.1, 8)) = 2
        _BeamWidth ("Beam Width Multiplier", Range(0.1, 3)) = 1

        _MainScrollX ("Main Scroll X", Float) = 2
        _MainScrollY ("Main Scroll Y", Float) = 0
        _NoiseScrollX ("Noise Scroll X", Float) = 3
        _NoiseScrollY ("Noise Scroll Y", Float) = 0

        _NoiseAmount ("Noise Amount", Range(0, 1)) = 0.15
        _DistortStrength ("Distort Strength", Range(0, 2)) = 0.25
        _DistortToEdge ("Distort More On Edge", Range(0, 3)) = 1

        _FresnelPower ("Fresnel Power", Range(0.1, 8)) = 3
        _FresnelIntensity ("Fresnel Intensity", Range(0, 10)) = 2

        _DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0
        _DissolveSoftness ("Dissolve Softness", Range(0.001, 0.5)) = 0.08
        _LengthFade ("Length Fade", Range(0, 4)) = 1
        _TipFade ("Tip Fade", Range(0, 4)) = 1
        _StartFade ("Start Fade", Range(0, 4)) = 1

        _WobbleAmp ("Wobble Amplitude", Range(0, 1)) = 0.06
        _WobbleFreq ("Wobble Frequency", Range(0, 30)) = 10
        _WobbleSpeed ("Wobble Speed", Float) = 5

        _Alpha ("Alpha", Range(0, 5)) = 1
        _UseAdditive ("Use Additive Blend", Float) = 1
        _ZWrite ("ZWrite", Float) = 0
        _Cull ("Cull", Float) = 0
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }

        Blend SrcAlpha One
        Cull Off
        ZWrite Off
        Lighting Off
        Fog { Mode Off }

        Pass
        {
            CGPROGRAM
            #pragma target 3.0
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            sampler2D _NoiseTex;

            float4 _MainTex_ST;
            float4 _NoiseTex_ST;
            float4 _TintColor;

            float _CoreIntensity;
            float _EdgeIntensity;
            float _BeamSoftness;
            float _BeamWidth;

            float _MainScrollX;
            float _MainScrollY;
            float _NoiseScrollX;
            float _NoiseScrollY;

            float _NoiseAmount;
            float _DistortStrength;
            float _DistortToEdge;

            float _FresnelPower;
            float _FresnelIntensity;

            float _DissolveAmount;
            float _DissolveSoftness;
            float _LengthFade;
            float _TipFade;
            float _StartFade;

            float _WobbleAmp;
            float _WobbleFreq;
            float _WobbleSpeed;

            float _Alpha;
            float _UseAdditive;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float4 color  : COLOR;
                float2 uv     : TEXCOORD0;
                float4 texcoord1 : TEXCOORD1;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                float2 uvNoise : TEXCOORD1;
                float4 color : COLOR;
                float3 worldPos : TEXCOORD2;
                float3 worldNormal : TEXCOORD3;
                float3 viewDir : TEXCOORD4;
                float4 custom : TEXCOORD5;
            };

            v2f vert(appdata v)
            {
                v2f o;

                float3 worldNormal = UnityObjectToWorldNormal(v.normal);
                float2 uv = TRANSFORM_TEX(v.uv, _MainTex);
                float2 uvNoise = TRANSFORM_TEX(v.uv, _NoiseTex);

                float t = _Time.y;
                float edgeMask = saturate(abs(v.uv.y - 0.5) * 2.0);
                float distortEdgeBoost = lerp(1.0, 1.0 + _DistortToEdge, edgeMask);

                float wobble =
                    sin(v.uv.x * _WobbleFreq + t * _WobbleSpeed) * 0.5 +
                    sin(v.uv.x * (_WobbleFreq * 1.73) - t * (_WobbleSpeed * 1.21)) * 0.5;

                float particleDistort = max(0.001, v.texcoord1.y);
                float wobbleOffset = wobble * _WobbleAmp * distortEdgeBoost * particleDistort;

                float4 finalVertex = v.vertex + float4(0, wobbleOffset, 0, 0);

                o.pos = UnityObjectToClipPos(finalVertex);
                o.uv = uv + float2(_MainScrollX, _MainScrollY) * t;
                o.uvNoise = uvNoise + float2(_NoiseScrollX, _NoiseScrollY) * t;
                o.color = v.color;
                o.worldPos = mul(unity_ObjectToWorld, finalVertex).xyz;
                o.worldNormal = worldNormal;
                o.viewDir = normalize(_WorldSpaceCameraPos.xyz - o.worldPos);
                o.custom = v.texcoord1;

                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float2 uv = i.uv;
                float2 uvNoise = i.uvNoise;

                float customDissolve = i.custom.x;
                float customDistort  = max(0.001, i.custom.y);
                float customBright   = max(0.001, i.custom.z);
                float customEdgePow  = max(0.001, i.custom.w);

                float noise1 = tex2D(_NoiseTex, uvNoise).r;
                float noise2 = tex2D(_NoiseTex, uvNoise * 1.73 + float2(0.13, 0.37)).g;
                float noiseCombined = lerp(noise1, noise2, 0.5);

                float edgeMask = saturate(abs((uv.y - 0.5) * 2.0 / max(0.001, _BeamWidth)));
                float centerMask = 1.0 - saturate(pow(edgeMask, _BeamSoftness));

                float distort = (noiseCombined - 0.5) * _DistortStrength * customDistort;
                distort *= lerp(1.0, 1.0 + _DistortToEdge, edgeMask);

                float2 mainUV = uv;
                mainUV.y += distort;

                fixed4 mainTex = tex2D(_MainTex, mainUV);

                float core = pow(saturate(centerMask), max(0.01, _BeamSoftness)) * _CoreIntensity;
                float edge = pow(saturate(1.0 - centerMask), max(0.01, 1.5 / customEdgePow)) * _EdgeIntensity * noiseCombined;

                float lenU = saturate(uv.x);
                float startFade = pow(saturate(lenU), max(0.001, _StartFade));
                float tipFade = pow(saturate(1.0 - lenU), max(0.001, _TipFade));
                float lengthMask = startFade * tipFade;
                lengthMask *= saturate(pow(sin(lenU * UNITY_PI), max(0.001, _LengthFade)) + 0.0001);

                float dissolveNoise = tex2D(_NoiseTex, uvNoise * 1.3 + float2(0.17, -0.11)).r;
                float dissolveControl = saturate(_DissolveAmount + customDissolve);
                float dissolve = smoothstep(
                    dissolveControl - _DissolveSoftness,
                    dissolveControl + _DissolveSoftness,
                    dissolveNoise
                );

                float alphaMask = (mainTex.r * 0.6 + mainTex.g * 0.4);
                alphaMask *= (core + edge);
                alphaMask *= lengthMask;
                alphaMask *= dissolve;
                alphaMask *= _Alpha;
                alphaMask *= i.color.a;
                alphaMask = saturate(alphaMask);

                float3 N = normalize(i.worldNormal);
                float3 V = normalize(i.viewDir);
                float fresnel = pow(1.0 - saturate(dot(N, V)), _FresnelPower) * _FresnelIntensity;

                float beamPattern = mainTex.r * 1.2 + mainTex.g * 0.8 + noiseCombined * _NoiseAmount;
                float emissive = (core + edge + fresnel) * beamPattern * customBright;

                float3 finalCol = _TintColor.rgb * emissive * i.color.rgb;

                return float4(finalCol, alphaMask);
            }
            ENDCG
        }
    }

    FallBack Off
}