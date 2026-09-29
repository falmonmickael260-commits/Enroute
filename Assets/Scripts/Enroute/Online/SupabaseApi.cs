using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Enroute.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace Enroute.Online
{
    public enum OnlineErrorKind
    {
        /// <summary>This device is not (or no longer) a member of the room.</summary>
        Denied,
        Rejected,
        Network,
    }

    public class OnlineError : Exception
    {
        public readonly OnlineErrorKind Kind;
        public OnlineError(string message, OnlineErrorKind kind) : base(message) => Kind = kind;
    }

    public class RoomSettings
    {
        public AmbianceId Ambiance;
        public int Target;
    }

    public class RoomSnapshot
    {
        public string Code;
        public string Status; // "lobby" | "playing" | "finished"
        public string HostId;
        public RoomSettings Settings;
        public List<RoomPlayer> Players;
        public List<string> Online;
        public int Version;
        public string LastActor;
        /// <summary>Only sent when the version differs from the one the client already has.</summary>
        public GameState State;
        public List<GameAnimationEvent> Events;
    }

    public class RoomPreviewPlayer
    {
        public string Name;
        public PlayerColor Color;
    }

    public class RoomPreview
    {
        public string Code;
        public string Status;
        public RoomSettings Settings;
        public List<RoomPreviewPlayer> Players;
    }

    public class Seat
    {
        public string PlayerId;
        public string Secret;
    }

    /// <summary>Raw {code, secret} pair returned by create_room / join_room.</summary>
    public class RoomJoinResult
    {
        public string Code;
        public string Secret;
    }

    /// <summary>
    /// Ported from game/lib/online/api.ts + client.ts. Talks to the exact same Supabase
    /// project and RPC functions as the En Route web client (same room codes, same
    /// `rooms`/`room_members` tables) so a Unity player and a web player can join the
    /// same lobby by exchanging an ENR-XXXX code.
    /// </summary>
    public static class SupabaseApi
    {
        // The publishable key is meant to ship in client code: the database only
        // exposes the game's RPC functions, which check each player's secret.
        private const string SupabaseUrl = "https://wcdoavbmexzgjhmmrsvj.supabase.co";
        private const string SupabaseKey = "sb_publishable_4b4VyMLTkya-ym4rUy-LWQ_aX3udzhP";

        private static readonly Regex CodePattern = new Regex(@"^ENR-[A-Z0-9]{4}$");

        public static bool IsValidCode(string code) => code != null && CodePattern.IsMatch(code);

        public static string NormalizeCode(string raw)
        {
            var compact = Regex.Replace((raw ?? "").Trim().ToUpperInvariant(), "[^A-Z0-9]", "");
            var suffix = compact.StartsWith("ENR") ? compact.Substring(3) : compact;
            if (suffix.Length > 4) suffix = suffix.Substring(0, 4);
            return $"ENR-{suffix}";
        }

        private static readonly HashSet<string> KnownRejectedCodes = new HashSet<string> { "22023", "P0002", "55000", "23505", "54000" };

        private static async Task<T> Call<T>(string fn, Dictionary<string, object> args)
        {
            var url = $"{SupabaseUrl}/rest/v1/rpc/{fn}";
            var bodyJson = JsonConvert.SerializeObject(args, JsonSettings.Default);
            var bodyBytes = Encoding.UTF8.GetBytes(bodyJson);

            using var request = new UnityWebRequest(url, "POST");
            request.uploadHandler = new UploadHandlerRaw(bodyBytes);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("apikey", SupabaseKey);
            request.SetRequestHeader("Authorization", $"Bearer {SupabaseKey}");

            try
            {
                await request.SendWebRequest();
            }
            catch (Exception)
            {
                throw new OnlineError("Connexion impossible. Vérifiez votre réseau.", OnlineErrorKind.Network);
            }

            if (request.result != UnityWebRequest.Result.Success)
            {
                string code = null, message = null;
                try
                {
                    var errBody = JObject.Parse(request.downloadHandler.text);
                    code = errBody.Value<string>("code");
                    message = errBody.Value<string>("message");
                }
                catch
                {
                    // not JSON — genuine network/transport failure
                }

                if (code == "42501") throw new OnlineError(message ?? "Accès refusé", OnlineErrorKind.Denied);
                if (code != null && KnownRejectedCodes.Contains(code)) throw new OnlineError(message ?? "Requête refusée", OnlineErrorKind.Rejected);
                throw new OnlineError("Connexion impossible. Vérifiez votre réseau.", OnlineErrorKind.Network);
            }

            var text = request.downloadHandler.text;
            if (string.IsNullOrEmpty(text) || text == "null") return default;
            return JsonConvert.DeserializeObject<T>(text, JsonSettings.Default);
        }

        public static Task<RoomJoinResult> CreateRoom(string playerId, string name, RoomSettings settings) => Call<RoomJoinResult>("create_room", new Dictionary<string, object>
        {
            ["p_player_id"] = playerId,
            ["p_name"] = name,
            ["p_ambiance"] = JsonSettings.Serialize(settings.Ambiance).Trim('"'),
            ["p_target"] = settings.Target,
        });

        public static Task<RoomJoinResult> JoinRoom(string code, string playerId, string name) => Call<RoomJoinResult>("join_room", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = playerId,
            ["p_name"] = name,
        });

        public static Task<RoomPreview> RoomInfo(string code) => Call<RoomPreview>("room_info", new Dictionary<string, object>
        {
            ["p_code"] = code,
        });

        public static Task SetReady(string code, Seat seat, bool ready) => Call<object>("set_ready", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = seat.PlayerId,
            ["p_secret"] = seat.Secret,
            ["p_ready"] = ready,
        });

        public static Task LeaveRoom(string code, Seat seat) => Call<object>("leave_room", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = seat.PlayerId,
            ["p_secret"] = seat.Secret,
        });

        public static Task<int> StartGame(string code, Seat seat, GameState state) => Call<int>("start_game", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = seat.PlayerId,
            ["p_secret"] = seat.Secret,
            ["p_state"] = JObject.FromObject(state, JsonSerializer.Create(JsonSettings.Default)),
        });

        public class CommitResult
        {
            public bool Ok;
            public int Version;
        }

        public static Task<CommitResult> CommitState(string code, Seat seat, int expectedVersion, GameState state, List<GameAnimationEvent> events) => Call<CommitResult>("commit_state", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = seat.PlayerId,
            ["p_secret"] = seat.Secret,
            ["p_expected_version"] = expectedVersion,
            ["p_state"] = JObject.FromObject(state, JsonSerializer.Create(JsonSettings.Default)),
            ["p_events"] = JArray.FromObject(events, JsonSerializer.Create(JsonSettings.Default)),
        });

        public static Task<RoomSnapshot> RoomSync(string code, Seat seat, int knownVersion) => Call<RoomSnapshot>("room_sync", new Dictionary<string, object>
        {
            ["p_code"] = code,
            ["p_player_id"] = seat.PlayerId,
            ["p_secret"] = seat.Secret,
            ["p_known_version"] = knownVersion,
        });
    }
}
