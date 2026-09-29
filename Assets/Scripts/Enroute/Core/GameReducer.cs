using System;
using System.Collections.Generic;
using System.Linq;

namespace Enroute.Core
{
    /// <summary>Ported 1:1 from game/lib/engine/gameReducer.ts. Keep this in lockstep with
    /// the TypeScript reducer — an online room can be committed to by either client, so
    /// both must produce identical results for the same state+action.</summary>
    public static class GameReducer
    {
        public static GameState CreateGame(NewGameOptions options)
        {
            var deck = Deck.BuildDeck();
            var players = options.Players.Select(p => new PlayerState
            {
                Id = p.Id,
                Name = p.Name,
                Color = p.Color,
                IsBot = p.IsBot,
                Hand = new List<CardInstance>(),
                Distance = 0,
                Hazard = null,
                Limited = false,
                Shields = new List<DefenseType>(),
                TurboUsed = false,
                ExtraTurn = false,
                AttacksSurvived = 0,
                CardsPlayed = 0,
                ShieldsPlayed = 0,
                AttacksSent = 0,
                Finished = false,
                FinishTurn = null,
                Connected = true,
                Ready = true,
            }).ToList();

            foreach (var player in players)
            {
                player.Hand = deck.Take(Deck.HandLimit).ToList();
                deck.RemoveRange(0, Math.Min(Deck.HandLimit, deck.Count));
            }

            var target = options.Target ?? Deck.DefaultTarget;
            var state = new GameState
            {
                Id = options.Id,
                Target = target,
                Players = players,
                CurrentPlayerIndex = 0,
                Deck = deck,
                Discard = new List<CardInstance>(),
                Phase = GamePhase.Draw,
                Turn = 1,
                WinnerId = null,
                Ambiance = options.Ambiance ?? AmbianceId.Jour,
                StartedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                AnimationQueue = new List<GameAnimationEvent>(),
            };
            state.Log.Add(new LogEntry
            {
                Id = Utils.Uid("log-"),
                Turn = 1,
                ActorId = "system",
                Message = $"La partie commence — direction {target} km !",
                Kind = LogKind.System,
            });
            return state;
        }

        private static void PushAnim(GameState state, GameAnimationEvent evt)
        {
            evt.Id = Utils.Uid("anim-");
            state.AnimationQueue.Add(evt);
        }

        private static void Log(GameState state, string actorId, string message, LogKind kind)
        {
            state.Log.Add(new LogEntry { Id = Utils.Uid("log-"), Turn = state.Turn, ActorId = actorId, Message = message, Kind = kind });
            if (state.Log.Count > 60) state.Log.RemoveAt(0);
        }

        private static readonly Random Rng = new Random();

        private static CardInstance DrawOne(GameState state)
        {
            if (state.Deck.Count == 0)
            {
                if (state.Discard.Count == 0) return null;
                // reshuffle discard pile back into the draw pile
                var reshuffled = new List<CardInstance>(state.Discard);
                state.Discard = new List<CardInstance>();
                state.Deck = reshuffled.OrderBy(_ => Rng.Next()).ToList();
                Log(state, "system", "La pioche est reconstituée à partir de la défausse.", LogKind.System);
            }
            if (state.Deck.Count == 0) return null;
            var card = state.Deck[0];
            state.Deck.RemoveAt(0);
            return card;
        }

        private static CardInstance RemoveFromHand(PlayerState player, string cardUid)
        {
            var idx = player.Hand.FindIndex(c => c.Uid == cardUid);
            if (idx == -1) throw new InvalidOperationException("Card not in hand");
            var card = player.Hand[idx];
            player.Hand.RemoveAt(idx);
            return card;
        }

        private static void CheckVictory(GameState state, PlayerState player)
        {
            if (player.Distance >= state.Target)
            {
                player.Distance = state.Target;
                player.Finished = true;
                player.FinishTurn = state.Turn;
                if (state.WinnerId == null)
                {
                    state.WinnerId = player.Id;
                    state.Phase = GamePhase.GameOver;
                    Log(state, player.Id, $"{player.Name} franchit la ligne d'arrivée et remporte la partie !", LogKind.Victory);
                    PushAnim(state, new GameAnimationEvent { Kind = AnimationKind.Victory, PlayerId = player.Id });
                }
            }
        }

        private static void EndTurnIfNeeded(GameState state, PlayerState currentPlayer)
        {
            if (state.Phase == GamePhase.GameOver) return;
            if (currentPlayer.ExtraTurn)
            {
                currentPlayer.ExtraTurn = false;
                state.Phase = GamePhase.Draw;
                return;
            }
            AdvanceTurn(state);
        }

