Shader "Particles/Lightning_CustomBlend"
{
    Properties
    {
        [HDR]_TintColor("Tint Color", Color) = (0.5, 0.5, 0.5, 0.5)
        _MainTex("Particle Texture", 2D) = "white" {}
        _Gradient("Gradient Texture", 2D) = "white" {}
        _Stretch("Stretch", Range(-2, 2)) = 1.0
        _Offset("Offset", Range(-2, 2)) = 1.0
        _Speed("Speed", Range(-2, 2)) = 1.0

        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend("Source Blend", Float) = 1 
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend("Destination Blend", Float) = 10 
    }

    Category
    {
        Tags
        {
            "Queue"="Transparent"
            "IgnoreProjector"="True"
            "RenderType"="Transparent"
            "PreviewType"="Plane"
        }

        Blend [_SrcBlend] [_DstBlend]
        ColorMask RGB
        Cull Off Lighting Off ZWrite Off

        SubShader
        {
            Pass
            {
                CGPROGRAM
                #pragma vertex vert
                #pragma fragment frag
                #pragma target 3.0
                #pragma multi_compile_particles
                #pragma multi_compile_fog

                #include "UnityCG.cginc"

                sampler2D _MainTex, _Gradient;
                half4 _TintColor; // Tối ưu thành half

                float4 _MainTex_ST;
                float4 _Gradient_ST;
                half _Stretch, _Offset, _Speed; // Tối ưu thành half

                struct appdata_t
                {
                    float4 vertex : POSITION;
                    half4 color : COLOR;
                    float4 texcoord : TEXCOORD0;
                    UNITY_VERTEX_INPUT_INSTANCE_ID
                };

                struct v2f
                {
                    float4 vertex : SV_POSITION;
                    half4 color : COLOR;
                    float4 texcoord : TEXCOORD0;
                    float2 texcoord2 : TEXCOORD1;
                    UNITY_FOG_COORDS(2)
                    UNITY_VERTEX_OUTPUT_STEREO
                };

                v2f vert(appdata_t v)
                {
                    v2f o;
                    UNITY_SETUP_INSTANCE_ID(v);
                    UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                    o.vertex = UnityObjectToClipPos(v.vertex);
                    o.color = v.color;

                    o.texcoord.xy = TRANSFORM_TEX(v.texcoord, _MainTex);
                    o.texcoord2 = TRANSFORM_TEX(v.texcoord, _Gradient);

                    o.texcoord.z = v.texcoord.z;
                    o.texcoord.w = v.texcoord.w;

                    UNITY_TRANSFER_FOG(o, o.vertex);
                    return o;
                }

                half4 frag(v2f i) : SV_Target
                {
                    // Chuyển lifetime về half vì nó thường đi từ 0 -> 1
                    half lifetime = (half)i.texcoord.z;
                    float randomOffset = i.texcoord.w;

                    // Chuyển gradientFalloff về half
                    half gradientFalloff = 
                        smoothstep(0.99h, 0.95h, (half)i.texcoord2.x) * smoothstep(0.99h, 0.95h, 1.0h - (half)i.texcoord2.x);

                    // UV và Time bắt buộc phải giữ float để tránh rung giật hạt khi thời gian trôi lâu
                    float2 movingUV = float2(i.texcoord.x + randomOffset + (_Time.x * _Speed), i.texcoord.y);

                    half tex = tex2D(_MainTex, movingUV).r * gradientFalloff;

                    // Cutoff dùng step là một phép toán rất rẻ, kết quả ra 0 hoặc 1 nên dùng half
                    half cutoff = step(lifetime, tex);

                    // Tính toán UV cho Gradient (giữ float)
                    float2 uv = float2((tex * _Stretch) - lifetime + _Offset, 1.0);
                    half4 colorMap = tex2D(_Gradient, uv);

                    half4 col;
                    col.rgb = colorMap.rgb * _TintColor.rgb * i.color.rgb;
                    col.a = cutoff;
                    
                    // Nhân Alpha vào RGB để hỗ trợ Premultiplied Alpha
                    col.rgb *= col.a;

                    UNITY_APPLY_FOG_COLOR(i.fogCoord, col, half4(0,0,0,0));
                    return col;
                }
                ENDCG
            }
        }
    }
}