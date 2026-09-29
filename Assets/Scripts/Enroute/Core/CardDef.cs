namespace Enroute.Core
{
    /// <summary>Static definition of a card, ported 1:1 from game/types/game.ts CardDef.</summary>
    public class CardDef
    {
        public CardCategory Category;
        public string Id;
        public string Title;
        public string Subtitle;

        /// <summary>Distance cards, and special cards with a fixed distance effect.</summary>
        public int? Value;

        /// <summary>Attack cards only.</summary>
        public HazardType? Hazard;

        /// <summary>Defense cards only.</summary>
        public DefenseType? Defense;

        /// <summary>Counters this hazard.</summary>
        public HazardType? Counters;

        /// <summary>Special cards only.</summary>
        public SpecialType? Special;
    }

    /// <summary>A physical card instance in a deck/hand/discard — ported from CardInstance.</summary>
    public class CardInstance
    {
        public string Uid;
        public string DefId;
    }
}
