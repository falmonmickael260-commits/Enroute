namespace Enroute.Core
{
    /// <summary>
    /// Ported from game/types/game.ts GameAnimationEvent. TypeScript models this as a
    /// discriminated union; here it's a flat DTO (simplest 1:1 JSON shape) — only the
    /// fields relevant to `Kind` are populated, the rest stay null/default.
    /// </summary>
    public class GameAnimationEvent
    {
        public string Id;
        public AnimationKind Kind;

        /// <summary>draw, discard, move, hazard, shield, turnChange, victory.</summary>
        public string PlayerId;

        /// <summary>move only.</summary>
        public int? From;

        /// <summary>move only.</summary>
        public int? To;

        /// <summary>hazard only.</summary>
        public HazardType? Hazard;

        /// <summary>shield only.</summary>
        public DefenseType? Defense;

        /// <summary>discard only.</summary>
        public string CardUid;
    }
}
