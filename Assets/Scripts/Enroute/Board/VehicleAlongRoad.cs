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

        /// <summary>Current arc-length position on the road, in board units.</summary>
        public float CurrentS { get; private set; }

        private float _targetS;
        private bool _initialized;
        private Transform _statusIcon;
        private MeshRenderer _statusIconRenderer;

        private static readonly Color HazardColorCollision = new Color(0.75f, 0.1f, 0.1f);
        private static readonly Color HazardColorCrevaison = new Color(0.1f, 0.1f, 0.1f);
        private static readonly Color HazardColorPanne = new Color(0.55f, 0.4f, 0.15f);
        private static readonly Color HazardColorRadar = new Color(0.15f, 0.45f, 0.9f);
        private static readonly Color HazardColorBarrage = new Color(0.9f, 0.75f, 0.1f);

        /// <summary>Jump straight to a distance with no travel animation — used when
        /// first placing the car (start grid, joining a game already in progress).</summary>
        public void SnapToDistance(float distanceKm, int target)
        {
            CurrentS = _targetS = RoadMath.DistanceToS(distanceKm, target);
            _initialized = true;
            ApplyTransform(CurrentS);
        }

        /// <summary>Sets a new target distance; Update() glides the car there.</summary>
        public void MoveToDistance(float distanceKm, int target)
        {
            _targetS = RoadMath.DistanceToS(distanceKm, target);
            if (!_initialized) SnapToDistance(distanceKm, target);
        }

        public bool IsMoving => _initialized && !Mathf.Approximately(CurrentS, _targetS);

        /// <summary>Shows/hides a small floating marker above the car for the active hazard —
        /// makes an attack's effect legible at a glance instead of only in a log line.</summary>
        public void SetHazardVisual(HazardType? hazard)
        {
            EnsureStatusIcon();
            if (hazard == null) { _statusIcon.gameObject.SetActive(false); return; }
            _statusIcon.gameObject.SetActive(true);
            _statusIconRenderer.sharedMaterial.color = hazard switch
            {
                HazardType.Collision => HazardColorCollision,
                HazardType.Crevaison => HazardColorCrevaison,
                HazardType.Panne => HazardColorPanne,
                HazardType.Radar => HazardColorRadar,
                HazardType.Barrage => HazardColorBarrage,
                _ => Color.white,
            };
        }

        private void EnsureStatusIcon()
        {
            if (_statusIcon != null) return;
            var existing = transform.Find("StatusIcon");
            GameObject go;
            if (existing != null) go = existing.gameObject;
            else
            {
                go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                go.name = "StatusIcon";
                go.transform.SetParent(transform, false);
                go.transform.localPosition = new Vector3(0f, 0.34f, 0f);
                go.transform.localScale = Vector3.one * 0.12f;
                var collider = go.GetComponent<Collider>();
                if (collider != null) Object.Destroy(collider);
                var shader = Shader.Find("Universal Render Pipeline/Lit");
                var mat = new Material(shader);
                mat.SetFloat("_Smoothness", 0.1f);
                mat.EnableKeyword("_EMISSION");
                go.GetComponent<MeshRenderer>().material = mat;
            }
            _statusIcon = go.transform;
            _statusIconRenderer = go.GetComponent<MeshRenderer>();
        }

        private void Update()
        {
            if (!_initialized || Road == null) return;
            if (IsMoving)
                CurrentS = Mathf.MoveTowards(CurrentS, _targetS, TravelSpeed * Time.deltaTime);
            ApplyTransform(CurrentS);
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
