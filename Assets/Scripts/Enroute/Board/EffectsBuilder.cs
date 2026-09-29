using UnityEngine;

namespace Enroute.Board
{
    /// <summary>
    /// One-shot particle bursts for card reactions (impact, tire burst, smoke, shield
    /// glow, victory confetti). Built entirely from a ParticleSystem + the built-in
    /// "Sprites/Default" shader — no external art assets, and works under any render
    /// pipeline. Each burst destroys its own GameObject when it finishes playing.
    /// </summary>
    public static class EffectsBuilder
    {
        private static Material _sharedMaterial;

        private static Material SpriteMaterial
        {
            get
            {
                if (_sharedMaterial == null)
                {
                    var shader = Shader.Find("Sprites/Default");
                    _sharedMaterial = new Material(shader);
                }
                return _sharedMaterial;
            }
        }

        public static void PlayBurst(
            Transform parent,
            Vector3 localOffset,
            Color color,
            int count = 12,
            float speed = 1.2f,
            float size = 0.05f,
            float lifetime = 0.5f,
            float gravityModifier = 0.6f)
        {
            var go = new GameObject("FxBurst");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localOffset;

            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear); // playOnAwake starts it before we finish configuring
            var main = ps.main;
            main.duration = lifetime;
            main.loop = false;
            main.startLifetime = lifetime;
            main.startSpeed = speed;
            main.startSize = size;
            main.startColor = color;
            main.gravityModifier = gravityModifier;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.stopAction = ParticleSystemStopAction.Destroy;

            var emission = ps.emission;
            emission.rateOverTime = 0;
            emission.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)count) });

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.04f;

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.material = SpriteMaterial;
            renderer.renderMode = ParticleSystemRenderMode.Billboard;

            ps.Play();
        }

        /// <summary>A bigger, longer, multi-colour burst for a race win.</summary>
        public static void PlayConfetti(Transform parent, Vector3 localOffset)
        {
            var colors = new[]
            {
                new Color(0.86f, 0.08f, 0.24f), new Color(0.05f, 0.42f, 0.86f),
                new Color(0.93f, 0.63f, 0.05f), new Color(0.16f, 0.62f, 0.34f),
                Color.white,
            };
            foreach (var c in colors)
                PlayBurst(parent, localOffset, c, count: 10, speed: 2.2f, size: 0.05f, lifetime: 1.1f, gravityModifier: 0.9f);
        }
    }
}
