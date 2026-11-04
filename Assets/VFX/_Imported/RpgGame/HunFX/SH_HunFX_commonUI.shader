Shader "HunFX/SH_HunFX_common_UI"
{
	Properties
	{
		// _TintColor, _MainTex removed (unused — shader uses _MainTexture)

		[HDR]_color1("color1", Color) = (1,1,1,1)
		[HDR]_color2("color2", Color) = (0,0,0,1)
		[Toggle(_USEDISSOLVECOLOR_ON)] _UseDissolveColor("UseDissolveColor", Float) = 0
		_DissolveColor_step("DissolveColor_step", Vector) = (0,1,0,0)
		[Toggle(_USECOLOR_ON)] _UseColor("UseColor", Float) = 1
		_ColorIntensity("ColorIntensity", Float) = 1
		_MainTexture("MainTexture", 2D) = "white" {}
		[Toggle]_MainTex_UV_invert("MainTex_UV_invert", Float) = 0
		_MainTex_uv("MainTex_uv", Vector) = (0,0,1,1)
		_MainTex_speed("MainTex_speed", Vector) = (0,0,0,0)
		_DissolveTex("DissolveTex", 2D) = "white" {}
		_DissolveTex_uv("DissolveTex_uv", Vector) = (0,0,1,1)
		_Smoothstep("Smoothstep", Vector) = (0,1,0,0)
		[Toggle]_DissTex_UV_invert("DissTex_UV_invert", Float) = 0
		_DissolveTex_speed("DissolveTex_speed", Vector) = (0,0,0,0)
		_VOTex("VOTex", 2D) = "white" {}
		_VOTex_uv("VOTex_uv", Vector) = (0,0,1,1)
		_VOTex_speed("VOTex_speed", Vector) = (0,0,0,0)
		_VOintensity("VOintensity", Float) = 0
		_DistTex("DistTex", 2D) = "white" {}
		_DistTex_uv_speed("DistTex_uv_speed", Vector) = (1,1,0,0)
		_Distort_intensity("Distort_intensity", Range( 0 , 0.5)) = 0
		[Toggle(_USEFRESNEL_ON)] _UseFresnel("UseFresnel", Float) = 0
		_Fresnel_pow("Fresnel_pow", Float) = 5
		[Toggle]_MaskTex_UV_invert("MaskTex_UV_invert", Float) = 0
		_Mask("Mask", 2D) = "white" {}
		_MaskTex_tile("MaskTex_tile", Vector) = (1,1,0,0)
		_MaskMult("MaskMult", Float) = 1
		_Mask_udrl("Mask_udrl", Vector) = (0,0,0,0)
		[Toggle(_USEPOSXSCROLL_ON)] _UsePosXScroll("UsePosXScroll", Float) = 0
		// SubDissolveTex packed into DissolveTex R channel (G=dissolve, R=sub-dissolve)
		[Toggle]_UseSubDissTex("UseSubDissTex", Float) = 0
		_SubDissolveTex_multi("SubDissolveTex_multi", Float) = 1
		_SubDissolveTex_add("SubDissolveTex_add", Float) = 0

		// UI version: DepthFade removed (Canvas has unreliable depth)
		// [Toggle(_USEDEPTHFADE_ON)] _UseDepthFade("UseDepthFade", Float) = 0
		// _DepthFade_Distance("DepthFade_Distance", Float) = 1

		[Toggle]_InvertFresnel("InvertFresnel", Float) = 0

		// ===== UI STENCIL (for Mask / RectMask2D / UIParticle) =====
		_StencilComp ("Stencil Comparison", Float) = 8
		_Stencil ("Stencil ID", Float) = 0
		_StencilOp ("Stencil Operation", Float) = 0
		_StencilWriteMask ("Stencil Write Mask", Float) = 255
		_StencilReadMask ("Stencil Read Mask", Float) = 255
		_ColorMask ("Color Mask", Float) = 15
	}

	Category
	{
		SubShader
		{
			LOD 0

			Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "PreviewType"="Plane" }
			Blend SrcAlpha OneMinusSrcAlpha
			Cull Off
			Lighting Off
			ZWrite Off
			ZTest LEqual

			Pass
			{
				// ===== UI STENCIL BLOCK =====
				Stencil
				{
					Ref [_Stencil]
					Comp [_StencilComp]
					Pass [_StencilOp]
					ReadMask [_StencilReadMask]
					WriteMask [_StencilWriteMask]
				}
				ColorMask [_ColorMask]

				CGPROGRAM

				#ifndef UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX
				#define UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input)
				#endif

				#pragma vertex vert
				#pragma fragment frag
				#pragma target 2.0
				#pragma multi_compile_instancing
				// UI: removed soft particles
				// #pragma multi_compile_particles
				#pragma multi_compile_fog

				#include "UnityShaderVariables.cginc"
				#define ASE_NEEDS_FRAG_COLOR
				#pragma shader_feature_local _USECOLOR_ON
				#pragma shader_feature_local _USEPOSXSCROLL_ON
				#pragma shader_feature_local _USEDISSOLVECOLOR_ON
				// UI: removed depth fade keyword (depth texture not reliable in Canvas)
				// #pragma shader_feature_local _USEDEPTHFADE_ON
				#pragma shader_feature_local _USEFRESNEL_ON

				#include "UnityCG.cginc"

				struct appdata_t
				{
					float4 vertex : POSITION;
					fixed4 color : COLOR;
					float4 texcoord : TEXCOORD0;
					UNITY_VERTEX_INPUT_INSTANCE_ID
					float3 ase_normal : NORMAL;
					float4 ase_texcoord1 : TEXCOORD1;
				};

				struct v2f
				{
					float4 vertex : SV_POSITION;
					fixed4 color : COLOR;
					float4 texcoord : TEXCOORD0;
					UNITY_FOG_COORDS(1)
					UNITY_VERTEX_INPUT_INSTANCE_ID
					UNITY_VERTEX_OUTPUT_STEREO
					float4 ase_texcoord3 : TEXCOORD3;
					#ifdef _USEFRESNEL_ON
					float4 ase_texcoord4 : TEXCOORD4;
					float4 ase_texcoord5 : TEXCOORD5;
					#endif
				};

				// UI: removed camera depth texture
				// UNITY_DECLARE_DEPTH_TEXTURE( _CameraDepthTexture );

				uniform sampler2D _VOTex;
				uniform float2 _VOTex_speed;
				uniform float4 _VOTex_uv;
				uniform float _VOintensity;

				uniform sampler2D _MainTexture;
				uniform float _MainTex_UV_invert;
				uniform float2 _MainTex_speed;

				uniform sampler2D _DistTex;
				uniform float4 _DistTex_uv_speed;
				uniform float _Distort_intensity;

				uniform float4 _MainTex_uv;
				uniform float4 _color2;
				uniform float4 _color1;
				uniform float2 _DissolveColor_step;

				uniform sampler2D _DissolveTex;
				uniform float _DissTex_UV_invert;
				uniform float2 _DissolveTex_speed;
				uniform float4 _DissolveTex_uv;

				uniform float _UseSubDissTex;
				uniform float _SubDissolveTex_multi;
				uniform float _SubDissolveTex_add;

				uniform float _ColorIntensity;
				uniform float2 _Smoothstep;

				uniform float _InvertFresnel;
				uniform float _Fresnel_pow;

				uniform sampler2D _Mask;
				uniform float _MaskTex_UV_invert;
				uniform float2 _MaskTex_tile;
				uniform float _MaskMult;

				// UI: removed _CameraDepthTexture_TexelSize, _DepthFade_Distance
				uniform float4 _Mask_udrl;

				v2f vert ( appdata_t v )
				{
					v2f o;
					UNITY_SETUP_INSTANCE_ID(v);
					UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
					UNITY_TRANSFER_INSTANCE_ID(v, o);

					float2 texCoord26 = v.texcoord.xy * float2( 1,1 ) + float2( 0,0 );
					float2 appendResult28 = (float2(_VOTex_uv.x , _VOTex_uv.y));
					float2 appendResult29 = (float2(_VOTex_uv.z , _VOTex_uv.w));
					float2 panner22 = ( 1.0 * _Time.y * _VOTex_speed + ( ( texCoord26 + appendResult28 ) * appendResult29 ));

					#ifdef _USEFRESNEL_ON
					float3 ase_worldPos = mul(unity_ObjectToWorld, float4( (v.vertex).xyz, 1 )).xyz;
					o.ase_texcoord4.xyz = ase_worldPos;
					float3 ase_worldNormal = UnityObjectToWorldNormal(v.ase_normal);
					o.ase_texcoord5.xyz = ase_worldNormal;
					o.ase_texcoord4.w = 0;
					o.ase_texcoord5.w = 0;
					#endif

					o.ase_texcoord3 = v.ase_texcoord1;

					v.vertex.xyz += ( ( tex2Dlod( _VOTex, float4( panner22, 0, 0.0) ).r * v.ase_normal ) * _VOintensity );
					o.vertex = UnityObjectToClipPos(v.vertex);

					o.color = v.color;
					o.texcoord = v.texcoord;
					UNITY_TRANSFER_FOG(o,o.vertex);
					return o;
				}

				fixed4 frag ( v2f i ) : SV_Target
				{
					UNITY_SETUP_INSTANCE_ID( i );
					UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX( i );

					// UI: removed SOFTPARTICLES_ON block (this was killing alpha on Canvas)

					float2 texCoord13 = i.texcoord.xy * float2( 1,1 ) + float2( 0,0 );
					float2 appendResult100 = (float2(_DistTex_uv_speed.z , _DistTex_uv_speed.w));
					float2 texCoord96 = i.texcoord.xy * float2( 1,1 ) + float2( 0,0 );
					float2 appendResult98 = (float2(_DistTex_uv_speed.x , _DistTex_uv_speed.y));
					float2 panner101 = ( 1.0 * _Time.y * appendResult100 + ( texCoord96 * appendResult98 ));
					float temp_output_104_0 = ( tex2D( _DistTex, panner101 ).r * _Distort_intensity );

					float4 texCoord59 = i.ase_texcoord3;
					texCoord59.xy = i.ase_texcoord3.xy * float2( 1,1 ) + float2( 0,0 );
					float2 appendResult63 = (float2(0.0 , texCoord59.y));
					float2 appendResult62 = (float2(texCoord59.y , 0.0));
					#ifdef _USEPOSXSCROLL_ON
					float2 staticSwitch60 = appendResult62;
					#else
					float2 staticSwitch60 = appendResult63;
					#endif

					float2 appendResult18 = (float2(_MainTex_uv.x , _MainTex_uv.y));
					float2 appendResult19 = (float2(_MainTex_uv.z , _MainTex_uv.w));
					float2 panner15 = ( 1.0 * _Time.y * _MainTex_speed + ( ( ( ( texCoord13 + temp_output_104_0 ) + staticSwitch60 ) + appendResult18 ) * appendResult19 ));

					float2 break87 = panner15;
					float2 appendResult90 = (float2(break87.y , break87.x));
					float4 tex2DNode1 = tex2D( _MainTexture, (( _MainTex_UV_invert )?( appendResult90 ):( panner15 )) );

					float smoothstepResult121 = smoothstep( _DissolveColor_step.x , _DissolveColor_step.y , tex2DNode1.r);

					float2 texCoord35 = i.texcoord.xy * float2( 1,1 ) + float2( 0,0 );
					float2 appendResult37 = (float2(_DissolveTex_uv.x , _DissolveTex_uv.y));
					float2 appendResult38 = (float2(_DissolveTex_uv.z , _DissolveTex_uv.w));
					float2 panner31 = ( 1.0 * _Time.y * _DissolveTex_speed + ( ( ( staticSwitch60 + ( texCoord35 + temp_output_104_0 ) ) + appendResult37 ) * appendResult38 ));

					float2 break91 = panner31;
					float2 appendResult92 = (float2(break91.y , break91.x));

					// SubDissolveTex packed: R=sub-dissolve, G=dissolve (same sample)
					float4 dissolveSample = tex2D( _DissolveTex, (( _DissTex_UV_invert )?( appendResult92 ):( panner31 )) );
					float temp_output_67_0 = ( dissolveSample.g
						- (( _UseSubDissTex )?( ( ( dissolveSample.r * _SubDissolveTex_multi ) + _SubDissolveTex_add ) ):( 0.0 )) );

					float smoothstepResult118 = smoothstep( _DissolveColor_step.x , _DissolveColor_step.y , temp_output_67_0);

					#ifdef _USEDISSOLVECOLOR_ON
					float staticSwitch119 = smoothstepResult118;
					#else
					float staticSwitch119 = smoothstepResult121;
					#endif

					float4 lerpResult9 = lerp( _color2 , _color1 , staticSwitch119);

					#ifdef _USECOLOR_ON
					float4 staticSwitch73 = lerpResult9;
					#else
					float4 staticSwitch73 = tex2DNode1;
					#endif

					float4 texCoord14 = i.ase_texcoord3;
					texCoord14.xy = i.ase_texcoord3.xy * float2( 1,1 ) + float2( 0,0 );

					float4 break6 = ( ( staticSwitch73 * ( _ColorIntensity + texCoord14.z ) ) * i.color );

					float smoothstepResult40 = smoothstep( _Smoothstep.x , _Smoothstep.y , ( temp_output_67_0 - texCoord14.x ));
					float temp_output_7_0 = ( tex2DNode1.a * ( i.color.a * smoothstepResult40 ) );

					#ifdef _USEFRESNEL_ON
					float3 ase_worldPos = i.ase_texcoord4.xyz;
					float3 ase_worldViewDir = normalize(UnityWorldSpaceViewDir(ase_worldPos));
					float3 ase_worldNormal = i.ase_texcoord5.xyz;
					float fresnelNdotV47 = dot( ase_worldNormal, ase_worldViewDir );
					float fresnelNode47 = pow( 1.0 - fresnelNdotV47, _Fresnel_pow );
					float clampResult110 = clamp( fresnelNode47 , 0.0 , 1.0 );
					float staticSwitch48 = ( temp_output_7_0 * (( _InvertFresnel )?( ( 1.0 - clampResult110 ) ):( clampResult110 )) );
					#else
					float staticSwitch48 = temp_output_7_0;
					#endif

					float2 texCoord117 = i.texcoord.xy * _MaskTex_tile + float2( 0,0 );
					float2 temp_output_142_0 = ( texCoord117 + temp_output_104_0 );
					float2 break114 = temp_output_142_0;
					float2 appendResult115 = (float2(break114.y , break114.x));

					float temp_output_53_0 = ( staticSwitch48 * saturate( ( tex2D( _Mask, (( _MaskTex_UV_invert )?( appendResult115 ):( temp_output_142_0 )) ).b * _MaskMult ) ) );

					// UI: removed depth fade multiplication (was using _CameraDepthTexture)
					float staticSwitch123 = temp_output_53_0;

					float2 texCoord74 = i.texcoord.xy * float2( 1,1 ) + float2( 0,0 );
					float smoothstepResult75 = smoothstep( 0.0 , _Mask_udrl.y , texCoord74.y);
					float smoothstepResult77 = smoothstep( 0.0 , _Mask_udrl.x , ( 1.0 - texCoord74.y ));
					float smoothstepResult79 = smoothstep( 0.0 , _Mask_udrl.w , texCoord74.x);
					float smoothstepResult80 = smoothstep( 0.0 , _Mask_udrl.z , ( 1.0 - texCoord74.x ));

					float4 appendResult8 = (float4(
						break6.r,
						break6.g,
						break6.b,
						( staticSwitch123 * ( ( smoothstepResult75 * smoothstepResult77 ) * ( smoothstepResult79 * smoothstepResult80 ) ) )
					));

					fixed4 col = appendResult8;
					UNITY_APPLY_FOG(i.fogCoord, col);
					return col;
				}

				ENDCG
			}
		}
	}

	CustomEditor "ASEMaterialInspector"
	Fallback Off
}
