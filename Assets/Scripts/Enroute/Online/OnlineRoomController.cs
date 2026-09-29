using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Enroute.Core;
using UnityEngine;

namespace Enroute.Online
{
    public enum ConnectionState { Connecting, Online, Reconnecting }

    /// <summary>
    /// Ported from game/hooks/useOnlineRoom.ts. Keeps this device in sync with an online
    /// room ("salon"): the server stores the whole GameState with a version number. Moves
    /// are applied locally right away with the shared GameReducer (so the table reacts
    /// instantly), then committed with the version they were based on; if someone else
    /// committed first the write is refused and the device resyncs. Every client polls
    /// the room (which doubles as its presence heartbeat).
    ///
    /// Note: the web client also nudges peers over a Supabase Realtime broadcast channel
    /// as a speed-up on top of polling — that's left out of this first pass (polling
    /// alone keeps a turn-based game fully playable; a realtime channel can be layered in
    /// later without changing this class's public surface).
    /// </summary>
    public class OnlineRoomController : MonoBehaviour
    {
        private const float PollIntervalSeconds = 1.5f;
        private const float PollBackgroundSeconds = 5f;
        /// <summary>Animations waiting to play are capped so a long absence doesn't replay a whole game.</summary>
        private const int MaxQueuedEvents = 8;

        public event Action<RoomSnapshot> OnMetaChanged;
        public event Action<GameState> OnGameChanged;
        public event Action<ConnectionState> OnConnectionChanged;
        public event Action<string> OnLost;
        public event Action<string> OnError;

        public string Code { get; private set; }
        public Seat Seat { get; private set; }
        public RoomSnapshot Meta { get; private set; }
        public GameState Game { get; private set; }
        public ConnectionState Connection { get; private set; } = ConnectionState.Connecting;

        private int _version = -1;
        private int _pending;
        private Task _chain = Task.CompletedTask;
        private bool _stopped;
        private bool _backgrounded;

        public void Begin(string code, Seat seat)
        {
            Code = code;
            Seat = seat;
            _version = -1;
            _stopped = false;
            Connection = ConnectionState.Connecting;
            _ = PollLoop();
        }

        private void OnDestroy() => _stopped = true;

        private void OnApplicationPause(bool paused) => _backgrounded = paused;

        private async Task PollLoop()
        {
            while (!_stopped)
            {
                await Sync();
                var wait = _backgrounded ? PollBackgroundSeconds : PollIntervalSeconds;
                await Task.Delay(TimeSpan.FromSeconds(wait));
            }
        }

        private void SetGame(GameState next)
        {
            Game = next;
            OnGameChanged?.Invoke(next);
        }

        private void ApplySnapshot(RoomSnapshot snap, string playerId)
        {
            var state = snap.State;
            var events = snap.Events;
            Meta = snap;
            OnMetaChanged?.Invoke(snap);

            // Versions only grow: an older snapshot (a poll that raced our own commit) is ignored.
            if (state == null || snap.Version <= _version || _pending > 0) return;

            var prev = Game;
            var firstLoad = _version == -1 || prev == null || prev.StartedAt != state.StartedAt;
            _version = snap.Version;

            List<GameAnimationEvent> queue;
            if (!firstLoad && snap.LastActor != playerId && events != null)
            {
                var known = new HashSet<string>(prev.AnimationQueue.Select(e => e.Id));
                queue = prev.AnimationQueue.Concat(events.Where(e => !known.Contains(e.Id))).ToList();
                if (queue.Count > MaxQueuedEvents) queue = queue.Skip(queue.Count - MaxQueuedEvents).ToList();
            }
            else if (!firstLoad)
            {
                queue = prev.AnimationQueue;
            }
            else
            {
                queue = new List<GameAnimationEvent>();
            }

            state.AnimationQueue = queue;
            SetGame(state);
        }

