Shader "VFX/Master" {
	Properties {
		[Header(Main texture)] [Space] _MainTex ("Texture", 2D) = "white" {}
		[HDR] _Color ("Color", Vector) = (1,1,1,1)
		_MainSpeed ("Speed", Vector) = (0,0,0,0)
		[Header(Blend mode)] [Space] [Enum(UnityEngine.Rendering.BlendMode)] _BlendSrc ("Source", Float) = 1
		[Enum(UnityEngine.Rendering.BlendMode)] _BlendDst ("Destination", Float) = 1
		[Header(Distort)] [Space] _DistortTex ("Texture", 2D) = "black" {}
		_DistortSpeed ("Speed", Vector) = (0,0,0,0)
		_Distort ("Strength", Float) = 0
		[Header(Dissolve)] [Space] _DissolveTex ("Texture", 2D) = "white" {}
		_DissolveSpeed ("Speed", Vector) = (0,0,0,0)
		_FresnelCol ("Fresnel color", Vector) = (1,1,1,1)
		_FresnelStr ("Fresnel strength", Float) = 1
		_FresnelPow ("Fresnel power", Float) = 1
		_Emission ("Emission", Float) = 0
		[Header(Alpha override)] [Space] _AlphaTex ("Texture", 2D) = "white" {}
		_AlphaSpeed ("Speed", Vector) = (0,0,0,0)
		_AlphaThreshold ("Alpha threshold", Float) = 0.5
		[Header(Depth)] [Space] [Toggle] _ZWrite ("Depth write", Float) = 0
		[Enum(UnityEngine.Rendering.CompareFunction)] _ZTest ("Depth test", Float) = 4
		[Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 2
	}
	//DummyShaderTextExporter
	SubShader{
		Tags { "RenderType"="Transparent" "Queue"="Transparent" "IgnoreProjector"="True" }
		LOD 200
		Cull [_Cull]
		Blend [_BlendSrc] [_BlendDst]
		ZTest [_ZTest]
		ZWrite [_ZWrite]

		Pass
		{
			HLSLPROGRAM
			#pragma vertex vert
			#pragma fragment frag

			float4x4 unity_ObjectToWorld;
			float4x4 unity_MatrixVP;
			float4 _MainTex_ST;

			struct Vertex_Stage_Input
			{
				float4 pos : POSITION;
				float2 uv : TEXCOORD0;
				float4 color : COLOR;
			};

			struct Vertex_Stage_Output
			{
				float2 uv : TEXCOORD0;
				float4 color : COLOR;
				float4 pos : SV_POSITION;
			};

			Vertex_Stage_Output vert(Vertex_Stage_Input input)
			{
				Vertex_Stage_Output output;
				output.uv = (input.uv.xy * _MainTex_ST.xy) + _MainTex_ST.zw;
				output.color = input.color;
				output.pos = mul(unity_MatrixVP, mul(unity_ObjectToWorld, input.pos));
				return output;
			}

			Texture2D<float4> _MainTex;
			SamplerState sampler_MainTex;
			float4 _Color;

			struct Fragment_Stage_Input
			{
				float2 uv : TEXCOORD0;
				float4 color : COLOR;
			};

			float4 frag(Fragment_Stage_Input input) : SV_TARGET
			{
				float4 texCol = _MainTex.Sample(sampler_MainTex, input.uv.xy);
				float4 vertexCol = input.color;
				float4 finalColor = texCol * _Color;
				finalColor.rgb *= vertexCol.rgb;
				finalColor.a *= vertexCol.a;
				return finalColor;
			}

			ENDHLSL
		}
	}
	//CustomEditor "VFXShaderGUI"
}
