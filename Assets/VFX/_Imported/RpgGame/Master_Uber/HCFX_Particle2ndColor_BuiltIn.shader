Shader "HCFX/BuiltIn/Particle2ndColor"
{
    Properties
    {
        [NoScaleOffset] Texture2D_F593E37E ("MainTex", 2D) = "white" {}
        [ToggleUI] Boolean_BB495B7B ("Use SoftParticleFactor?", Float) = 1
        _SoftParticleFallback ("Soft Particle Fallback", Float) = 1

        [HideInInspector] _BUILTIN_SrcBlend ("Src Blend", Float) = 5
        [HideInInspector] _BUILTIN_DstBlend ("Dst Blend", Float) = 10
        [HideInInspector] _BUILTIN_CullMode ("Cull", Float) = 0
        [HideInInspector] _BUILTIN_ZTest ("ZTest", Float) = 4
        [HideInInspector] _BUILTIN_ZWrite ("ZWrite", Float) = 0
    }

    SubShader
    {
        Tags
        {
            "Queue"="Transparent"
            "RenderType"="Transparent"
            "IgnoreProjector"="True"
        }

        Pass
        {
            Name "Particle2ndColor"
            Cull [_BUILTIN_CullMode]
            ZWrite [_BUILTIN_ZWrite]
            ZTest [_BUILTIN_ZTest]
            Blend [_BUILTIN_SrcBlend] [_BUILTIN_DstBlend]

            CGPROGRAM
            #pragma target 3.0
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #pragma multi_compile_particles
            #include "UnityCG.cginc"

            sampler2D Texture2D_F593E37E;
            float4 Texture2D_F593E37E_ST;

            sampler2D_float _CameraDepthTexture;

            float Boolean_BB495B7B;
            float _SoftParticleFallback;

            struct appdata
            {
                float4 vertex : POSITION;
                float4 color  : COLOR;
                float4 uv0    : TEXCOORD0;
                float4 uv1    : TEXCOORD1;
                float4 uv2    : TEXCOORD2;
            };

            struct v2f
            {
                float4 pos       : SV_POSITION;
                float4 color     : COLOR;
                float2 uv        : TEXCOORD0;
                float4 custom1   : TEXCOORD1;
                float4 custom2   : TEXCOORD2;
                float4 screenPos : TEXCOORD3;
                UNITY_FOG_COORDS(4)
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
                o.uv = TRANSFORM_TEX(v.uv0.xy, Texture2D_F593E37E);
                o.custom1 = v.uv1;
                o.custom2 = v.uv2;
                o.screenPos = ComputeScreenPos(o.pos);
                COMPUTE_EYEDEPTH(o.screenPos.z);
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                fixed4 tex = tex2D(Texture2D_F593E37E, i.uv);

                // Custom Vertex Streams:
                // UV1.x = dissolve progress
                // UV1.y = dissolve softness, clamped 0 - 0.5
                // UV1.z = color intensity
                // UV1.w = soft particle distance
                //
                // UV2.rgb = second color
                // UV2.a   = second color blend strength

                float dissolveProgress = i.custom1.x;
                float dissolveSoftness = clamp(i.custom1.y, 0.0001, 0.5);
                float colorIntensity   = i.custom1.z;
                float softDistance     = max(i.custom1.w, 0.0001);

                float3 mainColor = i.color.rgb * tex.r;
                float secondMask = tex.b * i.custom2.a;
                float3 finalColor = lerp(mainColor, i.custom2.rgb, secondMask);
                finalColor *= colorIntensity;

                float dissolveOffset = lerp(-1.0 + dissolveSoftness, 1.0 - dissolveSoftness, dissolveProgress);
                float dissolveValue = (1.0 - tex.g) + dissolveOffset;
                float dissolveCut = smoothstep(dissolveSoftness, 1.0 - dissolveSoftness, dissolveValue);

                float alphaMask = saturate(tex.a - dissolveCut);

                float softFactor = 1.0;

                #ifdef SOFTPARTICLES_ON
                if (Boolean_BB495B7B > 0.5)
                {
                    float sceneZ = LinearEyeDepth(
                        SAMPLE_DEPTH_TEXTURE_PROJ(_CameraDepthTexture, UNITY_PROJ_COORD(i.screenPos))
                    );

                    float partZ = i.screenPos.z;
                    softFactor = saturate((sceneZ - partZ) / softDistance);
                }
                #else
                softFactor = _SoftParticleFallback;
                #endif

                float alpha = i.color.a * alphaMask;
                alpha = (Boolean_BB495B7B > 0.5) ? alpha * softFactor : alpha;

                fixed4 col = fixed4(finalColor, alpha);
                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
}