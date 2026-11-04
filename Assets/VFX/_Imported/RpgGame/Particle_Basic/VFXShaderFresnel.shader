Shader "VFXLib/VFXFresnel"


{
    Properties
    {
        [Header(Render Settings)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 5 // 5 is SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10 // 10 is OneMinusSrcAlpha
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 2 // 2 is Back
        [Enum(Off, 0, On, 1)] _ZWrite ("ZWrite", Float) = 0
        
        [Header(Global Adjustments)]
        _TextureIntensity ("Final Color Intensity", Range(0, 10)) = 1.0
        [Toggle(_USECUSTOMUV1_ON)] _UseCustomUV1Intensity ("Use Custom UV1.X for Intensity?", Float) = 0
        _OpacityStrength ("Final Opacity Strength", Range(0, 10)) = 1.0

        [Header(Main Textures)]
        [HDR] _BaseColor ("Base Color", Color) = (1, 1, 1, 1)
        _MainTex ("Main Texture (RGB)", 2D) = "white" {}
        _MainTexPanSpeed ("Main Texture Panning (XY)", Vector) = (0, 0, 0, 0)
        _MaskTex ("Mask Texture (R)", 2D) = "white" {}
        [Toggle(_USERFORALPHA_ON)] _UseRForAlpha ("Use MainTex 'R' channel for Alpha?", Float) = 0
        
        [Space(10)]
        _BaseVisibility ("Base Visibility (Hide Base)", Range(0, 1)) = 1.0
        
        [Header(Dissolve Settings)]
        _DissolveTex ("Dissolve Noise", 2D) = "white" {}
        _DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0.0
        _DissolvePanSpeed ("Dissolve Panning (XY)", Vector) = (0, 0, 0, 0)
        _DissolveEdgeWidth ("Dissolve Edge Width", Range(0, 0.5)) = 0.05
        [HDR] _DissolveEdgeColor ("Dissolve Edge Color", Color) = (1, 1, 1, 1)

        [Header(Fresnel Settings)]
        [Toggle(_USEFRESNEL_ON)] _UseFresnel ("Enable Fresnel?", Float) = 1
        [HDR] _FresnelColor ("Fresnel Color", Color) = (1, 0.5, 0, 1)
        _FresnelPower ("Base Fresnel Power", Range(0.1, 10)) = 2.0
        
        [Header(Fresnel Alpha Blend)]
        _FresnelAlphaAdd ("Add Fresnel to Alpha", Range(0, 5)) = 1.0
        _FresnelAlphaSubtract ("Subtract Fresnel from Alpha", Range(0, 5)) = 0.0
        
        [Space(10)]
        _FresnelNoiseTex ("Fresnel Distortion Noise", 2D) = "white" {}
        _FresnelNoisePanSpeed ("Noise Panning (XY)", Vector) = (0, 0.5, 0, 0)
        _FresnelDistortStrength ("Power Distortion Strength", Range(0, 10)) = 3.0
        _FresnelMinBrightness ("Minimum Edge Brightness", Range(0, 1)) = 0.3
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        LOD 100
        
        Blend [_SrcBlend] [_DstBlend]
        ZWrite [_ZWrite]
        Cull [_Cull]

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma shader_feature _USERFORALPHA_ON
            #pragma shader_feature _USEFRESNEL_ON
            #pragma shader_feature _USECUSTOMUV1_ON
            
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float4 color : COLOR; // Particle Color
                float2 uv : TEXCOORD0;
                float4 uv1 : TEXCOORD1; // Custom UV stream from particles
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float4 color : COLOR;
                float2 uvMain : TEXCOORD0;
                float2 uvDissolve : TEXCOORD1;
                float2 uvNoise : TEXCOORD3;
                float3 worldNormal : NORMAL;
                float3 viewDir : TEXCOORD4;
                float customIntensity : TEXCOORD5;
            };

            float _TextureIntensity;
            float _OpacityStrength;

            float4 _BaseColor;
            sampler2D _MainTex; float4 _MainTex_ST;
            float2 _MainTexPanSpeed;
            sampler2D _MaskTex;
            float _BaseVisibility;
            
            sampler2D _DissolveTex; float4 _DissolveTex_ST;
            float _DissolveAmount;
            float2 _DissolvePanSpeed;
            float _DissolveEdgeWidth;
            float4 _DissolveEdgeColor;
            
            float4 _FresnelColor;
            float _FresnelPower;
            float _FresnelAlphaAdd;
            float _FresnelAlphaSubtract;
            
            sampler2D _FresnelNoiseTex; float4 _FresnelNoiseTex_ST;
            float2 _FresnelNoisePanSpeed;
            float _FresnelDistortStrength;
            float _FresnelMinBrightness;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                
                // Pass Particle Color and Custom UV Intensity
                o.color = v.color;
                o.customIntensity = v.uv1.x;
                
                // Panning UVs
                o.uvMain = TRANSFORM_TEX(v.uv, _MainTex) + (_MainTexPanSpeed * _Time.y);
                o.uvDissolve = TRANSFORM_TEX(v.uv, _DissolveTex) + (_DissolvePanSpeed * _Time.y);
                o.uvNoise = TRANSFORM_TEX(v.uv, _FresnelNoiseTex) + (_FresnelNoisePanSpeed * _Time.y);
                
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.viewDir = WorldSpaceViewDir(v.vertex);
                
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // 1. Base Textures
                fixed4 mainCol = tex2D(_MainTex, i.uvMain) * _BaseColor;
                fixed mask = tex2D(_MaskTex, i.uvMain).r;
                
                float baseAlpha = mainCol.a;
                #if _USERFORALPHA_ON
                    baseAlpha = mainCol.r;
                #endif
                baseAlpha *= mask;
                
                float actualBaseAlpha = baseAlpha * _BaseVisibility;
                float3 actualBaseColor = mainCol.rgb * _BaseVisibility;

                // 2. Dissolve
                float dissolveNoise = tex2D(_DissolveTex, i.uvDissolve).r;
                clip(dissolveNoise - _DissolveAmount); 
                
                float edgeFactor = smoothstep(_DissolveAmount, _DissolveAmount + _DissolveEdgeWidth, dissolveNoise);
                float3 finalBaseRGB = lerp((_DissolveEdgeColor.rgb * _BaseVisibility), actualBaseColor, edgeFactor);

                // 3. Fresnel
                float4 finalFresnel = float4(0,0,0,0);
                float fresnelIntensity = 0;
                
                #if _USEFRESNEL_ON
                    float noiseVal = tex2D(_FresnelNoiseTex, i.uvNoise).r;
                    
                    float dynamicPower = _FresnelPower + (noiseVal * _FresnelDistortStrength);
                    float ndotv = saturate(dot(normalize(i.worldNormal), normalize(i.viewDir)));
                    float fresnelTerm = pow(1.0 - ndotv, dynamicPower);
                    
                    float safeNoiseVal = lerp(_FresnelMinBrightness, 1.0, noiseVal);
                    fresnelTerm *= safeNoiseVal; 
                    
                    finalFresnel = _FresnelColor * fresnelTerm;
                    
                    fresnelIntensity = fresnelTerm * _FresnelColor.a;
                #endif

                // 4. Combine Everything
                fixed4 output;
                
                // Determine Final Intensity Factor
                float currentIntensity = _TextureIntensity;
                #if _USECUSTOMUV1_ON
                    currentIntensity *= i.customIntensity;
                #endif
                
                // Apply Intensity to RGB
                output.rgb = (finalBaseRGB + finalFresnel.rgb) * currentIntensity;
                
                // Process Alpha
                float combinedAlpha = actualBaseAlpha;
                combinedAlpha += (fresnelIntensity * _FresnelAlphaAdd);
                combinedAlpha -= (fresnelIntensity * _FresnelAlphaSubtract);
                output.a = saturate(combinedAlpha * _OpacityStrength);
                
                // 5. Multiply by Particle System Vertex Color & Alpha
                output.rgb *= i.color.rgb;
                output.a *= i.color.a;
                
                return output;
            }
            ENDCG
        }
    }
}