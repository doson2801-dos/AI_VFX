Shader "Custom/Stylized_VFX_SoftEdge_Pro"
{
    Properties
    {
        [Header(Main Settings)]
        _MainTex ("Main Texture", 2D) = "white" {}
        [HDR] _Color ("Tint Color", Color) = (1,1,1,1)
        
        [Header(Scrolling Control)]
        _ScrollDistanceX ("Scroll Distance X", Float) = 1.0
        _ScrollDistanceY ("Scroll Distance Y", Float) = 0.0
        [Toggle] _Loop ("Loop Texture (Repeat)", Float) = 0
        [Toggle] _UseTime ("Use System Time (Global)", Float) = 0

        [Header(Edge Smoothing)]
        _EdgeSoftness ("Edge Softness", Range(0.0001, 0.5)) = 0.05

        [Header(Boundary Masking)]
        _MaskTex ("Boundary Mask (Static)", 2D) = "white" {}

        [Header(Dissolve System)]
        _DissolveTex ("Dissolve Texture (Static)", 2D) = "white" {}
        _DissolveSoftness ("Dissolve Softness", Range(0.0001, 0.5)) = 0.1
        
        [Header(Blending)]
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5 
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10 
    }

    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "IgnoreProjector"="True" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata {
                float4 vertex   : POSITION;
                float4 texcoord : TEXCOORD0; 
                float4 texcoord1: TEXCOORD1; // x: dissolve, y: progress, zw: dissolve offset
                float4 color    : COLOR;
            };

            struct v2f {
                float4 pos      : SV_POSITION;
                float2 uv_main  : TEXCOORD0;
                float2 uv_static: TEXCOORD1;
                float4 custom   : TEXCOORD2; 
                float4 color    : COLOR;
            };

            sampler2D _MainTex; float4 _MainTex_ST;
            sampler2D _MaskTex;
            sampler2D _DissolveTex;
            float _ScrollDistanceX, _ScrollDistanceY;
            float _Loop, _UseTime, _DissolveSoftness, _EdgeSoftness;
            float4 _Color;

            v2f vert (appdata v) {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv_static = v.texcoord.xy;
                
                // Sử dụng Progress từ Particle (kênh Y) hoặc Time hệ thống [cite: 9]
                float drive = lerp(v.texcoord1.y, _Time.y, _UseTime);
                
                float2 offset = float2(_ScrollDistanceX, _ScrollDistanceY) * drive;
                o.uv_main = TRANSFORM_TEX(v.texcoord.xy, _MainTex) + offset;
                
                o.custom = v.texcoord1;
                o.color = v.color;
                return o;
            }

            half4 frag (v2f i) : SV_Target {
                float2 uv = i.uv_main;
                float softEdgeMask = 1.0;

                // --- LOGIC SOFT CLIPPING ---
                if (_Loop < 0.5) {
                    // Tạo dải mờ dần ở 4 cạnh UV thay vì cắt sắc
                    float2 edge = smoothstep(0.0, _EdgeSoftness, uv) * smoothstep(1.0, 1.0 - _EdgeSoftness, uv);
                    softEdgeMask = edge.x * edge.y;
                }

                // Vẫn dùng clip để loại bỏ hoàn toàn các pixel có alpha bằng 0 nhằm tối ưu hiệu năng [cite: 78]
                clip(softEdgeMask - 0.001);

                half4 mainTex = tex2D(_MainTex, uv);
                half4 mask = tex2D(_MaskTex, i.uv_static);
                
                // Dissolve logic sử dụng smoothstep cho độ mượt cao [cite: 52]
                float2 dUV = i.uv_static + i.custom.zw;
                half dTex = tex2D(_DissolveTex, dUV).r;
                half dAlpha = smoothstep(i.custom.x, i.custom.x + _DissolveSoftness, dTex);
                
                half4 col = mainTex * _Color * i.color;
                
                // Kết hợp toàn bộ Alpha bao gồm Soft Edge Mask
                col.a *= mask.r * dAlpha * softEdgeMask;
                
                return col;
            }
            ENDCG
        }
    }
}