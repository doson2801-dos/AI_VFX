Shader "ViH_Additive" {
	Properties {
		_MainTexture ("Main Texture", 2D) = "white" {}
		_DissolveTexture ("Dissolve Texture", 2D) = "white" {}
		_MainTexTilingX ("Main Tex Tiling X", Float) = 1
		_MainTexTilingY ("Main Tex Tiling Y", Float) = 1
		[Toggle] _UseCustomDataforTiling ("Use Custom Data for Tiling?", Float) = 0
		_MainTexOffsetX ("Main Tex Offset X", Float) = 0
		_MainTexOffsetY ("Main Tex Offset Y", Float) = 0
		[Toggle] _UseCustomDataforOffset ("Use Custom Data for Offset?", Float) = 0
		_MainTexture02 ("Main Texture 02", 2D) = "white" {}
		_MainTex02TilingX ("Main Tex 02 Tiling X", Float) = 1
		_MainTex02TilingY ("Main Tex 02 Tiling Y", Float) = 1
		_MainTex02OffsetX ("Main Tex 02 Offset X", Float) = 0
		_MainTex02OffsetY ("Main Tex 02 Offset Y", Float) = 0
		_MainColor ("Main Color", Color) = (1,1,1,1)
		_Emission ("Emission", Range(0, 10)) = 0.5
		[Toggle] _UseCustomVertexDatainsteadofVertexAlpha ("Use Custom Vertex Data instead of Vertex Alpha?", Float) = 0
		_DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0.5
		_OpacitySaturation ("Opacity Saturation", Range(0, 10)) = 1
		_DissolveStepX ("Dissolve Step X", Float) = 0
		_DissolveStepY ("Dissolve Step Y", Float) = 1
		_NoiseTexture ("NoiseTexture", 2D) = "white" {}
		_NoiseValue ("Noise Value", Range(0, 1)) = 0
		_NoiseTilingX ("Noise Tiling X", Float) = 1
		_NoiseTilingY ("Noise Tiling Y", Float) = 1
		_NoiseOffsetX ("Noise Offset X", Float) = 0
		_NoiseOffsetY ("Noise Offset Y", Float) = 0
		_Mask ("Mask", 2D) = "white" {}
		_MaskTilingX ("Mask Tiling X", Float) = 1
		_MaskTilingY ("Mask Tiling Y", Float) = 1
		_MaskOffsetX ("Mask Offset X", Float) = 0
		_MaskOffsetY ("Mask Offset Y", Float) = 0
		[Toggle] _UseCustomVertexDataformaskOffset ("Use Custom Vertex Data for mask Offset", Float) = 0
		[Toggle] _UseSoftParticle ("Use Soft Particle?", Float) = 0
		_SoftParticle ("Soft Particle", Range(0, 10)) = 1
		_CullMode ("Cull Mode", Float) = 2
		_Cutoff ("Cutoff", Range(0, 1)) = 0.5
		[HideInInspector] _texcoord ("", 2D) = "white" {}
		[HideInInspector] _texcoord2 ("", 2D) = "white" {}
		[HideInInspector] _texcoord3 ("", 2D) = "white" {}
	}
	SubShader{
		Tags { "RenderType"="Transparent" "Queue"="Transparent" "IgnoreProjector"="True" }
		LOD 200
		Cull [_CullMode]
		Blend SrcAlpha One
		ZWrite Off

		Pass
		{
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag
			#pragma multi_compile_fog

			#include "UnityCG.cginc"

			sampler2D _MainTexture;
			sampler2D _DissolveTexture;
			sampler2D _MainTexture02;
			sampler2D _NoiseTexture;
			sampler2D _Mask;

			float _MainTexTilingX;
			float _MainTexTilingY;
			float _UseCustomDataforTiling;
			float _MainTexOffsetX;
			float _MainTexOffsetY;
			float _UseCustomDataforOffset;
			float _MainTex02TilingX;
			float _MainTex02TilingY;
			float _MainTex02OffsetX;
			float _MainTex02OffsetY;
			fixed4 _MainColor;
			float _Emission;
			float _UseCustomVertexDatainsteadofVertexAlpha;
			float _DissolveAmount;
			float _OpacitySaturation;
			float _DissolveStepX;
			float _DissolveStepY;
			float _NoiseValue;
			float _NoiseTilingX;
			float _NoiseTilingY;
			float _NoiseOffsetX;
			float _NoiseOffsetY;
			float _MaskTilingX;
			float _MaskTilingY;
			float _MaskOffsetX;
			float _MaskOffsetY;
			float _UseCustomVertexDataformaskOffset;
			float _UseSoftParticle;
			float _SoftParticle;
			float _Cutoff;

			struct appdata
			{
				float4 vertex : POSITION;
				float3 normal : NORMAL;
				float2 uv : TEXCOORD0;
				float4 color : COLOR;
				float2 uv1 : TEXCOORD1;
				float2 uv2 : TEXCOORD2;
			};

			struct v2f
			{
				float4 pos : SV_POSITION;
				float2 uv : TEXCOORD0;
				float4 color : COLOR;
				UNITY_FOG_COORDS(1)
				float4 screenPos : TEXCOORD2;
			};

			v2f vert(appdata v)
			{
				v2f o;
				o.pos = UnityObjectToClipPos(v.vertex);
				o.uv = v.uv;
				o.color = v.color;
				o.screenPos = ComputeScreenPos(o.pos);
				UNITY_TRANSFER_FOG(o, o.pos);
				return o;
			}

			fixed4 frag(v2f i) : SV_Target
			{
				float2 mainUV = i.uv;
				mainUV.x *= _MainTexTilingX;
				mainUV.y *= _MainTexTilingY;
				mainUV.x += _MainTexOffsetX;
				mainUV.y += _MainTexOffsetY;

				fixed4 texColor = tex2D(_MainTexture, mainUV);

				float2 uv02 = i.uv;
				uv02.x *= _MainTex02TilingX;
				uv02.y *= _MainTex02TilingY;
				uv02.x += _MainTex02OffsetX;
				uv02.y += _MainTex02OffsetY;
				fixed4 tex02Color = tex2D(_MainTexture02, uv02);

				float2 noiseUV = i.uv;
				noiseUV.x *= _NoiseTilingX;
				noiseUV.y *= _NoiseTilingY;
				noiseUV.x += _NoiseOffsetX;
				noiseUV.y += _NoiseOffsetY;
				fixed noiseValue = tex2D(_NoiseTexture, noiseUV).r * _NoiseValue;

				float2 maskUV = i.uv;
				maskUV.x *= _MaskTilingX;
				maskUV.y *= _MaskTilingY;
				maskUV.x += _MaskOffsetX;
				maskUV.y += _MaskOffsetY;
				fixed maskValue = tex2D(_Mask, maskUV).r;

				float2 dissolveUV = i.uv;
				fixed dissolveValue = tex2D(_DissolveTexture, dissolveUV).r;
				float dissolve = _DissolveAmount + noiseValue;

				fixed4 vertexColor = i.color;
				fixed emission = lerp(_Emission, vertexColor.r * _Emission, _UseCustomVertexDatainsteadofVertexAlpha);

				fixed4 finalColor = texColor * _MainColor;
				finalColor.rgb *= (1.0 + emission);

				fixed alpha = vertexColor.a * (1.0 + _OpacitySaturation);
				alpha *= maskValue;
				alpha *= smoothstep(dissolve - 0.01, dissolve + 0.01, dissolveValue);
				finalColor.a = alpha;

				if (finalColor.a < _Cutoff)
					discard;

				UNITY_APPLY_FOG(i.fogCoord, finalColor);

				return finalColor;
			}

			ENDCG
		}
	}
	Fallback "Particles/Standard Additive"
}
