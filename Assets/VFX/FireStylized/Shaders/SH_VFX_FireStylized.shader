// Stylized (anime / cel) procedural fire for Built-in and URP (unity-vfx-maker, art-direction prototype).
// One unlit pass without LightMode (Built-in forward, URP SRPDefaultUnlit); UnityCG.cginc only, no URP includes.
//
// How it works
//   * silhouette: a flame shape computed from the quad UV - wide rounded base, tapering to the top, swaying;
//   * two tileable noise layers scroll upward at different speeds, distort the UV (more toward the top) and
//     erode the shape, so tongues split and small pieces break off and rise;
//   * the resulting field is cut into 3 cel bands (outer / mid / core) with anti-aliased edges;
//   * vertex colour multiplies colour and alpha, so it works on a quad or on particles.
// Time: _Time.y * _TimeScale + _TimeOffset (set _TimeScale 0 and drive _TimeOffset for previews / scrubbing).
// Seamless loop: with SpeedA 0.5, SpeedB 1.0, SwaySpeed pi everything repeats every 2 s (bake 16 frames over 2 s).
Shader "VFX/Fire Stylized"
{
    Properties
    {
        _NoiseTex ("Noise (tileable, R)", 2D) = "gray" {}
        _NoiseScaleA ("Noise A Tiling (xy)", Vector) = (2.0, 0.6, 0, 0)
        _NoiseScaleB ("Noise B Tiling (xy)", Vector) = (3.0, 1.2, 0, 0)
        _SpeedA ("Noise A Scroll Speed", Float) = 0.5
        _SpeedB ("Noise B Scroll Speed", Float) = 1.0
        _Distortion ("UV Distortion", Range(0, 0.5)) = 0.3
        _BaseWidth ("Base Half-Width", Range(0.05, 0.5)) = 0.45
        _Taper ("Taper Power", Range(0.3, 3)) = 1.3
        _Sway ("Sway", Range(0, 0.25)) = 0.07
        _SwaySpeed ("Sway Speed", Float) = 3.14159
        _NoiseAmount ("Noise Erosion", Range(0, 1.5)) = 1.15
        _Band1 ("Outer Threshold", Range(0, 1)) = 0.11
        _Band2 ("Mid Threshold", Range(0, 1)) = 0.28
        _Band3 ("Core Threshold", Range(0, 1)) = 0.5
        _FlameY ("Flame Bottom / Top (uv y)", Vector) = (0.05, 0.9, 0, 0)
        _EdgeSoft ("Edge Softness", Range(0, 0.2)) = 0.015
        [HDR] _ColorOuter ("Outer Colour", Color) = (0.85, 0.12, 0.05, 1)
        [HDR] _ColorMid ("Mid Colour", Color) = (1.0, 0.45, 0.08, 1)
        [HDR] _ColorCore ("Core Colour", Color) = (1.0, 0.86, 0.42, 1)
        _TimeScale ("Time Scale (0 = manual)", Float) = 1
        _TimeOffset ("Time Offset", Float) = 0
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5    // SrcAlpha
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10   // OneMinusSrcAlpha
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Plane" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            sampler2D _NoiseTex;
            float4 _NoiseScaleA, _NoiseScaleB;
            float _SpeedA, _SpeedB, _Distortion, _BaseWidth, _Taper, _Sway, _SwaySpeed, _NoiseAmount;
            float4 _FlameY;
            float _Band1, _Band2, _Band3, _EdgeSoft, _TimeScale, _TimeOffset;
            half4 _ColorOuter, _ColorMid, _ColorCore;

            struct appdata { float4 vertex : POSITION; fixed4 color : COLOR; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; fixed4 color : COLOR; float2 uv : TEXCOORD0; };

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
                o.uv = v.uv;
                return o;
            }

            half4 frag (v2f i) : SV_Target
            {
                float t = _Time.y * _TimeScale + _TimeOffset;
                float2 uv = i.uv;

                // two noise layers scrolling up at different speeds
                float nA = tex2D(_NoiseTex, uv * _NoiseScaleA.xy + float2(0.0, -t * _SpeedA)).r;
                float nB = tex2D(_NoiseTex, uv * _NoiseScaleB.xy + float2(0.37, -t * _SpeedB)).r;
                float n = nA * 0.6 + nB * 0.4;

                // flame space: y = 0 at the flame bottom, 1 at its top (margin inside the cell)
                float y = (uv.y - _FlameY.x) / max(_FlameY.y - _FlameY.x, 1e-3);
                float yc = saturate(y);
                // distortion grows with height so the base stays calm and the tips whip around
                float2 d = float2(uv.x, y) + (float2(nA, nB) - 0.5) * _Distortion * yc;

                // flame silhouette: rounded wide base, tapering top, swaying more toward the top
                float sway = sin(t * _SwaySpeed + d.y * 3.0) * _Sway * d.y;
                float dx = abs(d.x - 0.5 - sway);
                float width = _BaseWidth * pow(saturate(1.0 - d.y), _Taper);
                float baseRound = saturate(d.y / 0.18);
                width *= sqrt(baseRound);                                    // round the bottom
                float shape = saturate(1.0 - dx / max(width, 1e-4)) * smoothstep(0.0, 0.04, d.y);

                // erosion: noise eats the shape, stronger toward the top -> split tongues and rising pieces
                float f = shape - (1.0 - n) * _NoiseAmount * (0.35 + 0.65 * yc);
                // keep everything inside the cell (no pieces cut by the frame border)
                f -= smoothstep(0.9, 0.99, uv.y) + (1.0 - smoothstep(0.0, 0.03, uv.y));

                // cel bands with anti-aliased (optionally softened) edges
                float aa = fwidth(f) + _EdgeSoft;
                float a1 = smoothstep(_Band1 - aa, _Band1 + aa, f);
                float a2 = smoothstep(_Band2 - aa, _Band2 + aa, f);
                float a3 = smoothstep(_Band3 - aa, _Band3 + aa, f);

                half3 col = lerp(_ColorOuter.rgb, _ColorMid.rgb, a2);
                col = lerp(col, _ColorCore.rgb, a3);
                // palette is authored in sRGB; convert when the project renders in Linear space
                #ifndef UNITY_COLORSPACE_GAMMA
                col = GammaToLinearSpace(col);
                #endif
                return half4(col, a1) * i.color;
            }
            ENDCG
        }
    }
}
