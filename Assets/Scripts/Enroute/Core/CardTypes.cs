namespace Enroute.Core
{
    public enum CardCategory { Distance, Attaque, Defense, Special }

    public enum HazardType { Collision, Crevaison, Panne, Radar, Barrage }

    public enum DefenseType { Reparation, RoueSecours, PleinEssence, Gps, PassageLibre }

    public enum SpecialType { Turbo, Raccourci, Depassement, GpsStrategique, DerniereLigneDroite }

    public enum PlayerColor { Crimson, Azure, Amber, Emerald }

    public enum GamePhase { Draw, Action, GameOver }

    public enum AmbianceId { Jour, Crepuscule, Nuit }

    public enum LogKind { Info, Attack, Defense, Special, Distance, System, Victory }

    public enum AnimationKind { Draw, Discard, Move, Hazard, Shield, TurnChange, Victory }
}
