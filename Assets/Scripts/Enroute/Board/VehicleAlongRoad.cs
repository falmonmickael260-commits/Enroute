using Enroute.Core;
using UnityEngine;

namespace Enroute.Board
{
    /// <summary>
    /// Places and smoothly drives a vehicle along the exact same road curve as
    /// <see cref="RoadBuilder"/> (and the web client's roadPath.ts). Distance in
    /// kilometres (0..target) is converted to an arc-length position `s`, exactly as
    /// the web client's pieceLayout.ts does, so the car glides along the real curve
    /// instead of cutting across the board.
    /// </summary>
    public class VehicleAlongRoad : MonoBehaviour
    {
        public RoadBuilder Road;

        [Tooltip("Board units/second the vehicle travels when its target position changes.")]
        public float TravelSpeed = 260f;

        [Tooltip("Degrees/second the vehicle turns to face its travel direction.")]
        public float TurnSpeed = 220f;

        [Tooltip("Sideways offset from the road centreline, in board units (see PieceLayout).")]
        public float LateralBoardUnits;

        [Tooltip("Height above the road surface, in world units.")]
        public float RideHeight = 0.06f;

        private float _currentS;
        private float _targetS;
        private bool _initialized;

        /// <summary>Jump straight to a distance with no travel animation — used when
        /// first placing the car (start grid, joining a game already in progress).</summary>
        public void SnapToDistance(float distanceKm, int target)
        {
            _currentS = _targetS = DistanceToS(distanceKm, target);
            _initialized = true;
            ApplyTransform(_currentS);
        }

        /// <summary>Sets a new target distance; Update() glides the car there.</summary>
        public void MoveToDistance(float distanceKm, int target)
        {
            _targetS = DistanceToS(distanceKm, target);
            if (!_initialized) SnapToDistance(distanceKm, target);
        }

        private static float DistanceToS(float distanceKm, int target)
        {
            const float nose = 36f; // matches PieceLayout.NOSE — nose of the car touches the mark
            var clamped = Mathf.Min(distanceKm, target);
            return clamped / target * RoadPath.RoadLength - nose;
        }

        private void Update()
        {
            if (!_initialized || Road == null) return;
            if (!Mathf.Approximately(_currentS, _targetS))
                _currentS = Mathf.MoveTowards(_currentS, _targetS, TravelSpeed * Time.deltaTime);
            ApplyTransform(_currentS);
        }

        private void ApplyTransform(float s)
        {
            var p = RoadPath.PointAtLength(s);
            var (x, y) = RoadPath.OffsetPoint(p, LateralBoardUnits);
            var pos = Road.BoardToWorld(x, y, RideHeight);
            transform.position = pos;

            // board heading (0 = east, board Y down) -> world forward (X, Z)
            var rad = p.Angle * Mathf.Deg2Rad;
            var forward = new Vector3(Mathf.Cos(rad), 0f, Mathf.Sin(rad));
            if (forward.sqrMagnitude > 0.0001f)
            {
                var targetRot = Quaternion.LookRotation(forward, Vector3.up);
                transform.rotation = Application.isPlaying
                    ? Quaternion.RotateTowards(transform.rotation, targetRot, TurnSpeed * Time.deltaTime)
                    : targetRot;
            }
        }
    }
}