        private async Task Sync(bool force = false)
        {
            if (Seat == null) return;
            try
            {
                var snap = await SupabaseApi.RoomSync(Code, Seat, force ? -1 : _version);
                if (force) _version = -1; // make sure the fresh state is applied
                ApplySnapshot(snap, Seat.PlayerId);
                Connection = ConnectionState.Online;
                OnConnectionChanged?.Invoke(Connection);
            }
            catch (OnlineError e) when (e.Kind == OnlineErrorKind.Denied)
            {
                OnLost?.Invoke("Vous ne faites plus partie de cette partie, ou elle n'existe plus.");
                OnlineSession.ForgetSeat(Code);
            }
            catch (Exception)
            {
                Connection = ConnectionState.Reconnecting;
                OnConnectionChanged?.Invoke(Connection);
            }
        }

        private static GameState ToStored(GameState state)
        {
            var clone = JsonSettings.Clone(state);
            clone.AnimationQueue = new List<GameAnimationEvent>();
            return clone;
        }

        private static bool SameGame(GameState a, GameState b) => JsonSettings.Serialize(ToStored(a)) == JsonSettings.Serialize(ToStored(b));

        /// <summary>Queues a state write; writes go out one at a time, each on top of the previous version.</summary>
        private void EnqueueCommit(GameState state, List<GameAnimationEvent> events)
        {
            if (Seat == null) return;
            _pending += 1;
            _chain = _chain.ContinueWith(async _ =>
            {
                var outOfSync = false;
                for (var attempt = 0; attempt < 3; attempt++)
                {
                    try
                    {
                        var res = await SupabaseApi.CommitState(Code, Seat, _version, ToStored(state), events);
                        if (res.Ok) _version = res.Version;
                        else outOfSync = true;
                        break;
                    }
                    catch (OnlineError e) when (e.Kind != OnlineErrorKind.Network)
                    {
                        outOfSync = true;
                        break;
                    }
                    catch (Exception)
                    {
                        if (attempt == 2) outOfSync = true;
                        else await Task.Delay(800 * (attempt + 1));
                    }
                }
                _pending -= 1;
                if (outOfSync && _pending == 0)
                {
                    OnError?.Invoke("Coup refusé : la partie a été resynchronisée.");
                    await Sync(true);
                }
            }).Unwrap();
        }

        public void Dispatch(GameAction action)
        {
            var baseState = Game;
            if (baseState == null || Seat == null) return;

            if (action.Type == GameActionType.ClearAnimation)
            {
                SetGame(GameReducer.Reduce(baseState, action));
                return;
            }

            var current = baseState.Players[baseState.CurrentPlayerIndex];
            if (action.Type != GameActionType.SkipTurn && current.Id != Seat.PlayerId) return;

            var next = GameReducer.Reduce(baseState, action);
            if (SameGame(baseState, next)) return; // the engine refused the move

            var known = new HashSet<string>(baseState.AnimationQueue.Select(e => e.Id));
            var events = next.AnimationQueue.Where(e => !known.Contains(e.Id)).ToList();
            SetGame(next);
            EnqueueCommit(next, events);
        }

        private async Task Run(Func<Task> task)
        {
            OnError?.Invoke(null);
            try
            {
                await task();
                await Sync();
            }
            catch (OnlineError e)
            {
                OnError?.Invoke(e.Message);
            }
        }

        public Task ToggleReady(bool ready) => Seat == null ? Task.CompletedTask : Run(() => SupabaseApi.SetReady(Code, Seat, ready));

        /// <summary>Host only: deals a fresh game from the current lobby (or rematch).</summary>
        public Task Deal()
        {
            if (Seat == null || Meta == null) return Task.CompletedTask;
            var options = new NewGameOptions
            {
                Id = Code,
                Players = Meta.Players.Select(p => new NewGamePlayer { Id = p.Id, Name = p.Name, Color = p.Color }).ToList(),
                Ambiance = Meta.Settings.Ambiance,
                Target = Meta.Settings.Target,
            };
            var state = GameReducer.CreateGame(options);
            return Run(() => SupabaseApi.StartGame(Code, Seat, ToStored(state)));
        }

        public async Task Leave()
        {
            if (Seat == null) return;
            try { await SupabaseApi.LeaveRoom(Code, Seat); }
            catch { /* leaving is best effort */ }
            if (Meta?.Status == "lobby") OnlineSession.ForgetSeat(Code);
        }
    }
}
