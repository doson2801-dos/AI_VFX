Shader "Custom/UVNoise_DoubleSided_PureDissolve"
{
    Properties
    {
        [Header(Render Settings)]
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0 
        [KeywordEnum(Continuous, OneShot)] _Mode ("Scroll Mode", Float) = 0

        [Header(Main Texture)]
        _MainTex ("TEX", 2D) = "white" {}
        _TexPower ("Tex Power", Float) = 1.0
        [Space(5)]
        [Toggle] _FlipU ("Flip Main UV X", Float) = 0
        [Toggle] _FlipV ("Flip Main UV Y", Float) = 0

        [Header(Front Face Colors)]
        _Color ("Front Color", Color) = (1,1,1,1)
        [HDR] _GlowColor ("Front Glow Color", Color) = (0.5, 0.5, 0.5, 1)

        [Header(Back Face Colors)]
        _BackColor ("Back Color", Color) = (1,1,1,1)
        [HDR] _BackGlowColor ("Back Glow Color", Color) = (0.5, 0.5, 0.5, 1)

        [Header(Masking)]
        _Mask ("Mask", 2D) = "white" {}
        _MaskPower ("Mask Power", Range(0, 1)) = 0.0
        [Space(5)]
        [Toggle] _FlipMaskU ("Flip Mask UV X", Float) = 0
        [Toggle] _FlipMaskV ("Flip Mask UV Y", Float) = 0

        // ================= DISSOLVE THUẦN =================
        [Header(Dissolve Settings)]
        [Toggle] _UseDissolve ("Enable Dissolve", Float) = 0
        _DissolveTex ("Dissolve Noise Texture (Grayscale)", 2D) = "gray" {}
        _DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0.0
        _DissolveSmoothness ("Cut Smoothness", Range(0.001, 0.5)) = 0.02
        
        [Space(5)]
        _DissolveU ("Dissolve U Speed", Float) = 0.0
        _DissolveV ("Dissolve V Speed", Float) = 0.0
        // ===================================================

        [Header(Main Panning (Supports Custom Data))]
        _U ("Base Main U Speed", Float) = 1.0
        [Toggle] _RevU ("Reverse Main U Speed", Float) = 0
        _V ("Base Main V Speed", Float) = 1.0
        [Toggle] _RevV ("Reverse Main V Speed", Float) = 0

        [Header(Mask Panning Speeds)]
        _UCopy ("Mask U Speed (U_copy)", Float) = 1.0
        [Toggle] _RevUCopy ("Reverse Mask U Speed", Float) = 0
        _VCopy ("Mask V Speed (V_copy)", Float) = 1.0
        [Toggle] _RevVCopy ("Reverse Mask V Speed", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "IgnoreProjector"="True" }
        LOD 100

        Cull [_Cull]
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_particles
            #pragma multi_compile _MODE_CONTINUOUS _MODE_ONESHOT
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION; float2 uv : TEXCOORD0; float4 particleColor : COLOR;
                float4 customData1 : TEXCOORD1; float4 customData2 : TEXCOORD2; 
            };

            struct v2f
            {
                float4 vertex : SV_POSITION; float4 particleColor : COLOR;
                float4 packedUVs : TEXCOORD0; 
                float4 customData1 : TEXCOORD1; float4 customData2 : TEXCOORD2;
                float2 uv_Dissolve : TEXCOORD3; 
            };

            sampler2D _MainTex; float4 _MainTex_ST;
            sampler2D _Mask;    float4 _Mask_ST;
            sampler2D _DissolveTex; float4 _DissolveTex_ST;
            
            float4 _Color, _GlowColor, _BackColor, _BackGlowColor;
            float _UseDissolve, _DissolveAmount, _DissolveSmoothness;
            float _DissolveU, _DissolveV;

            float _U, _RevU, _V, _RevV;
            float _UCopy, _RevUCopy, _VCopy, _RevVCopy;
            float _FlipU, _FlipV, _FlipMaskU, _FlipMaskV;
            float _MaskPower, _TexPower;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);

                float2 mainUV = TRANSFORM_TEX(v.uv, _MainTex);
                float2 maskUV = TRANSFORM_TEX(v.uv, _Mask);
                o.uv_Dissolve = TRANSFORM_TEX(v.uv, _DissolveTex);

                mainUV.x = lerp(mainUV.x, 1.0 - mainUV.x, _FlipU);
                mainUV.y = lerp(mainUV.y, 1.0 - mainUV.y, _FlipV);
                maskUV.x = lerp(maskUV.x, 1.0 - maskUV.x, _FlipMaskU);
                maskUV.y = lerp(maskUV.y, 1.0 - maskUV.y, _FlipMaskV);

                o.packedUVs.xy = mainUV;
                o.packedUVs.zw = maskUV;

                o.particleColor = v.particleColor;
                o.customData1 = v.customData1;
                o.customData2 = v.customData2;

                return o;
            }

            fixed4 frag (v2f i, float facing : VFACE) : SV_Target
            {
                float2 uv_Main = i.packedUVs.xy; float2 uv_Mask = i.packedUVs.zw;
                float particleSpeedU = i.customData1.x; float particleSpeedV = i.customData1.y;
                float startOffsetX = i.customData1.z; float startOffsetY = i.customData1.w;
                float tilingU = max(i.customData2.x, 1.0); float tilingV = max(i.customData2.y, 1.0);
                float particleAge = i.customData2.z;

                float dir_U = lerp(1.0, -1.0, _RevU); float dir_V = lerp(1.0, -1.0, _RevV);
                float dir_UCopy = lerp(1.0, -1.0, _RevUCopy); float dir_VCopy = lerp(1.0, -1.0, _RevVCopy);

                float finalSpeedU = (_U * dir_U) + particleSpeedU;
                float finalSpeedV = (_V * dir_V) + particleSpeedV;

                float timeSource = 0;
                #if _MODE_CONTINUOUS
                    timeSource = _Time.y;       
                #else
                    timeSource = particleAge;   
                #endif

                float2 baseUV = uv_Main * float2(tilingU, tilingV);
                float2 uv_Main_Scrolled = baseUV + float2(startOffsetX, startOffsetY) + float2(finalSpeedU, finalSpeedV) * timeSource;
                float2 uv_Mask_Scrolled = uv_Mask + float2(_UCopy * dir_UCopy, _VCopy * dir_VCopy) * _Time.y;
                
                fixed4 mainTex = tex2D(_MainTex, uv_Main_Scrolled) * _TexPower;
                fixed4 maskTex = tex2D(_Mask, uv_Mask_Scrolled);

                float isFrontFace = step(0, facing);
                float4 activeColor = lerp(_BackColor, _Color, isFrontFace);
                float4 activeGlow  = lerp(_BackGlowColor, _GlowColor, isFrontFace);

                fixed4 finalColor = mainTex * activeColor * activeGlow * i.particleColor;
                
                // Base Alpha từ ảnh Mask
                float finalAlpha = lerp(1.0, maskTex.r, _MaskPower) * finalColor.a;

                // ================= TÍNH TOÁN DISSOLVE =================
                if (_UseDissolve > 0.5)
                {
                    float2 uv_Dissolve_Scrolled = i.uv_Dissolve + float2(_DissolveU, _DissolveV) * _Time.y;
                    float noiseVal = tex2D(_DissolveTex, uv_Dissolve_Scrolled).r;

                    // Chỉ cắt Alpha dựa trên ngưỡng Dissolve Amount
                    float cut = smoothstep(_DissolveAmount - _DissolveSmoothness, _DissolveAmount + _DissolveSmoothness, noiseVal);
                    finalAlpha *= cut;
                }
                // ======================================================

                finalColor.a = finalAlpha;
                return finalColor;
            }
            ENDCG
        }
    }
}