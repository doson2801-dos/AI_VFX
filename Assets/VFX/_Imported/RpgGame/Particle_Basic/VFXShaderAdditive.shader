Shader "VFXLib/ColosoShaderAdditive_Optimized"
{
	Properties
	{
		[HideInInspector] _EmissionColor("Emission Color", Color) = (1,1,1,1)
		[HideInInspector] _AlphaCutoff("Alpha Cutoff ", Range(0, 1)) = 0.5
		[HDR][Header(_____Base_____)] _MainColor( "MainColor", Color ) = ( 1, 1, 1, 0 )
		_OpacityStrength( "OpacityStrength", Range( 0, 6 ) ) = 1
		_TextureIntensity( "TextureIntensity", Range( 0, 15 ) ) = 1
		_FD( "FD", Range( 0, 2 ) ) = 0
		_CameraOffset( "CameraOffset", Float ) = 0
		_CDFOffset( "CDF Offset", Float ) = 0
		_CDF( "CDF", Float ) = 0
		[Enum(UnityEngine.Rendering.CullMode)] _CullMode( "CullMode", Float ) = 0
		[Enum(Off,0,On,1)] _ZwriteMode( "ZwriteMode", Float ) = 0
		
        [Header(_____Main_____)] 
        _MainTex( "MainTex", 2D ) = "white" {}
		_OpacityPower( "OpacityPower", Range( 0, 55 ) ) = 1
		[Toggle] _Main90degreeUVFlip( "Main90degree UV Flip", Float ) = 0
		[Toggle] _MainUVSwitch( "MainUVSwitch", Float ) = 0
		[Toggle] _UseMainUVCustom1ZW( "UseMainUVCustom1ZW", Float ) = 0
		[Toggle] _MainRIsAlpha( "Main R Is Alpha", Float ) = 0
		
        // Đã tối ưu thành Toggle Shader Feature để tiết kiệm 66% Texture Fetch khi tắt
        [Toggle(_MAINRBGOFFSET_ON)] _MainRBGOffset( "MainRBGOffset", Float ) = 1
		
        _MainFlowX( "MainFlow X", Float ) = 0
		_MainFlowY( "MainFlow Y", Float ) = 0
		[Toggle] _MainClampX( "MainClamp X", Float ) = 0
		[Toggle] _MainClampY( "MainClamp Y", Float ) = 0
		_MainOffsetU( "MainOffset U", Range( -0.025, 0.025 ) ) = 0.015
		_MainOffsetV( "MainOffset V", Range( -0.025, 0.025 ) ) = 0.015

		_MaskTex( "MaskTex", 2D ) = "white" {}
		_MaskFlowX( "MaskFlow X", Float ) = 0
		_MaskFlowY( "MaskFlow Y", Float ) = 0
		
        [Header(_____Color_____)]
        _ColorTex( "ColorTex", 2D ) = "white" {}
        [Toggle] _Color90degreeUVFlip("Color90degree UV Flip", Float) = 0
        [Toggle] _ColorClampX("ColorClamp X", Float) = 0
        [Toggle] _ColorClampY("ColorClamp Y", Float) = 0
        _ColorFlowX("ColorFlow X", Float) = 0
        _ColorFlowY("ColorFlow Y", Float) = 0
        _Desaturate("Desaturate", Range(0, 1)) = 0
        _ColorPower("ColorPower", Float) = 1
        _ColorIntensity("ColorIntensity", Float) = 1

		[Header(_____Dissolve_____)] 
        _DissolveTex( "DissolveTex", 2D ) = "white" {}
		[Toggle] _MainTexRDissolve( "MainTex R Dissolve", Float ) = 0
		[Toggle] _UseManual_DebugDissolve( "UseManual_DebugDissolve", Float ) = 1
		_ManualDissolve( "ManualDissolve", Range( 0, 1 ) ) = 1
		_SmoothDissolve( "SmoothDissolve", Range( 0, 15 ) ) = 1
		_DissolveFlowX( "DissolveFlow X", Float ) = 0
		_DissolveFlowY( "DissolveFlow Y", Float ) = 0

		[HideInInspector] _QueueOffset("_QueueOffset", Float) = 0
        [HideInInspector] _QueueControl("_QueueControl", Float) = -1
	}

	SubShader
	{
		LOD 0
		Tags { "RenderType"="Transparent" "Queue"="Transparent" "UniversalMaterialType"="Unlit" "AlwaysRenderMotionVectors"="false" }
		Cull [_CullMode]
		AlphaToMask Off


		Pass
		{
			Name "Forward"

            // Chế độ Blend Additive chuẩn
			Blend One One, One OneMinusSrcAlpha
			ZWrite Off
			ZTest LEqual
			ColorMask RGBA

			CGPROGRAM
#pragma target 3.5
#include "UnityCG.cginc"
#include "Assets/VFX/_Imported/RpgGame/Common/VfxPortable.cginc"
			#pragma multi_compile_instancing
            #pragma multi_compile_fog
			#define _SURFACE_TYPE_TRANSPARENT 1
			#define REQUIRE_DEPTH_TEXTURE 1

			#pragma vertex vert
			#pragma fragment frag

            
            // --- Tổ hợp bảo kê an toàn cho Mobile ---

			#if defined(LOD_FADE_CROSSFADE)
            #endif

			#pragma shader_feature_local_fragment _MAINRBGOFFSET_ON

			struct Attributes
			{
				float4 positionOS : POSITION;
				float3 normalOS : NORMAL;
				float4 texcoord : TEXCOORD0;
				float4 texcoord1 : TEXCOORD1;
				float4 ase_color : COLOR;
				UNITY_VERTEX_INPUT_INSTANCE_ID
			};

			struct PackedVaryings
			{
				float4 positionCS : SV_POSITION;
				float3 positionWS : TEXCOORD0;
				float4 ase_texcoord5 : TEXCOORD1; // xy = BaseUV, z = customDissolve
				float4 ase_texcoord6 : TEXCOORD2; // xy = UV2, z = CustomEye
				float4 ase_color : COLOR;
				float4 screenPos : TEXCOORD3;
				UNITY_VERTEX_INPUT_INSTANCE_ID
				UNITY_VERTEX_OUTPUT_STEREO
			};

            // Thứ tự CBUFFER giữ nguyên 100% so với bản gốc để tránh xung đột bộ nhớ
			CBUFFER_START(UnityPerMaterial)
			half4 _MainColor;
			float4 _MaskTex_ST;
			float4 _MainTex_ST;
			float4 _ColorTex_ST;
			float4 _DissolveTex_ST;
			
			half _ZwriteMode;
			half _Desaturate;
			half _ColorPower;
			half _ColorIntensity;
			half _MainRIsAlpha;
			half _OpacityPower;
			half _MainTexRDissolve;
			half _SmoothDissolve;
			half _DissolveFlowY;
			half _UseManual_DebugDissolve;
			half _ManualDissolve;
			half _MaskFlowX;
			half _MaskFlowY;
			half _OpacityStrength;
			half _FD;
			half _DissolveFlowX;
			half _ColorFlowY;
			half _ColorClampY;
			half _CDF;
			half _CullMode;
			half _CameraOffset;
			
			half _MainRBGOffset;
			half _MainClampX;
			half _Main90degreeUVFlip;
			half _UseMainUVCustom1ZW;
			half _MainUVSwitch;
			half _MainClampY;
			half _MainFlowX;
			half _MainFlowY;
			half _MainOffsetU;
			half _MainOffsetV;
			
			half _TextureIntensity;
			half _ColorClampX;
			half _Color90degreeUVFlip;
			half _ColorFlowX;
			half _CDFOffset;
			CBUFFER_END

			sampler2D _MainTex;
			sampler2D _ColorTex;
			sampler2D _DissolveTex;
			sampler2D _MaskTex;

			PackedVaryings vert ( Attributes input )
			{
				PackedVaryings output = (PackedVaryings)0;
				UNITY_SETUP_INSTANCE_ID(input);
				UNITY_TRANSFER_INSTANCE_ID(input, output);
				UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);

				float3 ase_positionWS = TransformObjectToWorld(input.positionOS.xyz);
				
                // Tối ưu Camera Offset Vector
				float3 viewDirection = _WorldSpaceCameraPos - ase_positionWS;
				float3 normalizedViewDirection = normalize(viewDirection + 1e-6f);
                float3 localCameraOffset = TransformWorldToObjectDir(normalizedViewDirection) * _CameraOffset;

				input.positionOS.xyz += localCameraOffset;

				VertexPositionInputs vertexInput = GetVertexPositionInputs( input.positionOS.xyz );

				output.positionCS = vertexInput.positionCS;
				output.positionWS = vertexInput.positionWS;
                output.screenPos = ComputeScreenPos(vertexInput.positionCS);
				
                float customEye = -TransformWorldToView(TransformObjectToWorld(input.positionOS.xyz)).z;
				
				output.ase_texcoord5 = input.texcoord;
				output.ase_texcoord6.xy = input.texcoord1.xy;
                output.ase_texcoord6.z = customEye;
				output.ase_color = input.ase_color;

				return output;
			}

			half4 frag ( PackedVaryings input ) : SV_Target
			{
				UNITY_SETUP_INSTANCE_ID(input);
				UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);

                float timeFlow = _Time.y;
                
                float2 baseUV = input.ase_texcoord5.xy;
                float2 uv2 = input.ase_texcoord6.xy;
                half customDissolve = input.ase_texcoord5.z;
                float customEye = input.ase_texcoord6.z;

                // --- UV Routing Main ---
				float2 uv_MainTex = baseUV * _MainTex_ST.xy + _MainTex_ST.zw;
				float2 uv2_MainTex = uv2 * _MainTex_ST.xy + _MainTex_ST.zw;

                float2 currentUV = lerp(uv_MainTex, uv2_MainTex, _MainUVSwitch);
                currentUV = lerp(currentUV, currentUV + uv2, _UseMainUVCustom1ZW);
                
                float2 flippedUV = lerp(currentUV, currentUV.yx, _Main90degreeUVFlip);
                float2 clampedUV = half2(
                    lerp(flippedUV.x, saturate(flippedUV.x), _MainClampX),
                    lerp(flippedUV.y, saturate(flippedUV.y), _MainClampY)
                );

                float2 finalMainUV = clampedUV + float2(_MainFlowX, _MainFlowY) * timeFlow;
                
                // --- RGB Offset Logic Tối Ưu ---
                half4 mainTexColor = tex2D(_MainTex, finalMainUV);
                #ifdef _MAINRBGOFFSET_ON
                    half2 offsetUV1 = finalMainUV + half2(_MainOffsetU, _MainOffsetV);
                    half2 offsetUV2 = finalMainUV + half2(_MainOffsetU * 2.0h, _MainOffsetV * 2.0h);
                    half g = tex2D(_MainTex, offsetUV1).g;
                    half2 ba = tex2D(_MainTex, offsetUV2).ba;
                    mainTexColor = half4(mainTexColor.r, g, ba.x, ba.y);
                #endif

                // --- Color Tex Logic ---
                half2 uv_ColorTex = baseUV * _ColorTex_ST.xy + _ColorTex_ST.zw;
                half2 colorFlippedUV = lerp(uv_ColorTex, uv_ColorTex.yx, _Color90degreeUVFlip);
                half2 colorClampedUV = half2(lerp(colorFlippedUV.x, saturate(colorFlippedUV.x), _ColorClampX), lerp(colorFlippedUV.y, saturate(colorFlippedUV.y), _ColorClampY));
                
                half3 colorTexVal = tex2D(_ColorTex, colorClampedUV + half2(_ColorFlowX, _ColorFlowY) * timeFlow).rgb;
                half desaturateDot = dot(colorTexVal, half3(0.299h, 0.587h, 0.114h));
                half3 desaturatedColor = lerp(colorTexVal, half3(desaturateDot, desaturateDot, desaturateDot), _Desaturate);
                half3 colorMix = saturate(pow(abs(desaturatedColor), _ColorPower) + _ColorIntensity);

                // --- Dissolve ---
                float2 uv_Dissolve = baseUV * _DissolveTex_ST.xy + _DissolveTex_ST.zw + half2(_DissolveFlowX, _DissolveFlowY) * timeFlow;
                half dissolveVal = tex2D(_DissolveTex, uv_Dissolve).r;
                
                half dissolveRef = lerp(dissolveVal, mainTexColor.r, _MainTexRDissolve);
                half manualDiss = lerp(customDissolve, _ManualDissolve, _UseManual_DebugDissolve);
                half dissolveThreshold = lerp(_SmoothDissolve, -1.0h, manualDiss);
                half dissolveFinal = saturate((dissolveRef * _SmoothDissolve) - dissolveThreshold);

                // --- Mask ---
                float2 uv_Mask = baseUV * _MaskTex_ST.xy + _MaskTex_ST.zw + half2(_MaskFlowX, _MaskFlowY) * timeFlow;
                half maskVal = tex2D(_MaskTex, uv_Mask).r;

                // --- Fades ---
                float4 screenPos = input.screenPos;
                float2 screenPosUV = screenPos.xy / screenPos.w;
				
                float sceneDepth = LinearEyeDepth(SHADERGRAPH_SAMPLE_SCENE_DEPTH(screenPosUV), _ZBufferParams);
                float fragDepth = LinearEyeDepth(screenPos.z / screenPos.w, _ZBufferParams);
                
                half depthFade = saturate(abs(sceneDepth - fragDepth) / max(0.001h, _FD));
                half cameraFade = saturate((customEye - _ProjectionParams.y - _CDFOffset) / max(0.001h, _CDF));

                // --- Additive Final Output ---
                // Additive không dùng Alpha Output, tất cả thuộc tính độ mờ đều được nhân trực tiếp vào RGB.
                half3 baseColor = _MainColor.rgb * mainTexColor.rgb * (_TextureIntensity * _TextureIntensity) * colorMix * input.ase_color.rgb;
                half mainAlpha = saturate(lerp(mainTexColor.a, mainTexColor.r, _MainRIsAlpha) * _OpacityPower);
                half finalAlphaLogic = input.ase_color.a * mainAlpha * dissolveFinal * maskVal * _OpacityStrength * depthFade * cameraFade;

                half3 finalColor = baseColor * finalAlphaLogic;

                #ifdef _FOG
                    finalColor = MixFog(finalColor, ComputeFogFactor(input.positionCS.z));
                #endif

				return half4(finalColor, 1.0h);
			}
			ENDCG
		}
	}
}
