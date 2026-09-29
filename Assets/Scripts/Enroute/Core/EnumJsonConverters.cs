using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Enroute.Core
{
    /// <summary>
    /// Converts an enum to/from the lower-camel-case string used by the En Route web
    /// client's JSON schema (e.g. RoueSecours &lt;-&gt; "roueSecours"). Matching these
    /// strings exactly is required for interop with the shared Supabase room backend
    /// and the existing web client.
    /// </summary>
    public class LowerCamelEnumConverter<T> : JsonConverter where T : struct, Enum
    {
        public override bool CanConvert(Type objectType) => objectType == typeof(T) || objectType == typeof(T?);

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            if (value == null) { writer.WriteNull(); return; }
            writer.WriteValue(ToLowerCamel(value.ToString()));
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            if (reader.TokenType == JsonToken.Null) return null;
            var raw = reader.Value?.ToString() ?? string.Empty;
            foreach (var name in Enum.GetNames(typeof(T)))
            {
                if (string.Equals(ToLowerCamel(name), raw, StringComparison.Ordinal))
                    return Enum.Parse(typeof(T), name);
            }
            throw new JsonSerializationException($"Unknown {typeof(T).Name} value: '{raw}'");
        }

        private static string ToLowerCamel(string name)
        {
            if (string.IsNullOrEmpty(name)) return name;
            return char.ToLowerInvariant(name[0]) + name.Substring(1);
        }
    }

    /// <summary>
    /// GamePhase serializes as a single fused lowercase word ("draw" / "action" /
    /// "gameover") — "gameover" is not lower-camel-case, so it needs its own map.
    /// </summary>
    public class GamePhaseJsonConverter : JsonConverter
    {
        private static readonly Dictionary<GamePhase, string> ToStr = new Dictionary<GamePhase, string>
        {
            { GamePhase.Draw, "draw" },
            { GamePhase.Action, "action" },
            { GamePhase.GameOver, "gameover" },
        };

        public override bool CanConvert(Type objectType) => objectType == typeof(GamePhase) || objectType == typeof(GamePhase?);

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            if (value == null) { writer.WriteNull(); return; }
            writer.WriteValue(ToStr[(GamePhase)value]);
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            if (reader.TokenType == JsonToken.Null) return null;
            var raw = reader.Value?.ToString();
            foreach (var kv in ToStr)
                if (kv.Value == raw) return kv.Key;
            throw new JsonSerializationException($"Unknown GamePhase value: '{raw}'");
        }
    }
}
