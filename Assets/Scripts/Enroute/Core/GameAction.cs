using System.Collections.Generic;

namespace Enroute.Core
{
    public enum GameActionType { DrawCard, PlayDistance, PlayAttack, PlayDefense, PlaySpecial, DiscardCard, SkipTurn, ClearAnimation, NewGame }

    public class NewGameOptions
    {
        public string Id;
        public List<NewGamePlayer> Players = new List<NewGamePlayer>();
        public int? Target;
        public AmbianceId? Ambiance;
    }

    public class NewGamePlayer
    {
        public string Id;
        public string Name;
        public PlayerColor Color;
        public bool? IsBot;
    }

    /// <summary>Ported from game/lib/engine/gameReducer.ts GameAction. Flat DTO — only the
    /// fields relevant to `Type` are populated, mirroring the TS discriminated union.</summary>
    public class GameAction
    {
        public GameActionType Type;
        public string CardUid;
        public string TargetId;
        public NewGameOptions Options;

        public static GameAction DrawCard() => new GameAction { Type = GameActionType.DrawCard };
        public static GameAction PlayDistance(string cardUid) => new GameAction { Type = GameActionType.PlayDistance, CardUid = cardUid };
        public static GameAction PlayAttack(string cardUid, string targetId) => new GameAction { Type = GameActionType.PlayAttack, CardUid = cardUid, TargetId = targetId };
        public static GameAction PlayDefense(string cardUid) => new GameAction { Type = GameActionType.PlayDefense, CardUid = cardUid };
        public static GameAction PlaySpecial(string cardUid, string targetId = null) => new GameAction { Type = GameActionType.PlaySpecial, CardUid = cardUid, TargetId = targetId };
        public static GameAction DiscardCard(string cardUid) => new GameAction { Type = GameActionType.DiscardCard, CardUid = cardUid };
        public static GameAction SkipTurn() => new GameAction { Type = GameActionType.SkipTurn };
        public static GameAction ClearAnimation() => new GameAction { Type = GameActionType.ClearAnimation };
        public static GameAction NewGame(NewGameOptions options) => new GameAction { Type = GameActionType.NewGame, Options = options };
    }
}
