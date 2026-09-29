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
    ///
    /// Builds three layers so the road actually reads as a road rather than a flat
    /// grey ribbon: the asphalt surface, a raised curb strip on each side (relief),
    /// and a dashed centre line (geometry-based, no texture needed).
    /// </summary>
    [ExecuteAlways]
    public class RoadBuilder : MonoBehaviour
    {
        [Tooltip("World meters per board unit.")]
        public float WorldScale = 0.02f;

        [Tooltip("Distance in board units between mesh cross-sections. Smaller = smoother curves.")]
        public float SampleStep = 6f;

        [Tooltip("Extra road length sampled before the start / after the finish (matches the web client's lead-in/run-out).")]
        public float LeadIn = 40f;
        public float LeadOut = 90f;

        [Header("Curb")]
        public float CurbWidthBoardUnits = 10f;
        public float CurbHeight = 0.05f;

        [Header("Centre line")]
        public float LineHalfWidthBoardUnits = 2f;
        public float LineHeight = 0.012f;
        public float DashLength = 18f;
        public float DashGap = 14f;

        public Material AsphaltMaterial;
        public Material CurbMaterial;
        public Material LineMaterial;

        public Vector3 BoardToWorld(float boardX, float boardY, float height = 0f) => new Vector3(boardX * WorldScale, height, boardY * WorldScale);

        private static void AddQuad(List<Vector3> verts, List<Vector2> uvs, List<int> tris, Vector3 a, Vector3 b, Vector3 c, Vector3 d, float v0, float v1)
        {
            var baseIdx = verts.Count;
            verts.Add(a); verts.Add(b); verts.Add(c); verts.Add(d);
            uvs.Add(new Vector2(0, v0)); uvs.Add(new Vector2(1, v0)); uvs.Add(new Vector2(0, v1)); uvs.Add(new Vector2(1, v1));
            // a=left0, b=right0, c=left1, d=right1 — wound so the normal faces +Y
            tris.Add(baseIdx + 0); tris.Add(baseIdx + 1); tris.Add(baseIdx + 2);
            tris.Add(baseIdx + 2); tris.Add(baseIdx + 1); tris.Add(baseIdx + 3);
        }

        private Mesh BuildRibbon(float innerHalf, float outerHalf, float height, float startS, float endS, float step)
        {
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            var length = endS - startS;
            var steps = Mathf.Max(1, Mathf.CeilToInt(length / step));

            Vector3? prevL = null, prevR = null;
            for (var i = 0; i <= steps; i++)
            {
                var s = startS + length * i / steps;
                var p = RoadPath.PointAtLength(s);
                var (lx, ly) = RoadPath.OffsetPoint(p, innerHalf);
                var (rx, ry) = RoadPath.OffsetPoint(p, outerHalf);
                var l = BoardToWorld(lx, ly, height);
                var r = BoardToWorld(rx, ry, height);
                if (prevL.HasValue)
                {
                    var v0 = (s - step - startS) / 40f;
                    var v1 = (s - startS) / 40f;
                    AddQuad(verts, uvs, tris, prevL.Value, prevR.Value, l, r, v0, v1);
                }
                prevL = l; prevR = r;
            }

            var mesh = new Mesh { name = "EnrouteRoadRibbon" };
            mesh.SetVertices(verts);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            mesh.RecalculateTangents();
            return mesh;
        }

        private GameObject GetOrCreateChild(string name, Material mat)
        {
            var t = transform.Find(name);
            GameObject go;
            if (t == null)
            {
                go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
                go.transform.SetParent(transform, false);
            }
            else go = t.gameObject;
            if (mat != null) go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        [ContextMenu("Build Road (all layers)")]
        public void BuildAll()
        {
            var half = RoadPath.RoadWidth / 2f;
            var start = -LeadIn;
            var end = RoadPath.RoadLength + LeadOut;

            // Asphalt surface
            var asphaltGo = GetOrCreateChild("Asphalt", AsphaltMaterial);
            asphaltGo.GetComponent<MeshFilter>().sharedMesh = BuildRibbon(-half, half, 0f, start, end, SampleStep);

            // Curbs (raised strips just outside each edge — gives the road physical relief)
            var curbLeftGo = GetOrCreateChild("CurbLeft", CurbMaterial);
            curbLeftGo.GetComponent<MeshFilter>().sharedMesh = BuildRibbon(-half - CurbWidthBoardUnits, -half, CurbHeight, start, end, SampleStep);
            var curbRightGo = GetOrCreateChild("CurbRight", CurbMaterial);
            curbRightGo.GetComponent<MeshFilter>().sharedMesh = BuildRibbon(half, half + CurbWidthBoardUnits, CurbHeight, start, end, SampleStep);

            // Dashed centre line — real geometry, not a texture, so it always looks crisp.
            var lineGo = GetOrCreateChild("CenterLine", LineMaterial);
            lineGo.GetComponent<MeshFilter>().sharedMesh = BuildDashedLine(start, RoadPath.RoadLength, SampleStep);
        }

        private Mesh BuildDashedLine(float start, float routeEnd, float step)
        {
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            var period = DashLength + DashGap;
            var s = Mathf.Max(0f, start);
            while (s < routeEnd)
            {
                var dashEnd = Mathf.Min(s + DashLength, routeEnd);
                var subSteps = Mathf.Max(1, Mathf.CeilToInt((dashEnd - s) / step));
                Vector3? prevL = null, prevR = null;
                for (var i = 0; i <= subSteps; i++)
                {
                    var ss = s + (dashEnd - s) * i / subSteps;
                    var p = RoadPath.PointAtLength(ss);
                    var (lx, ly) = RoadPath.OffsetPoint(p, -LineHalfWidthBoardUnits);
                    var (rx, ry) = RoadPath.OffsetPoint(p, LineHalfWidthBoardUnits);
                    var l = BoardToWorld(lx, ly, LineHeight);
                    var r = BoardToWorld(rx, ry, LineHeight);
                    if (prevL.HasValue) AddQuad(verts, uvs, tris, prevL.Value, prevR.Value, l, r, 0f, 1f);
                    prevL = l; prevR = r;
                }
                s += period;
            }

            var mesh = new Mesh { name = "EnrouteCenterLine" };
            mesh.SetVertices(verts);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        private void OnEnable()
        {
            if (transform.Find("Asphalt") == null) BuildAll();
        }
    }
}
