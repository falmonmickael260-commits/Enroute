using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace Enroute.Core
{
    /// <summary>
    /// Shared JSON contract for everything that crosses the wire to the Supabase
    /// room backend (GameState, GameAnimationEvent, ...). CamelCase property names plus
    /// the enum converters reproduce byte-for-byte the shape the web client
    /// (game/types/game.ts) already reads and writes, so both clients can share the
    /// same `rooms.state` blob.
    /// </summary>
    public static class JsonSettings
    {
        public static readonly JsonSerializerSettings Default = new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver(),
            NullValueHandling = NullValueHandling.Include,
            Converters =
            {
                new LowerCamelEnumConverter<CardCategory>(),
                new LowerCamelEnumConverter<HazardType>(),
                new LowerCamelEnumConverter<DefenseType>(),
                new LowerCamelEnumConverter<SpecialType>(),
                new LowerCamelEnumConverter<PlayerColor>(),
                new LowerCamelEnumConverter<AmbianceId>(),
                new LowerCamelEnumConverter<LogKind>(),
                new LowerCamelEnumConverter<AnimationKind>(),
                new GamePhaseJsonConverter(),
            },
        };

        public static string Serialize(object value) => JsonConvert.SerializeObject(value, Default);

        public static T Deserialize<T>(string json) => JsonConvert.DeserializeObject<T>(json, Default);

        public static T Clone<T>(T value) => Deserialize<T>(Serialize(value));
    }
}
