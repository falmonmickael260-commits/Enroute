using System.Collections.Generic;
using Enroute.Core;
using UnityEngine;

namespace Enroute.Board
{
    /// <summary>
    /// Builds a 3D ribbon mesh that follows the exact same curve as the web client's
    /// <c>roadPath.ts</c> (two straight rows joined by two half-turns), so the Unity
    /// board and the web board are geometrically the same route. Board units (the
    /// 1600x1000 space roadPath.ts is defined in) map to world meters via <see cref="WorldScale"/>.
    /// Board X -> world X, board Y -> world Z, flat at Y=0.
    /// </summary>
    [ExecuteAlways]
    [RequireComponent(typeof(MeshFilter), typeof(MeshRenderer))]
    public class RoadBuilder : MonoBehaviour
    {
        [Tooltip("World meters per board unit.")]
        public float WorldScale = 0.02f;

        [Tooltip("Distance in board units between mesh cross-sections. Smaller = smoother curves.")]
        public float SampleStep = 8f;

        [Tooltip("Extra road length sampled before the start / after the finish (matches the web client's lead-in/run-out).")]
        public float LeadIn = 40f;
        public float LeadOut = 90f;

        public Vector3 BoardToWorld(float boardX, float boardY, float height = 0f) => new Vector3(boardX * WorldScale, height, boardY * WorldScale);

        [ContextMenu("Build Road Mesh")]
        public void Build()
        {
            var mesh = new Mesh { name = "EnrouteRoad" };
            var vertices = new List<Vector3>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();

            var half = RoadPath.RoadWidth / 2f;
            var start = -LeadIn;
            var end = RoadPath.RoadLength + LeadOut;
            var length = end - start;
            var steps = Mathf.Max(2, Mathf.CeilToInt(length / SampleStep));

            for (var i = 0; i <= steps; i++)
            {
                var s = start + length * i / steps;
                var p = RoadPath.PointAtLength(s);
                var (lx, ly) = RoadPath.OffsetPoint(p, -half);
                var (rx, ry) = RoadPath.OffsetPoint(p, half);

                vertices.Add(BoardToWorld(lx, ly));
                vertices.Add(BoardToWorld(rx, ry));

                var v = (s - start) / RoadPath.RoadWidth; // tile roughly square along length
                uvs.Add(new Vector2(0f, v));
                uvs.Add(new Vector2(1f, v));

                if (i > 0)
                {
                    var a = (i - 1) * 2;
                    var b = a + 1;
                    var c = i * 2;
                    var d = c + 1;
                    // two triangles per quad, wound for an up-facing (+Y) normal
                    triangles.Add(a); triangles.Add(c); triangles.Add(b);
                    triangles.Add(b); triangles.Add(c); triangles.Add(d);
                }
            }

            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            mesh.RecalculateTangents();

            GetComponent<MeshFilter>().sharedMesh = mesh;
        }

        private void OnEnable()
        {
            if (GetComponent<MeshFilter>().sharedMesh == null) Build();
        }
    }
}
