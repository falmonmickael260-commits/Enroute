using System.Collections.Generic;

namespace Enroute.Core
{
    /// <summary>Ported 1:1 from game/types/game.ts GameState.</summary>
    public class GameState
    {
        public string Id;
        public int Target;
        public List<PlayerState> Players = new List<PlayerState>();
        public int CurrentPlayerIndex;
        public List<CardInstance> Deck = new List<CardInstance>();
        public List<CardInstance> Discard = new List<CardInstance>();
        public GamePhase Phase;
        public int Turn;
        public string WinnerId;
        public List<LogEntry> Log = new List<LogEntry>();
        public AmbianceId Ambiance;
        public long StartedAt;
        public List<GameAnimationEvent> AnimationQueue = new List<GameAnimationEvent>();
    }
}
