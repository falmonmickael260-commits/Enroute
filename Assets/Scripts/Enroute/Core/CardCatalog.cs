using System;
using System.Collections.Generic;

namespace Enroute.Core
{
    /// <summary>
    /// Ported 1:1 from game/lib/engine/cardCatalog.ts. Counts and values must stay
    /// exactly as-is: they define the deck composition the current rules are tuned
    /// for (2-4 players, hand size 7, 1000 km).
    /// </summary>
    public static class CardCatalog
    {
        public class Entry
        {
            public CardDef Def;
            public int Count;
        }

        public static readonly Dictionary<string, Entry> All = new Dictionary<string, Entry>
        {
            // ---- Distance cards ----
            ["dist25"] = new Entry { Count = 10, Def = new CardDef { Category = CardCategory.Distance, Id = "dist25", Title = "25 KM", Subtitle = "Petite ligne droite", Value = 25 } },
            ["dist50"] = new Entry { Count = 10, Def = new CardDef { Category = CardCategory.Distance, Id = "dist50", Title = "50 KM", Subtitle = "Route dégagée", Value = 50 } },
            ["dist75"] = new Entry { Count = 10, Def = new CardDef { Category = CardCategory.Distance, Id = "dist75", Title = "75 KM", Subtitle = "Bonne cadence", Value = 75 } },
            ["dist100"] = new Entry { Count = 12, Def = new CardDef { Category = CardCategory.Distance, Id = "dist100", Title = "100 KM", Subtitle = "Grande ligne droite", Value = 100 } },
            ["dist200"] = new Entry { Count = 4, Def = new CardDef { Category = CardCategory.Distance, Id = "dist200", Title = "200 KM", Subtitle = "Autoroute libre", Value = 200 } },

            // ---- Attack cards ----
            ["collision"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Attaque, Id = "collision", Title = "COLLISION", Subtitle = "Immobilise un adversaire", Hazard = HazardType.Collision } },
            ["crevaison"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Attaque, Id = "crevaison", Title = "CREVAISON", Subtitle = "Un pneu lâche", Hazard = HazardType.Crevaison } },
            ["panne"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Attaque, Id = "panne", Title = "PANNE", Subtitle = "Plus une goutte d'essence", Hazard = HazardType.Panne } },
            ["radar"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Attaque, Id = "radar", Title = "RADAR", Subtitle = "Limité à 50 km/h", Hazard = HazardType.Radar } },
            ["barrage"] = new Entry { Count = 4, Def = new CardDef { Category = CardCategory.Attaque, Id = "barrage", Title = "BARRAGE", Subtitle = "Route bloquée", Hazard = HazardType.Barrage } },

            // ---- Defense cards ----
            ["reparation"] = new Entry { Count = 6, Def = new CardDef { Category = CardCategory.Defense, Id = "reparation", Title = "RÉPARATION", Subtitle = "Remet le véhicule en état", Defense = DefenseType.Reparation, Counters = HazardType.Collision } },
            ["roueSecours"] = new Entry { Count = 6, Def = new CardDef { Category = CardCategory.Defense, Id = "roueSecours", Title = "ROUE DE SECOURS", Subtitle = "Change le pneu crevé", Defense = DefenseType.RoueSecours, Counters = HazardType.Crevaison } },
            ["pleinEssence"] = new Entry { Count = 6, Def = new CardDef { Category = CardCategory.Defense, Id = "pleinEssence", Title = "PLEIN D'ESSENCE", Subtitle = "Fait le plein au plus vite", Defense = DefenseType.PleinEssence, Counters = HazardType.Panne } },
            ["gps"] = new Entry { Count = 6, Def = new CardDef { Category = CardCategory.Defense, Id = "gps", Title = "GPS", Subtitle = "Évite les zones radar", Defense = DefenseType.Gps, Counters = HazardType.Radar } },
            ["passageLibre"] = new Entry { Count = 6, Def = new CardDef { Category = CardCategory.Defense, Id = "passageLibre", Title = "PASSAGE LIBRE", Subtitle = "La route s'ouvre à nouveau", Defense = DefenseType.PassageLibre, Counters = HazardType.Barrage } },

            // ---- Special En Route cards ----
            ["turbo"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Special, Id = "turbo", Title = "TURBO", Subtitle = "Coup d'accélérateur, ignore les limitations de vitesse", Special = SpecialType.Turbo, Value = 100 } },
            ["raccourci"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Special, Id = "raccourci", Title = "RACCOURCI", Subtitle = "Un chemin de traverse bien connu", Special = SpecialType.Raccourci, Value = 30 } },
            ["depassement"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Special, Id = "depassement", Title = "DÉPASSEMENT", Subtitle = "Doublez un adversaire de 10 km", Special = SpecialType.Depassement } },
            ["gpsStrategique"] = new Entry { Count = 2, Def = new CardDef { Category = CardCategory.Special, Id = "gpsStrategique", Title = "GPS STRATÉGIQUE", Subtitle = "Choisissez librement une action de défense", Special = SpecialType.GpsStrategique } },
            ["derniereLigneDroite"] = new Entry { Count = 3, Def = new CardDef { Category = CardCategory.Special, Id = "derniereLigneDroite", Title = "DERNIÈRE LIGNE DROITE", Subtitle = "Un dernier effort avant l'arrivée", Special = SpecialType.DerniereLigneDroite, Value = 100 } },
        };

        public static CardDef GetCardDef(string defId)
        {
            if (!All.TryGetValue(defId, out var entry))
                throw new ArgumentException($"Unknown card definition: {defId}");
            return entry.Def;
        }

        public static readonly Dictionary<HazardType, DefenseType> HazardToDefense = new Dictionary<HazardType, DefenseType>
        {
            { HazardType.Collision, DefenseType.Reparation },
            { HazardType.Crevaison, DefenseType.RoueSecours },
            { HazardType.Panne, DefenseType.PleinEssence },
            { HazardType.Radar, DefenseType.Gps },
            { HazardType.Barrage, DefenseType.PassageLibre },
        };

        public static readonly Dictionary<DefenseType, HazardType> DefenseToHazard = new Dictionary<DefenseType, HazardType>
        {
            { DefenseType.Reparation, HazardType.Collision },
            { DefenseType.RoueSecours, HazardType.Crevaison },
            { DefenseType.PleinEssence, HazardType.Panne },
            { DefenseType.Gps, HazardType.Radar },
            { DefenseType.PassageLibre, HazardType.Barrage },
        };
    }
}
