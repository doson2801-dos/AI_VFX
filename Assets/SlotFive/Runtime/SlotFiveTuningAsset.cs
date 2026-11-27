using UnityEngine;

namespace SlotFive
{
    /// <summary>Asset that holds the live tuning. The game snapshots it with Clone() when a match starts.</summary>
    [CreateAssetMenu(fileName = "SlotFiveTuning", menuName = "Slot Five/Tuning")]
    public sealed class SlotFiveTuningAsset : ScriptableObject
    {
        public SlotFiveTuning tuning = new SlotFiveTuning();
    }
}
