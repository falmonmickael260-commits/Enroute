using System.Collections.Generic;

namespace Enroute.Core
{
    /// <summary>Full per-player game state, ported 1:1 from game/types/game.ts PlayerState.</summary>
    public class PlayerState
    {
        public string Id;
        public string Name;
        public PlayerColor Color;
        public bool? IsBot;
        public List<CardInstance> Hand = new List<CardInstance>();
        public int Distance;
        public HazardType? Hazard;
        public bool Limited;
        public List<DefenseType> Shields = new List<DefenseType>();
        public bool TurboUsed;
        public bool ExtraTurn;
        public int AttacksSurvived;
        public int CardsPlayed;
        public int ShieldsPlayed;
        public int AttacksSent;
        public bool Finished;
        public int? FinishTurn;
        public bool Connected;
        public bool Ready;
    }

    /// <summary>Lobby roster entry stored in rooms.players before the game starts.</summary>
    public class RoomPlayer
    {
        public string Id;
        public string Name;
        public PlayerColor Color;
        public bool Ready;
    }
}
