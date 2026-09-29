using UnityEngine;

namespace Enroute.Board
{
    /// <summary>
    /// Builds a physical road barrier ("BARRAGE" card) out of primitives: two support
    /// posts and a red/white striped bar spanning the road. Stripes are separate box
    /// segments (geometry, not a texture) so they stay crisp at any distance.
    /// </summary>
    public static class BarrierBuilder
    {
        public static void Build(GameObject root, float widthWorld, Material redMat, Material whiteMat, Material postMat)
        {
            foreach (Transform child in root.transform)
                UnityEngine.Object.DestroyImmediate(child.gameObject);

            const float barHeight = 0.34f;
            const float barThickness = 0.05f;
            const int stripeCount = 7;
            var stripeWidth = widthWorld / stripeCount;

            for (var i = 0; i < stripeCount; i++)
            {
                var stripe = GameObject.CreatePrimitive(PrimitiveType.Cube);
                stripe.name = "Stripe";
                stripe.transform.SetParent(root.transform, false);
                var x = -widthWorld / 2f + stripeWidth * (i + 0.5f);
                stripe.transform.localPosition = new Vector3(x, barHeight, 0f);
                stripe.transform.localScale = new Vector3(stripeWidth * 0.96f, barThickness, barThickness);
                var collider = stripe.GetComponent<Collider>();
                if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
                stripe.GetComponent<MeshRenderer>().sharedMaterial = i % 2 == 0 ? redMat : whiteMat;
            }

            foreach (var side in new[] { -1f, 1f })
            {
                var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                post.name = "Post";
                post.transform.SetParent(root.transform, false);
                post.transform.localPosition = new Vector3(side * widthWorld / 2f, barHeight / 2f, 0f);
                post.transform.localScale = new Vector3(0.035f, barHeight / 2f, 0.035f);
                var collider = post.GetComponent<Collider>();
                if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
                post.GetComponent<MeshRenderer>().sharedMaterial = postMat;
            }
        }
    }
}
