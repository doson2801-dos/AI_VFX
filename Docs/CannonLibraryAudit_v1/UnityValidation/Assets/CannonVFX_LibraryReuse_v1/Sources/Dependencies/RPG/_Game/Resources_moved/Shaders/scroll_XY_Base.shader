Shader "Custom/MinimalScrollTransparent_VertexColor_Advanced"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        [HDR]_Color ("Tint Color (HDR)", Color) = (1,1,1,1)
        _Opacity ("Base Opacity", Range(0, 1)) = 1.0

        [Header(Blend Mode)] // <--- TÍNH NĂNG MỚI: Tùy chỉnh Blend Mode
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Source Blend", Float) = 5 // Mặc định là 5 (SrcAlpha)
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Destination Blend", Float) = 10 // Mặc định là 10 (OneMinusSrcAlpha)

        [Header(Custom Streams)]
        _CustomOffsetXStrength ("Offset X Strength", Range(0, 5)) = 1.0
        _CustomOffsetYStrength ("Offset Y Strength", Range(0, 10)) = 1.0
        _CustomOpacityStrength ("Opacity Strength", Range(0, 1)) = 1.0
        _CustomOffsetCenter ("Offset Center", Range(0,1)) = 0.5

        [Header(Fading Settings)]
        _FadeStartY ("Fade Start Y", Range(0,1)) = 0.6
        _FadeEndY ("Fade End Y", Range(0,1)) = 1.0
        _SideFadeStart ("Side Fade Start", Range(0,1)) = 0.5
        _SideFadeEnd ("Side Fade End", Range(0,1)) = 1.0

        [Header(Dissolve)]
        _DissolveSmoothness ("Dissolve Smoothness", Range(0.01, 0.5)) = 0.1
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        ZWrite Off
        
        // <--- TÍNH NĂNG MỚI: Dùng biến từ Properties thay vì fix cứng
        Blend [_SrcBlend] [_DstBlend] 
        
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
                float2 uv     : TEXCOORD0;
                float4 color  : COLOR;      
                float4 custom : TEXCOORD1; // X: OffX, Y: OffY, Z: Opacity, W: Progress
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 color : COLOR;
                float opacityMul : TEXCOORD1; 
                float progress   : TEXCOORD2; 
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;
            float _Opacity;
            float _CustomOffsetXStrength, _CustomOffsetYStrength, _CustomOpacityStrength, _CustomOffsetCenter;
            float _FadeStartY, _FadeEndY, _SideFadeStart, _SideFadeEnd;
            float _DissolveSmoothness;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                
                // 1. Giữ nguyên logic UV Offset của bạn
                float2 uv = TRANSFORM_TEX(v.uv, _MainTex);
                float offsetX = (v.custom.x - _CustomOffsetCenter) * 2.0;
                float offsetY = (v.custom.y - _CustomOffsetCenter) * 2.0;
                uv.x += offsetX * _CustomOffsetXStrength;
                uv.y += offsetY * _CustomOffsetYStrength;
                o.uv = uv;

                // 2. Giữ nguyên logic Opacity từ Custom.Z
                o.opacityMul = lerp(1.0, saturate(v.custom.z), _CustomOpacityStrength);
                
                // 3. Lấy thêm Custom.W để làm biến điều khiển (Progress)
                o.progress = v.custom.w;

                o.color = v.color;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 tex = tex2D(_MainTex, i.uv);

                // ===== TÍNH NĂNG MỚI 1: DISSOLVE THEO TEXTURE =====
                float brightness = dot(tex.rgb, float3(0.3, 0.59, 0.11));
                float dissolve = smoothstep(1.0 - i.progress, (1.0 - i.progress) + _DissolveSmoothness, brightness);

                // ===== TÍNH NĂNG MỚI 2: MỞ DẦN VỀ CÁC CẠNH =====
                float fadeY = 1.0 - smoothstep(_FadeStartY * i.progress, _FadeEndY, i.uv.y);
                
                float side = abs(i.uv.x - 0.5) * 2.0;
                float fadeX = 1.0 - smoothstep(_SideFadeStart * i.progress, _SideFadeEnd, side);

                // ===== TỔNG HỢP ALPHA =====
                fixed4 col = tex * _Color * i.color;
                
                col.a *= _Opacity * i.opacityMul * i.color.a; // Các thuộc tính cũ của bạn
                col.a *= fadeX * fadeY;                      // Hiệu ứng mở cạnh
                col.a *= dissolve;                           // Hiệu ứng tan biến

                return col;
            }
            ENDCG
        }
    }
}