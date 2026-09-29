using System.Threading.Tasks;

namespace Enroute.Online
{
    /// <summary>Ported from game/lib/online/actions.ts.</summary>
    public static class OnlineActions
    {
        /// <summary>Creates a room hosted by this device and returns its code.</summary>
        public static async Task<string> CreateOnlineRoom(string name, RoomSettings settings)
        {
            var session = OnlineSession.Get();
            var result = await SupabaseApi.CreateRoom(session.PlayerId, name, settings);
            OnlineSession.RememberName(name);
            OnlineSession.RememberSeat(result.Code, result.Secret);
            return result.Code;
        }

        /// <summary>Takes a seat in an existing room (no-op if this device already has one).</summary>
        public static async Task<string> JoinOnlineRoom(string code, string name)
        {
            var session = OnlineSession.Get();
            if (session.Rooms.ContainsKey(code)) return code;
            var result = await SupabaseApi.JoinRoom(code, session.PlayerId, name);
            OnlineSession.RememberName(name);
            OnlineSession.RememberSeat(result.Code, result.Secret);
            return result.Code;
        }

        /// <summary>Builds the Seat (playerId + secret) needed for every other room call, from
        /// this device's session plus the secret handed out when it joined `code`.</summary>
        public static Seat SeatFor(string code)
        {
            var session = OnlineSession.Get();
            if (!OnlineSession.TryGetSeat(code, out var secret)) return null;
            return new Seat { PlayerId = session.PlayerId, Secret = secret };
        }
    }
}
