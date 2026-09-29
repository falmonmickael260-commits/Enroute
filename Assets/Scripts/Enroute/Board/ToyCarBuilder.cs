using UnityEngine;

namespace Enroute.Board
{
    /// <summary>
    /// Builds a small stylized toy-car silhouette (body + cabin + four wheels) out of
    /// primitives under a given root transform. No external art assets needed, but reads
    /// as a car rather than a bare capsule — body colour is the player colour, cabin/
    /// wheels are neutral so the silhouette stays readable at board scale.
    /// </summary>
    public static class ToyCarBuilder
    {
        public static void Build(GameObject root, Color bodyColor, Material bodyMat, Material cabinMat, Material wheelMat)
        {
            // Clear any previous placeholder geometry directly on the root (e.g. a capsule).
            var rootMesh = root.GetComponent<MeshFilter>();
            if (rootMesh != null) Object.DestroyImmediate(rootMesh);
            var rootRenderer = root.GetComponent<MeshRenderer>();
            if (rootRenderer != null) Object.DestroyImmediate(rootRenderer);
            var rootCollider = root.GetComponent<Collider>();
            if (rootCollider != null) Object.DestroyImmediate(rootCollider);

            foreach (Transform child in root.transform)
                Object.DestroyImmediate(child.gameObject);

            // Body: a low, slightly tapered block.
            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.06f, 0f);
            body.transform.localScale = new Vector3(0.34f, 0.11f, 0.62f);
            Object.DestroyImmediate(body.GetComponent<Collider>());
            body.GetComponent<MeshRenderer>().sharedMaterial = bodyMat;

            // Cabin: smaller block set back toward the rear half, like a cabin/greenhouse.
            var cabin = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cabin.name = "Cabin";
            cabin.transform.SetParent(root.transform, false);
            cabin.transform.localPosition = new Vector3(0f, 0.145f, -0.06f);
            cabin.transform.localScale = new Vector3(0.22f, 0.09f, 0.32f);
            Object.DestroyImmediate(cabin.GetComponent<Collider>());
            cabin.GetComponent<MeshRenderer>().sharedMaterial = cabinMat;

            // Four wheels.
            var wheelPositions = new[]
            {
                new Vector3(0.16f, 0.035f, 0.19f),
                new Vector3(-0.16f, 0.035f, 0.19f),
                new Vector3(0.16f, 0.035f, -0.19f),
                new Vector3(-0.16f, 0.035f, -0.19f),
            };
            foreach (var pos in wheelPositions)
            {
                var wheel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                wheel.name = "Wheel";
                wheel.transform.SetParent(root.transform, false);
                wheel.transform.localPosition = pos;
                wheel.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
                wheel.transform.localScale = new Vector3(0.07f, 0.045f, 0.07f);
                Object.DestroyImmediate(wheel.GetComponent<Collider>());
                wheel.GetComponent<MeshRenderer>().sharedMaterial = wheelMat;
            }
        }
    }
}
