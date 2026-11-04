// Standard Properties for a VFX Shader
Shader "VFXLib/Star"

{
    Properties
    {
        [Header(Main Visuals)]
        [HDR] _BaseColor ("Base HDR Color", Color) = (2.0, 0.5, 0.0, 1.0) 
        
        // Size and Edge Settings
        [Toggle(USE_CUSTOM_SIZE)] _UseCustomSize ("Use Custom1.Y for Size", Float) = 0
        _ShapeSize ("Shape Size (Manual)", Range(0.1, 2.0)) = 1.0
        _EdgeSoftness ("Edge Softness (0 = Hard)", Range(0.0, 1.0)) = 0.0 

        [Header(Morph Settings)]
        // Morph settings: negative values pinch the star, 0 is star, 1 is diamond
        [Toggle(USE_CUSTOM_DATA)] _UseCustomData ("Use Custom1.X for Morph", Float) = 1
        _MorphValue ("Morph Value (Manual)", Range(-3.0, 1.0)) = 0.0

        [Header(Blending Options)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 1 
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 1
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "IgnoreProjector" = "True" }
        Pass
        {
            Blend [_SrcBlend] [_DstBlend] 
            ZWrite Off
            ZTest LEqual
            Cull Off 

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            // Compile variants for our two toggles
            #pragma shader_feature_local USE_CUSTOM_DATA 
            #pragma shader_feature_local USE_CUSTOM_SIZE

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float2 customData1 : TEXCOORD1; // Receives Custom Stream (X and Y)
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float2 uv : TEXCOORD0;
                float2 customData1 : TEXCOORD1; // Pass full float2 to fragment
            };

            float4 _BaseColor;
            float _ShapeSize;
            float _EdgeSoftness;
            float _MorphValue;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.customData1 = v.customData1; // Pass X (morph) and Y (size)
                return o;
            }

            float4 frag (v2f i) : SV_Target
            {
                // 1. Center and Offset UVs
                float2 uv = i.uv - 0.5;

                // 2. Absolute Distance for mirroring
                float2 absUV = abs(uv);

                // 3. Diamond Distance (Manhattan Distance)
                float rectDist = absUV.x + absUV.y;

                // 4. 4-Point Star Distance
                float starDist = pow(sqrt(absUV.x) + sqrt(absUV.y), 2.0);

                // 5. Setup Morph Amount
                float morphAmount;
                #if defined(USE_CUSTOM_DATA)
                    // Removed saturate() so Custom1.X can feed negative numbers to pinch the star
                    morphAmount = i.customData1.x;
                #else
                    morphAmount = _MorphValue;
                #endif

                // 6. Setup Shape Size
                float currentSize;
                #if defined(USE_CUSTOM_SIZE)
                    currentSize = i.customData1.y;
                #else
                    currentSize = _ShapeSize;
                #endif

                // 7. Apply Morph (Negative = Tight Star, 0 = Star, 1 = Diamond)
                float shapeDist = lerp(starDist, rectDist, morphAmount);

                // 8. Hard Edge Threshold (Smoothstep)
                float currentDist = shapeDist * 2.0;
                
                // Using currentSize variable which is driven by either the slider or Custom1.Y
                float innerEdge = currentSize - _EdgeSoftness - 0.001;
                float outerEdge = currentSize + _EdgeSoftness;
                
                float mask = 1.0 - smoothstep(innerEdge, outerEdge, currentDist);

                // 9. Final Color
                float4 finalColor = _BaseColor * mask;
                finalColor.a = mask * _BaseColor.a;

                return finalColor;
            }
            ENDHLSL
        }
    }
}