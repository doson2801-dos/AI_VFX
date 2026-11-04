// Stylized (cel) fire on a 3D mesh - sphere, capsule or any closed mesh - for Built-in and URP.
// One unlit pass without LightMode; UnityCG.cginc only.
//
// How it reads as 3D
//   * vertex: the mesh is stretched upward and pinched toward its axis by height (teardrop flame), sways,
//     and is pushed along its normals by rising noise -> the volume itself moves;
//   * fragment: the "heat" field = facing ratio (N.V: centre hot, rim cool) + a fake key light (one side of
//     the volume is a darker red band) - rising object-space noise erosion (stronger at the top);
//   * the field is cut into 3 cel bands (outer / mid / core); below the outer band the pixel is transparent,
//     so the silhouette is a broken, flickering flame edge instead of the mesh outline.
// Time: _Time.y * _TimeScale + _TimeOffset. Loop: SpeedA 0.5, SpeedB 1.0, SwaySpeed pi repeat every 2 s.
Shader "VFX/Fire Stylized 3D"
{
    Properties
    {
        _NoiseTex ("Noise (tileable, R)", 2D) = "gray" {}
        _NoiseScaleA ("Noise A Tiling (xy)", Vector) = (1.6, 0.8, 0, 0)
        _NoiseScaleB ("Noise B Tiling (xy)", Vector) = (3.0, 1.5, 0, 0)
        _SpeedA ("Noise A Scroll Speed", Float) = 0.5
        _SpeedB ("Noise B Scroll Speed", Float) = 1.0
        _HeightRange ("Mesh Height Min / Max (object y)", Vector) = (-0.5, 0.5, 0, 0)
        _Stretch ("Stretch Up", Range(0, 3)) = 1.0
        _Pinch ("Pinch Top", Range(0, 1)) = 0.85
        _Sway ("Sway", Range(0, 0.5)) = 0.12
        _SwaySpeed ("Sway Speed", Float) = 3.14159
        _Displace ("Noise Displacement", Range(0, 0.5)) = 0.12
        _TongueCount ("Tongue Count (around the axis)", Float) = 5
        _TongueLength ("Tongue Length", Range(0, 2)) = 0.15
        _TongueSharp ("Tongue Sharpness", Range(0.2, 6)) = 0.8
        _TongueCut ("Gap Cut Between Tongues", Range(0, 1.5)) = 0.9
        _Fresnel ("Facing Power", Range(0.2, 4)) = 1.2
        _LightDir ("Fake Light Dir (view space)", Vector) = (-0.6, 0.5, -0.6, 0)
        _Shade ("Light / Shadow Strength", Range(0, 1)) = 0.35
        _NoiseAmount ("Noise Erosion", Range(0, 1.5)) = 0.7
        _Band1 ("Outer Threshold", Range(0, 1)) = 0.12
        _Band2 ("Mid Threshold", Range(0, 1)) = 0.38
        _Band3 ("Core Threshold", Range(0, 1)) = 0.62
        _EdgeSoft ("Edge Softness", Range(0, 0.2)) = 0.01
        [HDR] _ColorOuter ("Outer Colour", Color) = (0.85, 0.12, 0.05, 1)
        [HDR] _ColorMid ("Mid Colour", Color) = (1.0, 0.45, 0.08, 1)
        [HDR] _ColorCore ("Core Colour", Color) = (1.0, 0.95, 0.81, 1)
        _TimeScale ("Time Scale (0 = manual)", Float) = 1
        _TimeOffset ("Time Offset", Float) = 0
        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend [_SrcBlend] [_DstBlend], One OneMinusSrcAlpha   // alpha channel always 'over' (lets the sheet baker composite overlaps)
        ZWrite Off
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            sampler2D _NoiseTex;
            float4 _NoiseScaleA, _NoiseScaleB, _HeightRange, _LightDir;
            float _TongueCount, _TongueLength, _TongueSharp, _TongueCut;
            float _SpeedA, _SpeedB, _Stretch, _Pinch, _Sway, _SwaySpeed, _Displace, _Fresnel, _Shade, _NoiseAmount;
            float _Band1, _Band2, _Band3, _EdgeSoft, _TimeScale, _TimeOffset;
            half4 _ColorOuter, _ColorMid, _ColorCore;

            struct appdata { float4 vertex : POSITION; float3 normal : NORMAL; fixed4 color : COLOR; };
            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float3 op : TEXCOORD0;      // undeformed object position (noise space, sticks to the volume)
                float3 nrmV : TEXCOORD1;    // view-space normal
                float3 posV : TEXCOORD2;    // view-space position
                float h : TEXCOORD3;        // 0 bottom .. 1 top
            };

            float Time01() { return _Time.y * _TimeScale + _TimeOffset; }

            // cylindrical-ish noise coordinate: around the axis (x+z mix) and height, scrolling up
            float Noise(float3 p, float2 scale, float speed, float t, float seed)
            {
                float2 uvA = float2(p.x + seed, p.y) * scale + float2(0, -t * speed);
                float2 uvB = float2(p.z - seed, p.y) * scale + float2(0.5, -t * speed);
                return lerp(tex2Dlod(_NoiseTex, float4(uvA, 0, 0)).r, tex2Dlod(_NoiseTex, float4(uvB, 0, 0)).r, 0.5);
            }

            // tongues: lobes around the axis that wobble; each lobe's reach pulses (loops every 2 s)
            float TongueMask(float3 p, float t)
            {
                float a = atan2(p.z, p.x + 1e-5);   // +eps: no NaN at the sphere's pole
                float lobe = sin(a * _TongueCount + sin(t * 3.14159) * 0.8) * 0.5 + 0.5;
                float pulse = 0.55 + 0.45 * sin(a * 2.0 - t * 6.28318 + sin(a * 3.0));
                return pow(lobe, _TongueSharp) * pulse;
            }

            v2f vert (appdata v)
            {
                v2f o;
                float t = Time01();
                float3 p = v.vertex.xyz;
                float h = saturate((p.y - _HeightRange.x) / max(_HeightRange.y - _HeightRange.x, 1e-4));
                o.op = p;
                o.h = h;

                // teardrop: pinch toward the axis and stretch upward, more toward the top
                float3 q = p;
                q.xz *= 1.0 - _Pinch * h * h;
                q.y += _Stretch * h * h * (_HeightRange.y - _HeightRange.x);
                // tongues shoot up from the top part
                q.y += _TongueLength * h * h * h * TongueMask(p, t) * (_HeightRange.y - _HeightRange.x);
                // sway and rising noise push
                q.x += sin(t * _SwaySpeed + h * 3.0) * _Sway * h;
                q.z += cos(t * _SwaySpeed + h * 2.3) * _Sway * 0.5 * h;
                float n = Noise(p, _NoiseScaleA.xy, _SpeedA, t, 0.0);
                q += v.normal * (n - 0.5) * _Displace * (0.3 + h);

                o.pos = UnityObjectToClipPos(float4(q, 1));
                o.posV = UnityObjectToViewPos(q);
                o.nrmV = normalize(mul((float3x3)UNITY_MATRIX_IT_MV, v.normal));
                o.color = v.color;
                return o;
            }

            half4 frag (v2f i) : SV_Target
            {
                float t = Time01();
                float3 N = normalize(i.nrmV);
                float3 V = normalize(-i.posV);
                float facing = pow(saturate(dot(N, V)), _Fresnel);          // centre 1, rim 0
                float light = dot(N, normalize(_LightDir.xyz)) * 0.5 + 0.5; // lit side 1, shadow side 0

                float nA = Noise(i.op, _NoiseScaleA.xy, _SpeedA, t, 0.0);
                float nB = Noise(i.op, _NoiseScaleB.xy, _SpeedB, t, 0.37);
                float n = nA * 0.6 + nB * 0.4;

                // how much we look down the flame's axis (0 = side view, 1 = straight top-down). Seen from above we
                // only see the top half, which is where tongues/erosion cut the most -> soften those cuts so the
                // flame stays solid and the tongues read as petals around the centre.
                float3 upV = normalize(mul((float3x3)UNITY_MATRIX_MV, float3(0, 1, 0)));
                float lookDown = saturate(upV.z);
                float hk = i.h * (1.0 - 0.7 * lookDown);                      // height falloff seen from the side only

                float heat = facing * (1.0 - 0.4 * hk) + (light - 0.5) * _Shade;
                float f = heat - (1.0 - n) * _NoiseAmount * (0.25 + 0.75 * hk) * (1.0 - 0.6 * facing);   // erosion mostly at the rims

                // split the top into tongues: a gap opens where the height passes the lobe's reach,
                // so every tongue narrows to a point and the tongues end at different heights
                float reach = smoothstep(0.5, 1.05, i.h);
                f -= _TongueCut * (1.0 - 0.65 * lookDown) * saturate((reach - (0.3 + 0.7 * TongueMask(i.op, t))) * 3.0);

                float aa = fwidth(f) + _EdgeSoft;
                float a1 = smoothstep(_Band1 - aa, _Band1 + aa, f);
                float a2 = smoothstep(_Band2 - aa, _Band2 + aa, f);
                float a3 = smoothstep(_Band3 - aa, _Band3 + aa, f);

                half3 col = lerp(_ColorOuter.rgb, _ColorMid.rgb, a2);
                col = lerp(col, _ColorCore.rgb, a3);
                #ifndef UNITY_COLORSPACE_GAMMA
                col = GammaToLinearSpace(col);
                #endif
                return half4(col, a1) * i.color;
            }
            ENDCG
        }
    }
}
