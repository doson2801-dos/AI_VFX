// SH_VFX_RockFacet — low-poly rock / crystal chunk with flat faces and a fake light. Mobile: Built-in + URP, one unlit pass, UnityCG only.
// Look: palette gradient (v = height, dark base -> light tip, hard bands for rock strata), then each FLAT face is shaded
// with a 3-step toon light (lit / mid / dark) from a fixed world light direction. The face normal comes from screen-space
// derivatives of the world position, so it is flat whatever the mesh normals say and needs no scene light.
// Optional MatCap (the technique of rpg-game's crystal material, OmniShade + 'MC Metal Silver'): the flat face normal, in view space, looks up a
// mottled metal sphere, so every face picks another spot of it and the chunk sparkles like crystal. Set _MatCapAmount > 0 and _ShadeDark = _ShadeMid = 1 for a pure crystal look.
// Cost: 2 texture samples, 1 pow, ddx/ddy (needs target 3.0), no loops, no sin.
// Particle inputs: vertex colour = tint * alpha (Start Color, Color over Lifetime). Blend: alpha, ZWrite on (solid chunks sort among themselves).
Shader "VFX/FX/Rock Facet"
{
    Properties
    {
        _MainTex ("Palette (UV v = height gradient)", 2D) = "white" {}
        _Tint ("Tint", Color) = (1, 1, 1, 1)
        _LightDir ("Light Direction (world, pointing to the light)", Vector) = (-0.35, 0.8, -0.45, 0)
        _ShadeDark ("Dark Face Brightness", Range(0, 1)) = 0.42
        _ShadeMid ("Mid Face Brightness", Range(0, 1)) = 0.72
        _LitAt ("Lit Threshold (N.L)", Range(0, 1)) = 0.35
        _MidAt ("Mid Threshold (N.L)", Range(-0.5, 0.5)) = -0.05
        _Soft ("Band Softness", Range(0.005, 0.2)) = 0.04

        _MatCapTex ("MatCap (view-space normal lookup)", 2D) = "gray" {}
        _MatCapAmount ("MatCap Amount (0 off)", Range(0, 1)) = 0
        _MatCapBrightness ("MatCap Brightness", Range(0.5, 3)) = 1.6
        _MatCapContrast ("MatCap Contrast", Range(0.5, 3)) = 1.2

        [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 5
        [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 10
        [Enum(Off, 0, On, 1)] _ZWrite ("ZWrite", Float) = 1
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend [_SrcBlend] [_DstBlend]
        ZWrite [_ZWrite]
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            sampler2D _MainTex, _MatCapTex;
            float4 _MainTex_ST;
            half4 _Tint;
            float4 _LightDir;
            half _ShadeDark, _ShadeMid, _LitAt, _MidAt, _Soft, _MatCapAmount, _MatCapBrightness, _MatCapContrast;

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed4 color : COLOR;
                float2 uv : TEXCOORD0;
                float3 worldPos : TEXCOORD1;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                // flat face normal from the screen-space derivatives of the world position, turned to face the camera
                float3 n = normalize(cross(ddx(i.worldPos), ddy(i.worldPos)));
                if (dot(n, _WorldSpaceCameraPos - i.worldPos) < 0) n = -n;

                half ndl = dot(n, normalize(_LightDir.xyz));
                half mid = smoothstep(_MidAt - _Soft, _MidAt + _Soft, ndl);     // 0 = dark face, 1 = at least mid
                half lit = smoothstep(_LitAt - _Soft, _LitAt + _Soft, ndl);     // 1 = lit face
                half shade = lerp(_ShadeDark, _ShadeMid, mid);
                shade = lerp(shade, 1.0h, lit);

                half3 albedo = tex2D(_MainTex, i.uv).rgb * _Tint.rgb * i.color.rgb;

                // MatCap on the flat face normal (view space): a different spot of the metal sphere per face
                float3 nv = mul((float3x3)UNITY_MATRIX_V, n);
                half3 mc = tex2D(_MatCapTex, nv.xy * 0.5 + 0.5).rgb;
                mc = pow(max(mc, 0.001h), _MatCapContrast) * _MatCapBrightness;
                albedo = lerp(albedo, albedo * mc, _MatCapAmount);

                return half4(albedo * shade, _Tint.a * i.color.a);
            }
            ENDCG
        }
    }
}
