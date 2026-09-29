using System;
using System.Collections.Generic;
using Enroute.Board;
using Enroute.Core;
using UnityEngine;

namespace Enroute.Game
{
    /// <summary>
    /// Bridges the ported rules engine (Enroute.Core) to the 3D board: applies every
    /// GameReducer transition to the matching VehicleAlongRoad (so cars actually drive
    /// when a distance card is played) and to physical hazard props (a real barrier
    /// appears on the road for a BARRAGE, a status marker shows any active hazard).
    /// Local/hotseat only for now — online play reuses the same State/Dispatch shape
    /// through OnlineRoomController instead of this class.
    /// </summary>
    public class GameController : MonoBehaviour
    {
        [Serializable]
        public struct PlayerSetup
        {
            /// <summary>Name of the VehicleAlongRoad GameObject under VehiclesRoot (e.g. "Vehicle_Crimson").</summary>
            public string VehicleName;
            public string Id;
            public string Name;
            public PlayerColor Color;
        }

        public RoadBuilder Road;
        public Transform VehiclesRoot;
        public Transform BarriersRoot;

        public Material BarrierRedMaterial;
        public Material BarrierWhiteMaterial;
        public Material BarrierPostMaterial;

        [Header("Auto-start (local hotseat) — lets the scene be playable by pressing Play")]
        public bool AutoStartLocalGame = true;
        public List<PlayerSetup> DefaultPlayers = new();
        public int DefaultTarget = 1000;
        public AmbianceId DefaultAmbiance = AmbianceId.Jour;

        public GameState State { get; private set; }
        public event Action<GameState> OnStateChanged;

        private readonly Dictionary<string, VehicleAlongRoad> _vehicles = new();
        private readonly Dictionary<string, GameObject> _barriers = new();

        public void RegisterVehicle(string playerId, VehicleAlongRoad vehicle) => _vehicles[playerId] = vehicle;

        private void Start()
        {
            if (!AutoStartLocalGame || State != null || DefaultPlayers.Count < 2) return;

            foreach (var setup in DefaultPlayers)
            {
                var vehicleTransform = VehiclesRoot != null ? VehiclesRoot.Find(setup.VehicleName) : null;
                var vehicle = vehicleTransform != null ? vehicleTransform.GetComponent<VehicleAlongRoad>() : null;
                if (vehicle != null) RegisterVehicle(setup.Id, vehicle);
            }

            var players = new List<NewGamePlayer>();
            foreach (var setup in DefaultPlayers)
                players.Add(new NewGamePlayer { Id = setup.Id, Name = setup.Name, Color = setup.Color });

            NewLocalGame(players, DefaultTarget, DefaultAmbiance);
        }

        public void NewLocalGame(List<NewGamePlayer> players, int target = 1000, AmbianceId ambiance = AmbianceId.Jour)
        {
            State = GameReducer.CreateGame(new NewGameOptions { Id = "local", Players = players, Target = target, Ambiance = ambiance });
            foreach (var barrier in _barriers.Values) if (barrier != null) Destroy(barrier);
            _barriers.Clear();
            SyncVehicles(snap: true);
            RefreshHazardVisuals();
            OnStateChanged?.Invoke(State);
        }

        public void Dispatch(GameAction action)
        {
            if (State == null) return;
            State = GameReducer.Reduce(State, action);
            SyncVehicles(snap: false);
            RefreshHazardVisuals();
            OnStateChanged?.Invoke(State);
        }

        private void SyncVehicles(bool snap)
        {
            foreach (var p in State.Players)
            {
                if (!_vehicles.TryGetValue(p.Id, out var v)) continue;
                if (snap) v.SnapToDistance(p.Distance, State.Target);
                else v.MoveToDistance(p.Distance, State.Target);
            }
        }

        private void RefreshHazardVisuals()
        {
            foreach (var p in State.Players)
            {
                var hazard = Rules.DisplayHazard(p);
                if (_vehicles.TryGetValue(p.Id, out var v)) v.SetHazardVisual(hazard);
                UpdateBarrier(p, hazard);
            }
        }

        private void UpdateBarrier(PlayerState p, HazardType? hazard)
        {
            var hasBarrage = hazard == HazardType.Barrage;
            _barriers.TryGetValue(p.Id, out var barrierGo);

            if (hasBarrage)
            {
                if (barrierGo == null)
                {
                    barrierGo = new GameObject("Barrier_" + p.Id);
                    barrierGo.transform.SetParent(BarriersRoot, false);
                    var width = Road.WorldScale * (RoadPath.RoadWidth + 24f);
                    BarrierBuilder.Build(barrierGo, width, BarrierRedMaterial, BarrierWhiteMaterial, BarrierPostMaterial);
                    _barriers[p.Id] = barrierGo;
                }
                if (_vehicles.TryGetValue(p.Id, out var v))
                {
                    var s = v.CurrentS + 55f; // a little ahead of the car — visibly blocking the way forward
                    var pt = RoadPath.PointAtLength(s);
                    barrierGo.transform.position = Road.BoardToWorld(pt.X, pt.Y, 0f);
                    var rad = pt.Angle * Mathf.Deg2Rad;
                    var roadForward = new Vector3(Mathf.Cos(rad), 0f, Mathf.Sin(rad));
                    barrierGo.transform.rotation = Quaternion.LookRotation(roadForward, Vector3.up);
                }
            }
            else if (barrierGo != null)
            {
                Destroy(barrierGo);
                _barriers.Remove(p.Id);
            }
        }
    }
}
