using System.Collections.Generic;
using System.Linq;

namespace Enroute.Core
{
    /// <summary>Ported 1:1 from game/components/board/pieceLayout.ts.</summary>
    public static class PieceLayout
    {
        public struct PieceSlot
        {
            /// <summary>Arc position of the car's centre (units along the road).</summary>
            public float S;
            /// <summary>Sideways offset from the road centre (positive = right of travel).</summary>
            public float Lateral;
            /// <summary>Sideways offset of the name plaque from the road centre.</summary>
            public float LabelOffset;
        }

        private const float CarGap = 60f;
        private const float Lane = 18f;
        /// <summary>The car's centre sits this far behind its true distance, so the nose touches the mark.</summary>
        private const float Nose = 36f;
        private const float LabelBase = 62f;
        private const float LabelStep = 32f;

        /// <summary>Rendered length of a pion in board units at scale 1.</summary>
        public const float PieceLength = 72f;

        /// <summary>Pions grow when the board is shown small so they stay readable on screen
        /// (`pxPerUnit` = on-screen pixels per board unit, camera zoom included).</summary>
        public static float PieceScaleFor(float pxPerUnit)
        {
            if (pxPerUnit <= 0) return 1f;
            const float minOnScreenPx = 36f;
            return System.Math.Min(2f, System.Math.Max(1f, minOnScreenPx / (PieceLength * pxPerUnit)));
        }

        public struct PlayerDistance
        {
            public string Id;
            public float Distance;
        }

        private struct RankedItem
        {
            public string Id;
            public int Index;
            public float S;
        }

        /// <summary>Cars that would overlap are laid out two abreast, extra cars queueing behind
        /// (a starting grid at the départ, a traffic jam elsewhere).</summary>
        public static Dictionary<string, PieceSlot> LayoutPieces(List<PlayerDistance> players, int target, float scale = 1f)
        {
            var gap = CarGap * scale;
            var items = players
                .Select((p, index) => new RankedItem { Id = p.Id, Index = index, S = System.Math.Min(p.Distance, target) / target * RoadPath.RoadLength - Nose * scale })
                .OrderByDescending(x => x.S)
                .ThenBy(x => x.Index)
                .ToList();

            var clusters = new List<List<RankedItem>>();
            foreach (var item in items)
            {
                var current = clusters.Count > 0 ? clusters[clusters.Count - 1] : null;
                if (current != null && current.Count > 0 && current[current.Count - 1].S - item.S < gap)
                {
                    current.Add(item);
                }
                else
                {
                    clusters.Add(new List<RankedItem> { item });
                }
            }

            var slots = new Dictionary<string, PieceSlot>();
            foreach (var cluster in clusters)
            {
                var placed = new List<float>();
                for (var k = 0; k < cluster.Count; k++)
                {
                    var item = cluster[k];
                    var solo = cluster.Count == 1;
                    var side = (solo || k % 2 == 1) ? 1f : -1f;
                    float s = k >= 2 ? System.Math.Min(item.S, placed[k - 2] - gap) : item.S;
                    placed.Add(s);
                    slots[item.Id] = new PieceSlot
                    {
                        S = s,
                        Lateral = solo ? 0f : side * Lane * scale,
                        LabelOffset = side * (LabelBase + (k / 2) * LabelStep) * scale,
                    };
                }
            }
            return slots;
        }
    }
}
