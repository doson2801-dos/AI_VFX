using UnityEngine;

namespace VfxKit
{
    /// <summary>Moves the object back and forth along a line (play mode). Gives trail effects (world-space particles) something to trail behind in the showcase.
    /// from / to are offsets from where the object is placed in the scene.</summary>
    public class VfxPathMover : MonoBehaviour
    {
        public Vector3 from = new Vector3(-3f, 1f, 0f);
        public Vector3 to = new Vector3(3f, 1f, 0f);
        public float legSeconds = 2.4f;
        public float pauseSeconds = 0.6f;
        float t;
        Vector3 origin;
        bool haveOrigin;

        void OnEnable()
        {
            if (!haveOrigin) { origin = transform.localPosition; haveOrigin = true; }
            t = 0f; transform.localPosition = origin + from;
        }

        void Update()
        {
            t += Time.deltaTime;
            float cycle = legSeconds * 2f + pauseSeconds * 2f;
            float c = t % cycle;
            Vector3 p;
            if (c < legSeconds) p = Vector3.Lerp(from, to, c / legSeconds);
            else if (c < legSeconds + pauseSeconds) p = to;
            else if (c < legSeconds * 2f + pauseSeconds) p = Vector3.Lerp(to, from, (c - legSeconds - pauseSeconds) / legSeconds);
            else p = from;
            transform.localPosition = origin + p;
        }
    }
}