        private static void AdvanceTurn(GameState state)
        {
            var n = state.Players.Count;
            var next = state.CurrentPlayerIndex;
            for (var i = 0; i < n; i++)
            {
                next = (next + 1) % n;
                if (!state.Players[next].Finished) break;
            }
            state.CurrentPlayerIndex = next;
            state.Turn += 1;
            state.Phase = GamePhase.Draw;
            PushAnim(state, new GameAnimationEvent { Kind = AnimationKind.TurnChange, PlayerId = state.Players[next].Id });
        }

        public static GameState Reduce(GameState state, GameAction action)
        {
            if (action.Type == GameActionType.NewGame) return CreateGame(action.Options);

            // Work on a deep-cloned draft for simplicity/safety, matching structuredClone in the web reducer.
            var draft = JsonSettings.Clone(state);
            if (draft.Phase == GamePhase.GameOver && action.Type != GameActionType.ClearAnimation) return draft;

            var player = draft.Players[draft.CurrentPlayerIndex];

            switch (action.Type)
            {
                case GameActionType.DrawCard:
                {
                    if (draft.Phase != GamePhase.Draw) return draft;
                    var card = DrawOne(draft);
                    if (card != null)
                    {
                        player.Hand.Add(card);
                        PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Draw, PlayerId = player.Id });
                    }
                    draft.Phase = GamePhase.Action;
                    return draft;
                }

