// Lớp tương thích URP / Built-in cho shader VFX nhập từ rpg-game.
// Shader viết bằng CGPROGRAM + UnityCG.cginc (chạy được ở cả hai pipeline, không cần package URP),
// còn tên hàm kiểu URP được ánh xạ sang Built-in ở đây.
#ifndef VFX_PORTABLE_INCLUDED
#define VFX_PORTABLE_INCLUDED

#ifndef TEXTURE2D
    #define TEXTURE2D(t) Texture2D t
    #define SAMPLER(s) SamplerState s
    #define SAMPLE_TEXTURE2D(t, s, uv) t.Sample(s, uv)
    #define SAMPLE_TEXTURE2D_LOD(t, s, uv, l) t.SampleLevel(s, uv, l)
#endif

float3 TransformObjectToWorld(float3 p)       { return mul(unity_ObjectToWorld, float4(p, 1.0)).xyz; }
float3 TransformWorldToObject(float3 p)       { return mul(unity_WorldToObject, float4(p, 1.0)).xyz; }
float3 TransformObjectToWorldNormal(float3 n) { return UnityObjectToWorldNormal(n); }
float4 TransformObjectToHClip(float3 p)       { return UnityObjectToClipPos(float4(p, 1.0)); }
float4 TransformWorldToHClip(float3 p)        { return UnityWorldToClipPos(p); }
float3 GetWorldSpaceViewDir(float3 positionWS) { return _WorldSpaceCameraPos.xyz - positionWS; }

struct VertexPositionInputs { float3 positionWS; float4 positionCS; };
VertexPositionInputs GetVertexPositionInputs(float3 positionOS)
{
    VertexPositionInputs o;
    o.positionWS = TransformObjectToWorld(positionOS);
    o.positionCS = TransformWorldToHClip(o.positionWS);
    return o;
}

float ComputeFogFactor(float z)
{
    // UNITY_CALC_FOG_FACTOR_RAW declares `float unityFogFactor` itself: declaring it here too fails to compile as soon as fog is on in the scene
    #if defined(FOG_LINEAR) || defined(FOG_EXP) || defined(FOG_EXP2)
        UNITY_CALC_FOG_FACTOR_RAW(z);
        return unityFogFactor;
    #else
        return 0;
    #endif
}
float3 MixFog(float3 c, float f)
{
    #if defined(FOG_LINEAR) || defined(FOG_EXP) || defined(FOG_EXP2)
        return lerp(unity_FogColor.rgb, c, saturate(f));
    #else
        return c;
    #endif
}
// --- thêm cho shader Amplify / ASE ---
#define _TimeParameters float3(_Time.y, _SinTime.w, _CosTime.w)
float3 TransformWorldToObjectDir(float3 d) { return normalize(mul((float3x3)unity_WorldToObject, d)); }
float3 TransformWorldToView(float3 p)      { return mul(UNITY_MATRIX_V, float4(p, 1.0)).xyz; }
float4x4 GetObjectToWorldMatrix()          { return unity_ObjectToWorld; }
float LinearEyeDepth(float d, float4 zbp)  { return 1.0 / (zbp.z * d + zbp.w); }
sampler2D_float _CameraDepthTexture;
#define SHADERGRAPH_SAMPLE_SCENE_DEPTH(uv) SAMPLE_DEPTH_TEXTURE(_CameraDepthTexture, uv)
#endif
