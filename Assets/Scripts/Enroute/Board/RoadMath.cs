using Enroute.Core;

namespace Enroute.Board
{
    /// <summary>Shared distance-in-km &lt;-&gt; arc-length conversion, so the vehicle mover and
    /// anything spawning props on the road (barriers, hazard icons) agree on where "the car
    /// at 350 km" actually sits. Matches game/components/board/pieceLayout.ts's NOSE offset.</summary>
    public static class RoadMath
    {
        public const float Nose = 36f;

        public static float DistanceToS(float distanceKm, int target)
        {
            var clamped = distanceKm > target ? target : distanceKm;
            return clamped / target * RoadPath.RoadLength - Nose;
        }
    }
}
