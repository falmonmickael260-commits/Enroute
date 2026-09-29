using System;
using System.Collections.Generic;

namespace Enroute.Core
{
    /// <summary>
    /// Ported 1:1 from game/components/board/roadPath.ts. Board geometry: the route is a
    /// serpentine on a 1600x1000 board — three straight rows joined by two half-turns.
    /// Everything is parametrised by arc length so pions can be placed at any distance and
    /// the Unity board/vehicles can follow the exact same curve as the web client.
    /// </summary>
    public static class RoadPath
    {
        public const float BoardWidth = 1600f;
        public const float BoardHeight = 1000f;
        public const float RoadWidth = 64f;

        public const float RowBottom = 850f;
        public const float RowMiddle = 550f;
        public const float RowTop = 250f;

        private const float TurnRadius = 150f;
        private const float StartX = 200f;
        private const float FinishX = 1400f;
        private const float RightTurnX = 1340f;
        private const float LeftTurnX = 260f;

        public struct RoadPoint
        {
            public float X, Y;
            /// <summary>Heading in degrees (0 = east, SVG y-down).</summary>
            public float Angle;
            /// <summary>Unit normal pointing to the right-hand side of travel.</summary>
            public float Nx, Ny;
        }

        private abstract class Segment
        {
            public float Length;
            public abstract RoadPoint PointAt(float local);
        }

        private class LineSegment : Segment
        {
            public float X1, Y1, X2, Y2;
            public LineSegment(float x1, float y1, float x2, float y2)
            {
                X1 = x1; Y1 = y1; X2 = x2; Y2 = y2;
                Length = (float)Math.Sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            }
            public override RoadPoint PointAt(float local)
            {
                var t = Length == 0 ? 0 : local / Length;
                var tx = (X2 - X1) / Length;
                var ty = (Y2 - Y1) / Length;
                return new RoadPoint
                {
                    X = X1 + (X2 - X1) * t,
                    Y = Y1 + (Y2 - Y1) * t,
                    Angle = (float)(Math.Atan2(ty, tx) * 180 / Math.PI),
                    Nx = -ty,
                    Ny = tx,
                };
            }
        }

        private class ArcSegment : Segment
        {
            public float Cx, Cy, R, A0, A1;
            public ArcSegment(float cx, float cy, float r, float a0, float a1)
            {
                Cx = cx; Cy = cy; R = r; A0 = a0; A1 = a1;
                Length = Math.Abs(a1 - a0) * r;
            }
            public override RoadPoint PointAt(float local)
            {
                var dir = Math.Sign(A1 - A0);
                var a = A0 + dir * local / R;
                var tx = (float)(-Math.Sin(a) * dir);
                var ty = (float)(Math.Cos(a) * dir);
                return new RoadPoint
                {
                    X = (float)(Cx + R * Math.Cos(a)),
                    Y = (float)(Cy + R * Math.Sin(a)),
                    Angle = (float)(Math.Atan2(ty, tx) * 180 / Math.PI),
                    Nx = -ty,
                    Ny = tx,
                };
            }
        }

        private static readonly List<Segment> Segments = new List<Segment>
        {
            new LineSegment(StartX, RowBottom, RightTurnX, RowBottom),
            new ArcSegment(RightTurnX, (RowBottom + RowMiddle) / 2, TurnRadius, (float)Math.PI / 2, -(float)Math.PI / 2),
            new LineSegment(RightTurnX, RowMiddle, LeftTurnX, RowMiddle),
            new ArcSegment(LeftTurnX, (RowMiddle + RowTop) / 2, TurnRadius, (float)Math.PI / 2, (float)(3 * Math.PI / 2)),
            new LineSegment(LeftTurnX, RowTop, FinishX, RowTop),
        };

        public static readonly float RoadLength = ComputeRoadLength();

        private static float ComputeRoadLength()
        {
            var sum = 0f;
            foreach (var s in Segments) sum += s.Length;
            return sum;
        }

        private static RoadPoint Extend(RoadPoint p, float by)
        {
            var rad = p.Angle * Math.PI / 180;
            p.X += (float)(Math.Cos(rad) * by);
            p.Y += (float)(Math.Sin(rad) * by);
            return p;
        }

        /// <summary>Point at `s` units of road from the start line. Values outside the route
        /// continue straight along the lead-in / run-out (used for the starting grid).</summary>
        public static RoadPoint PointAtLength(float s)
        {
            if (s < 0) return Extend(Segments[0].PointAt(0), s);
            if (s > RoadLength)
            {
                var last = Segments[Segments.Count - 1];
                return Extend(last.PointAt(last.Length), s - RoadLength);
            }
            var remaining = s;
            foreach (var seg in Segments)
            {
                if (remaining <= seg.Length) return seg.PointAt(remaining);
                remaining -= seg.Length;
            }
            var lastSeg = Segments[Segments.Count - 1];
            return lastSeg.PointAt(lastSeg.Length);
        }

        /// <summary>Point at fraction `t` (0 = départ, 1 = arrivée).</summary>
        public static RoadPoint PointAtFraction(float t) => PointAtLength(t * RoadLength);

        /// <summary>Offset a road point sideways (positive = right-hand side of travel).</summary>
        public static (float X, float Y) OffsetPoint(RoadPoint p, float lateral) => (p.X + p.Nx * lateral, p.Y + p.Ny * lateral);

        public static readonly (float X, float Y, float R) Plaza = (1490f, RowTop, 44f);
    }
}
