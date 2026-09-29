using System.Collections.Generic;

namespace Enroute.Core
{
    /// <summary>Ported 1:1 from game/lib/engine/deck.ts.</summary>
    public static class Deck
    {
        public const int HandLimit = 7;
        public const int DefaultTarget = 1000;
        public const int FinalStretchFrom = 800;

        public static List<CardInstance> BuildDeck()
        {
            var cards = new List<CardInstance>();
            foreach (var entry in CardCatalog.All.Values)
            {
                for (var i = 0; i < entry.Count; i++)
                    cards.Add(new CardInstance { Uid = Utils.Uid(entry.Def.Id + "-"), DefId = entry.Def.Id });
            }
            return Utils.Shuffle(cards);
        }
    }
}
