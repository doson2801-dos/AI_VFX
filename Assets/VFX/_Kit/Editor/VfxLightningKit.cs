#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace VfxKit
{
    // Helpers shared by the lightning builders (LightningStrike, ThunderSpear, LightningTrail, AuraGauntlet).
    public static class VfxLightningKit
    {
        public static void Bursts(ParticleSystem ps, params float[] timeCount)
        {
            var list = new List<ParticleSystem.Burst>();
            for (int i = 0; i < timeCount.Length; i += 2) list.Add(new ParticleSystem.Burst(timeCount[i], (short)timeCount[i + 1]));
            ps.emission.SetBursts(list.ToArray());
        }

        /// <summary>Straight line a -> b over the particle life (value x scale).</summary>
        public static ParticleSystem.MinMaxCurve Linear(float a, float b)
        {
            var c = new AnimationCurve(new Keyframe(0f, a, b - a, b - a), new Keyframe(1f, b, b - a, b - a));
            return new ParticleSystem.MinMaxCurve(1f, c);
        }

        public static ParticleSystem.MinMaxCurve Curve(params float[] timeValue)
        {
            var c = new AnimationCurve();
            for (int i = 0; i < timeValue.Length; i += 2) c.AddKey(timeValue[i], timeValue[i + 1]);
            for (int i = 0; i < c.length; i++) c.SmoothTangents(i, 0f);
            return new ParticleSystem.MinMaxCurve(1f, c);
        }

        public static void Loop(ParticleSystem ps, float duration)
        {
            var m = ps.main; m.loop = true; m.duration = duration;
        }

        public static void Sheet(ParticleSystem ps, int tilesX, int tilesY, bool randomStart, bool animate)
        {
            var ts = ps.textureSheetAnimation;
            ts.enabled = true; ts.mode = ParticleSystemAnimationMode.Grid; ts.numTilesX = tilesX; ts.numTilesY = tilesY;
            ts.animation = ParticleSystemAnimationType.WholeSheet;
            ts.frameOverTime = animate ? Linear(0f, 1f) : new ParticleSystem.MinMaxCurve(0f);
            ts.startFrame = randomStart ? new ParticleSystem.MinMaxCurve(0f, 0.9999f) : new ParticleSystem.MinMaxCurve(0f);
        }

        /// <summary>Cone emitter along +Y (rotation X -90) at a position; angle 0 = straight up.</summary>
        public static void ConeUp(ParticleSystem ps, Vector3 pos, float angle = 0f, float radius = 0.0001f)
        {
            var sh = ps.shape;
            sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = angle; sh.radius = radius;
            sh.position = pos; sh.rotation = new Vector3(-90f, 0f, 0f);
        }

        public static void Stretch(ParticleSystem ps, float lengthScale, float velocityScale, Vector3 pivot, float maxSize = 5f, int order = 0)
        {
            var r = ps.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Stretch; r.lengthScale = lengthScale; r.velocityScale = velocityScale;
            r.cameraVelocityScale = 0f; r.pivot = pivot; r.maxParticleSize = maxSize; r.sortingOrder = order;
        }

        public static void TwoColors(ParticleSystem ps, Color a, Color b)
        {
            var m = ps.main; m.startColor = new ParticleSystem.MinMaxGradient(a, b);
        }

        public static void Range(ParticleSystem ps, float lifeMin, float lifeMax, float speedMin, float speedMax)
        {
            var m = ps.main;
            m.startLifetime = new ParticleSystem.MinMaxCurve(lifeMin, lifeMax);
            m.startSpeed = new ParticleSystem.MinMaxCurve(speedMin, speedMax);
        }

        public static void Size3D(ParticleSystem ps, Vector2 x, Vector2 y, Vector2 z)
        {
            var m = ps.main; m.startSize3D = true;
            m.startSizeX = new ParticleSystem.MinMaxCurve(x.x, x.y);
            m.startSizeY = new ParticleSystem.MinMaxCurve(y.x, y.y);
            m.startSizeZ = new ParticleSystem.MinMaxCurve(z.x, z.y);
        }

        public static void ResetTiling(params Material[] mats)
        {
            foreach (var m in mats)
            {
                if (!m.HasProperty("_MainTex")) continue;
                m.SetTextureScale("_MainTex", Vector2.one); m.SetTextureOffset("_MainTex", Vector2.zero);
                EditorUtility.SetDirty(m);
            }
        }

        /// <summary>Lightning_CustomBlend (rpg-game): bolt shape from _MainTex (r), colour from _Gradient, cutoff from vertex TEXCOORD0.z (Custom1.x), scroll offset from .w (Custom1.y).</summary>
        public static Material LightningMaterial(string path, Texture main, Texture gradient, Color tint, float stretch, float offset, float speed, float src, float dst)
        {
            var m = VfxBuildKit.Material(path, VfxBlend.Additive, main, "Particles/Lightning_CustomBlend");
            m.SetTexture("_Gradient", gradient);
            m.SetColor("_TintColor", tint);
            m.SetFloat("_Stretch", stretch); m.SetFloat("_Offset", offset); m.SetFloat("_Speed", speed);
            m.SetFloat("_SrcBlend", src); m.SetFloat("_DstBlend", dst);
            EditorUtility.SetDirty(m);
            return m;
        }

        public static void LightningStreams(ParticleSystem ps)
        {
            ps.GetComponent<ParticleSystemRenderer>().SetActiveVertexStreams(new List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color, ParticleSystemVertexStream.UV, ParticleSystemVertexStream.Custom1XY
            });
        }

        /// <summary>Custom1.x = cutoff curve (timeValue pairs), Custom1.y = random 0..1 (scroll offset).</summary>
        public static void LightningCustomData(ParticleSystem ps, params float[] cutoffTimeValue)
        {
            var cd = ps.customData;
            cd.enabled = true;
            cd.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
            cd.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 2);
            cd.SetVector(ParticleSystemCustomData.Custom1, 0, Curve(cutoffTimeValue));
            cd.SetVector(ParticleSystemCustomData.Custom1, 1, new ParticleSystem.MinMaxCurve(0f, 1f));
        }
    }
}
#endif
