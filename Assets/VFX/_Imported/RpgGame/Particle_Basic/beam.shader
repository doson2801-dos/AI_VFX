Shader "Custom/VFX/BeamLightGaussian"
{
    Properties
    {
        [HDR]_CoreColor ("Core Color", Color) = (1,1,1,1)
        [HDR]_GlowColor ("Glow Color", Color) = (0.85,0.35,1,1)

        _CoreSize ("Core Size", Range(0.001, 1)) = 0.08
        _GlowSize ("Glow Size", Range(0.001, 2)) = 0.28

        _CoreIntensity ("Core Intensity", Range(0, 20)) = 3.0
        _GlowIntensity ("Glow Intensity", Range(0, 20)) = 1.5

        _LengthFade ("Length Fade", Range(0, 0.5)) = 0.03
        _EdgeFadeY ("Edge Fade Y", Range(0, 1)) = 0.0

        _PulseSpeed ("Pulse Speed", Range(0, 20)) = 0.0
        _PulseAmount ("Pulse Amount", Range(0, 1)) = 0.0

        _NoiseTex ("Noise Tex", 2D) = "gray" {}
        _NoiseAmount ("Noise Amount", Range(0, 0.2)) = 0.0
        _NoiseTilingX ("Noise Tiling X", Range(0.1, 20)) = 4.0
        _NoiseTilingY ("Noise Tiling Y", Range(0.1, 20)) = 1.0
        _NoiseScrollX ("Noise Scroll X", Range(-10, 10)) = 0.0
        _NoiseScrollY ("Noise Scroll Y", Range(-10, 10)) = 0.0

        _MainTex ("Mask Tex", 2D) = "white" {}
    }

    SubShader
    {
        Tags
        {
            "Queue"="Transparent"
            "RenderType"="Transparent"
            "IgnoreProjector"="True"
        }

        Blend One One
        ZWrite Off
        Cull Off
        Lighting Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            float4 _MainTex_ST;

            sampler2D _NoiseTex;
            float4 _NoiseTex_ST;

            float4 _CoreColor;
            float4 _GlowColor;

            float _CoreSize;
            float _GlowSize;
            float _CoreIntensity;
            float _GlowIntensity;

            float _LengthFade;
            float _EdgeFadeY;

            float _PulseSpeed;
            float _PulseAmount;

            float _NoiseAmount;
            float _NoiseTilingX;
            float _NoiseTilingY;
            float _NoiseScrollX;
            float _NoiseScrollY;

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv     : TEXCOORD0;
                float4 color  : COLOR;
            };

            struct v2f
            {
                float4 pos   : SV_POSITION;
                float2 uv    : TEXCOORD0;
                float4 color : COLOR;
            };

            v2f vert (appdata v)
            {
                v2f o;
                o.pos   = UnityObjectToClipPos(v.vertex);
                o.uv    = TRANSFORM_TEX(v.uv, _MainTex);
                o.color = v.color;
                return o;
            }

            float gaussian1D(float x, float sigma)
            {
                sigma = max(sigma, 0.0001);
                return exp(-(x * x) / (2.0 * sigma * sigma));
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float2 uv = i.uv;

                float distY = abs(uv.y - 0.5);

                // noise làm beam organic hơn một chút
                float2 noiseUV = uv * float2(_NoiseTilingX, _NoiseTilingY);
                noiseUV += float2(_NoiseScrollX, _NoiseScrollY) * _Time.y;
                float noise = tex2D(_NoiseTex, noiseUV).r;
                noise = (noise - 0.5) * 2.0; // -1 -> 1

                float distortedDistY = distY + noise * _NoiseAmount;

                // gaussian core + gaussian glow
                float core = gaussian1D(distortedDistY, _CoreSize);
                float glow = gaussian1D(distortedDistY, _GlowSize);

                // glow phải bao core, nhưng không bị hard cut
                glow = max(glow - core * 0.15, 0.0);

                // fade ở hai đầu chiều dài beam
                float leftFade = smoothstep(0.0, _LengthFade, uv.x);
                float rightFade = smoothstep(0.0, _LengthFade, 1.0 - uv.x);
                float lengthMask = leftFade * rightFade;

                // optional fade nhẹ theo chiều dọc ngoài rìa
                float yEdgeMask = 1.0;
                if (_EdgeFadeY > 0.0001)
                {
                    float yFromCenter = abs(uv.y - 0.5) * 2.0;
                    yEdgeMask = 1.0 - smoothstep(1.0 - _EdgeFadeY, 1.0, yFromCenter);
                }

                float pulse = 1.0;
                if (_PulseAmount > 0.0001 && _PulseSpeed > 0.0001)
                {
                    pulse = 1.0 + sin(_Time.y * _PulseSpeed) * _PulseAmount;
                }

                float mask = tex2D(_MainTex, uv).r;

                float3 glowCol = _GlowColor.rgb * glow * _GlowIntensity;
                float3 coreCol = _CoreColor.rgb * core * _CoreIntensity;

                // cộng màu mềm, không tách lớp cứng
                float3 finalCol = (glowCol + coreCol) * lengthMask * yEdgeMask * pulse * mask * i.color.rgb;

                float alpha = saturate((glow + core) * lengthMask * yEdgeMask * pulse * mask * i.color.a);

                return float4(finalCol, alpha);
            }
            ENDCG
        }
    }

    FallBack Off
}