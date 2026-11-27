using UnityEditor;
using UnityEngine;

namespace SlotFive.Editor
{
    /// <summary>Slider for [Tune(min, max, step)] fields, snapped to the step.</summary>
    [CustomPropertyDrawer(typeof(TuneAttribute))]
    public sealed class TuneDrawer : PropertyDrawer
    {
        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
        {
            var tune = (TuneAttribute)attribute;
            if (property.propertyType == SerializedPropertyType.Integer)
            {
                int step = Mathf.Max(1, Mathf.RoundToInt(tune.Step));
                int v = EditorGUI.IntSlider(position, label, property.intValue, (int)tune.Min, (int)tune.Max);
                property.intValue = (int)tune.Min + Mathf.RoundToInt((v - tune.Min) / step) * step;
            }
            else if (property.propertyType == SerializedPropertyType.Float)
            {
                float v = EditorGUI.Slider(position, label, property.floatValue, tune.Min, tune.Max);
                property.floatValue = tune.Step > 0 ? tune.Min + Mathf.Round((v - tune.Min) / tune.Step) * tune.Step : v;
            }
            else
            {
                EditorGUI.PropertyField(position, property, label);
            }
        }
    }
}
