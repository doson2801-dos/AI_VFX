Shader "Custom/ScrollTexture_Particle"
{
    Properties
    {
        _MainTex ("Texture chính", 2D) = "white" {}
        [HDR] _Color ("Màu sắc mặc định (Tint Color)", Color) = (1,1,1,1)
        
        _ScrollSpeedX ("Tốc độ cuộn X", Float) = 0.5
        _ScrollSpeedY ("Tốc độ cuộn Y", Float) = 0.0
        
        [Header(Edge Fading)]
        [Toggle(_ENABLE_FADE_X)] _EnableFadeX ("Bật mờ 2 đầu (Tắt khi dùng Trail Tile)", Float) = 0
        _FadeSpreadX ("Độ mờ viền Trái/Phải", Range(0.001, 0.5)) = 0.1
        _FadeSpreadY ("Độ mờ viền Trên/Dưới", Range(0.001, 0.5)) = 0.1
        
        [Header(Blending)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend Mode", Float) = 5 // Mặc định: SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend Mode", Float) = 10 // Mặc định: OneMinusSrcAlpha
    }
    SubShader
    {
        Tags 
        { 
            "RenderType"="Transparent" 
            "Queue"="Transparent" 
            "IgnoreProjector"="True"
            "PreviewType"="Plane" 
        }
        
        ZWrite Off
        Blend [_SrcBlend] [_DstBlend]
        Cull Off 
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_particles
            #pragma shader_feature _ENABLE_FADE_X // Khai báo keyword cho Toggle
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                // Sửa thành float4 để hứng đầy đủ dữ liệu nâng cao từ Particle Trail
                float4 uv : TEXCOORD0; 
                float4 color : COLOR; 
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float2 uvTex : TEXCOORD0;  
                float2 uvEdge : TEXCOORD1; 
                half4 vertexColor : COLOR; // Đổi sang half4 để hỗ trợ dải màu rộng hơn
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            half4 _Color; // Đổi sang half4 cho HDR
            float _ScrollSpeedX;
            float _ScrollSpeedY;
            float _FadeSpreadX;
            float _FadeSpreadY;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.vertexColor = v.color; 
                
                // Chỉ lấy x, y cho tọa độ viền
                o.uvEdge = v.uv.xy;  
                
                o.uvTex = TRANSFORM_TEX(v.uv.xy, _MainTex);
                float2 scrollOffset = float2(_ScrollSpeedX, _ScrollSpeedY) * _Time.y;
                o.uvTex += scrollOffset;
                
                return o;
            }

            half4 frag (v2f i) : SV_Target // Dùng half4 cho output
            {
                half4 texColor = tex2D(_MainTex, i.uvTex);
                half4 finalColor = texColor * _Color * i.vertexColor;
                
                // --- THUẬT TOÁN LÀM MỜ VIỀN CẢI TIẾN ---
                // Fade trục Y (chiều rộng) luôn hoạt động ổn định kể cả khi Trail dài ra
                float fadeY = smoothstep(0.0, _FadeSpreadY, i.uvEdge.y) * smoothstep(1.0, 1.0 - _FadeSpreadY, i.uvEdge.y);
                float edgeMask = fadeY;
                
                // Trục X có thể bật/tắt để tránh lỗi với chế độ Trail Tile
                #if _ENABLE_FADE_X
                    float fadeX = smoothstep(0.0, _FadeSpreadX, i.uvEdge.x) * smoothstep(1.0, 1.0 - _FadeSpreadX, i.uvEdge.x);
                    edgeMask *= fadeX;
                #endif
                
                finalColor.a *= edgeMask;
                
                return finalColor;
            }
            ENDCG
        }
    }
}