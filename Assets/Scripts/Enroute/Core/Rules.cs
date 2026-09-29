using System.Linq;

namespace Enroute.Core
{
    /// <summary>Ported 1:1 from game/lib/engine/rules.ts. Do not change the logic here
    /// without changing it identically on the web client — both must agree on what
    /// moves are legal since either can be the one committing a shared room state.</summary>
    public static class Rules
    {
        public static bool IsRoadClear(PlayerState player) => player.Hazard == null;

        /// <summary>Whether a given hazard type is currently in effect on this player — RADAR
        /// is tracked via the `limited` flag (a speed cap), not the `hazard` field
        /// (a full stop), so the two need separate checks.</summary>
        public static bool HazardActive(PlayerState player, HazardType hazard)
        {
            if (hazard == HazardType.Radar) return player.Limited;
            return player.Hazard == hazard;
        }

        public static bool CanPlayDistance(PlayerState player, CardDef def, int target)
        {
            if (player.Finished) return false;
            if (!IsRoadClear(player)) return false;
            if (player.Distance >= target) return false;
            if (player.Limited && (def.Value ?? 0) > 50) return false;
            return true;
        }

        public static bool CanPlayAttack(PlayerState actor, PlayerState victim, CardDef def, int target)
        {
            if (!IsRoadClear(actor)) return false; // a stopped car can't attack — only repair or discard
            if (actor.Id == victim.Id) return false;
            if (victim.Finished || victim.Distance >= target) return false;
            if (def.Hazard == null) return false;
            if (victim.Hazard != null || victim.Limited) return false; // already hazarded or speed-limited
            var defenseNeeded = CardCatalog.HazardToDefense[def.Hazard.Value];
            if (victim.Shields.Contains(defenseNeeded)) return false; // immune
            return true;
        }

        public static bool CanPlayDefenseReactive(PlayerState player, CardDef def)
        {
            if (def.Defense == null || def.Counters == null) return false;
            return HazardActive(player, def.Counters.Value);
        }

        public static bool CanPlayDefenseShield(PlayerState player, CardDef def)
        {
            if (def.Defense == null || def.Counters == null) return false;
            if (!IsRoadClear(player)) return false; // stopped: only the matching repair can be played
            if (HazardActive(player, def.Counters.Value)) return false; // reactive is the right move here
            if (player.Shields.Contains(def.Defense.Value)) return false; // already immune
            return true;
        }

        public static bool CanPlaySpecial(PlayerState player, CardDef def, GameState state, string targetId = null)
        {
            if (player.Finished) return false;
            switch (def.Special)
            {
                case SpecialType.Turbo:
                    return IsRoadClear(player) && player.Distance < state.Target;
                case SpecialType.Raccourci:
                    return CanPlayDistance(player, def, state.Target);
                case SpecialType.DerniereLigneDroite:
                    return CanPlayDistance(player, def, state.Target) && player.Distance >= state.Target - 200;
                case SpecialType.Depassement:
                {
                    if (!IsRoadClear(player)) return false;
                    if (string.IsNullOrEmpty(targetId)) return true; // playable in principle if any valid target exists
                    var victim = state.Players.FirstOrDefault(p => p.Id == targetId);
                    if (victim == null || victim.Id == player.Id) return false;
                    return victim.Distance > player.Distance;
                }
                case SpecialType.GpsStrategique:
                    return true; // always usable: clears a hazard, or grants tempo if road is clear
                default:
                    return false;
            }
        }

        public static bool HasAnyValidTarget(PlayerState player, CardDef def, GameState state)
        {
            if (def.Category == CardCategory.Attaque)
                return state.Players.Any(p => CanPlayAttack(player, p, def, state.Target));
            if (def.Special == SpecialType.Depassement)
                return state.Players.Any(p => p.Id != player.Id && p.Distance > player.Distance);
            return true;
        }

        /// <summary>Can this card be played *right now*, in some form (attack/defense/distance/special)?
        /// Used for hand highlighting.</summary>
        public static bool IsCardPlayable(PlayerState player, string cardDefId, GameState state)
        {
            var def = CardCatalog.GetCardDef(cardDefId);
            if (def.Category == CardCategory.Distance) return CanPlayDistance(player, def, state.Target);
            if (def.Category == CardCategory.Attaque) return HasAnyValidTarget(player, def, state);
            if (def.Category == CardCategory.Defense) return CanPlayDefenseReactive(player, def) || CanPlayDefenseShield(player, def);
            if (def.Category == CardCategory.Special)
            {
                if (def.Special == SpecialType.Depassement) return HasAnyValidTarget(player, def, state);
                return CanPlaySpecial(player, def, state);
            }
            return false;
        }

        /// <summary>What hazard badge to show for this player — folds the `limited` (radar) flag
        /// back into a HazardType so the UI has one thing to render.</summary>
        public static HazardType? DisplayHazard(PlayerState player)
        {
            if (player.Hazard != null) return player.Hazard;
            if (player.Limited) return HazardType.Radar;
            return null;
        }

        public static PlayerState ActivePlayer(GameState state) => state.Players[state.CurrentPlayerIndex];

        public static string HazardLabel(HazardType hazard)
        {
            switch (hazard)
            {
                case HazardType.Collision: return "Collision";
                case HazardType.Crevaison: return "Crevaison";
                case HazardType.Panne: return "Panne d'essence";
                case HazardType.Radar: return "Radar";
                case HazardType.Barrage: return "Barrage";
                default: return string.Empty;
            }
        }
    }
}