                case GameActionType.PlayDistance:
                {
                    if (draft.Phase != GamePhase.Action) return draft;
                    var card = player.Hand.FirstOrDefault(c => c.Uid == action.CardUid);
                    if (card == null) return draft;
                    var def = CardCatalog.GetCardDef(card.DefId);
                    if (def.Category != CardCategory.Distance) return draft;
                    if (!Rules.CanPlayDistance(player, def, draft.Target)) return draft;

                    RemoveFromHand(player, action.CardUid);
                    draft.Discard.Add(card);
                    var from = player.Distance;
                    player.Distance = Math.Min(draft.Target, player.Distance + (def.Value ?? 0));
                    player.CardsPlayed += 1;
                    Log(draft, player.Id, $"{player.Name} joue {def.Title} (+{def.Value} km).", LogKind.Distance);
                    PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Move, PlayerId = player.Id, From = from, To = player.Distance });
                    CheckVictory(draft, player);
                    EndTurnIfNeeded(draft, player);
                    return draft;
                }

                case GameActionType.PlayAttack:
                {
                    if (draft.Phase != GamePhase.Action) return draft;
                    var card = player.Hand.FirstOrDefault(c => c.Uid == action.CardUid);
                    var victim = draft.Players.FirstOrDefault(p => p.Id == action.TargetId);
                    if (card == null || victim == null) return draft;
                    var def = CardCatalog.GetCardDef(card.DefId);
                    if (def.Category != CardCategory.Attaque || def.Hazard == null) return draft;
                    if (!Rules.CanPlayAttack(player, victim, def, draft.Target)) return draft;

                    RemoveFromHand(player, action.CardUid);
                    draft.Discard.Add(card);
                    if (def.Hazard == HazardType.Radar)
                    {
                        // RADAR is a speed cap, not a full stop — it must not block distance
                        // play outright (that's what the `hazard` field does elsewhere).
                        victim.Limited = true;
                    }
                    else
                    {
                        victim.Hazard = def.Hazard;
                    }
                    player.CardsPlayed += 1;
                    player.AttacksSent += 1;
                    victim.AttacksSurvived += 1;
                    Log(draft, player.Id, $"{player.Name} envoie {def.Title} à {victim.Name} !", LogKind.Attack);
                    PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Hazard, PlayerId = victim.Id, Hazard = def.Hazard });
                    EndTurnIfNeeded(draft, player);
                    return draft;
                }

                case GameActionType.PlayDefense:
                {
                    if (draft.Phase != GamePhase.Action) return draft;
                    var card = player.Hand.FirstOrDefault(c => c.Uid == action.CardUid);
                    if (card == null) return draft;
                    var def = CardCatalog.GetCardDef(card.DefId);
                    if (def.Category != CardCategory.Defense || def.Defense == null || def.Counters == null) return draft;

                    var reactive = Rules.CanPlayDefenseReactive(player, def);
                    var shield = !reactive && Rules.CanPlayDefenseShield(player, def);
                    if (!reactive && !shield) return draft;

                    RemoveFromHand(player, action.CardUid);
                    draft.Discard.Add(card);
                    player.CardsPlayed += 1;

                    if (reactive)
                    {
                        player.Hazard = null;
                        if (def.Counters == HazardType.Radar) player.Limited = false;
                        Log(draft, player.Id, $"{player.Name} répare : {def.Title}.", LogKind.Defense);
                        PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Shield, PlayerId = player.Id, Defense = def.Defense });
                        EndTurnIfNeeded(draft, player);
                    }
                    else
                    {
                        player.Shields.Add(def.Defense.Value);
                        player.ShieldsPlayed += 1;
                        player.ExtraTurn = true;
                        Log(draft, player.Id, $"{player.Name} s'équipe de {def.Title} — immunité et tour bonus !", LogKind.Defense);
                        PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Shield, PlayerId = player.Id, Defense = def.Defense });
                        EndTurnIfNeeded(draft, player);
                    }
                    return draft;
                }

                case GameActionType.PlaySpecial:
                {
                    if (draft.Phase != GamePhase.Action) return draft;
                    var card = player.Hand.FirstOrDefault(c => c.Uid == action.CardUid);
                    if (card == null) return draft;
                    var def = CardCatalog.GetCardDef(card.DefId);
                    if (def.Category != CardCategory.Special || def.Special == null) return draft;
                    if (!Rules.CanPlaySpecial(player, def, draft, action.TargetId)) return draft;

                    switch (def.Special)
                    {
                        case SpecialType.Turbo:
                        case SpecialType.Raccourci:
                        case SpecialType.DerniereLigneDroite:
                        {
                            RemoveFromHand(player, action.CardUid);
                            draft.Discard.Add(card);
                            var from = player.Distance;
                            player.Distance = Math.Min(draft.Target, player.Distance + (def.Value ?? 0));
                            player.CardsPlayed += 1;
                            Log(draft, player.Id, $"{player.Name} joue {def.Title} (+{def.Value} km) !", LogKind.Special);
                            PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Move, PlayerId = player.Id, From = from, To = player.Distance });
                            CheckVictory(draft, player);
                            EndTurnIfNeeded(draft, player);
                            return draft;
                        }
                        case SpecialType.Depassement:
                        {
                            var targetId = action.TargetId;
                            var victim = targetId != null ? draft.Players.FirstOrDefault(p => p.Id == targetId) : null;
                            if (victim == null || victim.Distance <= player.Distance) return draft;
                            RemoveFromHand(player, action.CardUid);
                            draft.Discard.Add(card);
                            var from = player.Distance;
                            player.Distance = Math.Min(draft.Target, victim.Distance + 10);
                            player.CardsPlayed += 1;
                            Log(draft, player.Id, $"{player.Name} double {victim.Name} avec DÉPASSEMENT !", LogKind.Special);
                            PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Move, PlayerId = player.Id, From = from, To = player.Distance });
                            CheckVictory(draft, player);
                            EndTurnIfNeeded(draft, player);
                            return draft;
                        }
                        case SpecialType.GpsStrategique:
                        {
                            RemoveFromHand(player, action.CardUid);
                            draft.Discard.Add(card);
                            player.CardsPlayed += 1;
                            if (player.Hazard != null || player.Limited)
                            {
                                var clearedHazard = player.Hazard ?? HazardType.Radar;
                                player.Hazard = null;
                                player.Limited = false;
                                Log(draft, player.Id, $"{player.Name} utilise le GPS STRATÉGIQUE pour repartir aussitôt.", LogKind.Special);
                                PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Shield, PlayerId = player.Id, Defense = CardCatalog.HazardToDefense[clearedHazard] });
                                EndTurnIfNeeded(draft, player);
                            }
                            else
                            {
                                player.ExtraTurn = true;
                                Log(draft, player.Id, $"{player.Name} garde l'avantage grâce au GPS STRATÉGIQUE.", LogKind.Special);
                                EndTurnIfNeeded(draft, player);
                            }
                            return draft;
                        }
                    }
                    return draft;
                }

                case GameActionType.DiscardCard:
                {
                    if (draft.Phase != GamePhase.Action) return draft;
                    var card = player.Hand.FirstOrDefault(c => c.Uid == action.CardUid);
                    if (card == null) return draft;
                    RemoveFromHand(player, action.CardUid);
                    draft.Discard.Add(card);
                    Log(draft, player.Id, $"{player.Name} défausse une carte.", LogKind.Info);
                    PushAnim(draft, new GameAnimationEvent { Kind = AnimationKind.Discard, PlayerId = player.Id, CardUid = card.Uid });
                    EndTurnIfNeeded(draft, player);
                    return draft;
                }

                case GameActionType.SkipTurn:
                {
                    // Online only: an absent player's turn is passed. If they had already
                    // drawn, the extra card goes to the discard so the hand stays at 7.
                    if (draft.Phase == GamePhase.Action && player.Hand.Count > Deck.HandLimit)
                    {
                        var last = player.Hand[player.Hand.Count - 1];
                        player.Hand.RemoveAt(player.Hand.Count - 1);
                        draft.Discard.Add(last);
                    }
                    player.ExtraTurn = false;
                    Log(draft, "system", $"{player.Name} est absent — son tour est passé.", LogKind.System);
                    AdvanceTurn(draft);
                    return draft;
                }

                case GameActionType.ClearAnimation:
                    if (draft.AnimationQueue.Count > 0) draft.AnimationQueue.RemoveAt(0);
                    return draft;

                default:
                    return draft;
            }
        }
    }
}
