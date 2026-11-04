Shader "Custom/SimpleTextureSheet_Additive"
{
    Properties
    {
        _MainTex ("Sprite Sheet Texture", 2D) = "white" {}
        [HDR] _Color ("Tint Color", Color) = (1,1,1,1)
        
        [Header(Grid Settings)]
        _Columns ("Columns (X)", Float) = 4.0
        _Rows ("Rows (Y)", Float) = 4.0
        _Speed ("Animation Speed (FPS)", Float) = 12.0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "IgnoreProjector"="True" }
        
        // BẢN CẬP NHẬT: Đổi sang Additive Blending
        // Blend One One: Cộng thẳng màu, khử đen tuyệt đối (tốt nhất nếu ảnh của bạn không có kênh Alpha).
        // Nếu ảnh của bạn có kênh Alpha và bạn muốn dùng nó để kiểm soát độ sáng, hãy dùng: Blend SrcAlpha One
        Blend One One 
        
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float4 color : COLOR; 
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 color : COLOR;
            };

            sampler2D _MainTex;
            float4 _Color;
            float _Columns;
            float _Rows;
            float _Speed;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv; 
                o.color = v.color;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float totalFrames = _Columns * _Rows;
                float currentFrame = floor(fmod(_Time.y * _Speed, totalFrames));
                
                float column = fmod(currentFrame, _Columns);
                float row = floor(currentFrame / _Columns);
                
                float2 cellSize = float2(1.0 / _Columns, 1.0 / _Rows);
                float2 finalUV = i.uv * cellSize;
                
                finalUV.x += column * cellSize.x;
                finalUV.y += (_Rows - 1.0 - row) * cellSize.y; 

                // Đọc texture và nhân với màu Tint + màu của Particle (nếu có)
                fixed4 col = tex2D(_MainTex, finalUV) * _Color * i.color;
                
                return col;
            }
            ENDCG
        }
    }
}