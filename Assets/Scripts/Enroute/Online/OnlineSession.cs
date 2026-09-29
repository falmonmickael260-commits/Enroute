using System;
using System.Collections.Generic;
using Enroute.Core;
using UnityEngine;

namespace Enroute.Online
{
    /// <summary>
    /// Ported from game/lib/online/session.ts. Who this device is online: a random
    /// player id and the pilot name, plus the secret handed out by the server for each
    /// room joined. Persisted in PlayerPrefs (the Unity equivalent of localStorage) so
    /// a relaunch or a lost connection puts the player straight back in their seat.
    /// </summary>
    [Serializable]
    public class RoomSeat
    {
        public string Secret;
        public long JoinedAt;
    }

    [Serializable]
    public class OnlineSessionData
    {
        public string PlayerId;
        public string Name = "";
        public Dictionary<string, RoomSeat> Rooms = new Dictionary<string, RoomSeat>();
    }

    public static class OnlineSession
    {
        private const string PrefsKey = "enroute.online.v1";
        private static OnlineSessionData _cache;

        public static OnlineSessionData Get()
        {
            if (_cache != null) return _cache;

            var stored = PlayerPrefs.GetString(PrefsKey, null);
            if (!string.IsNullOrEmpty(stored))
            {
                try
                {
                    _cache = JsonSettings.Deserialize<OnlineSessionData>(stored);
                }
                catch
                {
                    // corrupted or unavailable storage: start fresh
                }
            }
            _cache ??= new OnlineSessionData();
            if (string.IsNullOrEmpty(_cache.PlayerId) || _cache.PlayerId.Length < 8)
                _cache.PlayerId = Guid.NewGuid().ToString("N");
            Persist();
            return _cache;
        }

        private static void Persist()
        {
            PlayerPrefs.SetString(PrefsKey, JsonSettings.Serialize(_cache));
            PlayerPrefs.Save();
        }

        public static void RememberName(string name)
        {
            var session = Get();
            if (session.Name == name) return;
            session.Name = name;
            Persist();
        }

        /// <summary>Keep the list short: only the most recent rooms matter.</summary>
        public static void RememberSeat(string code, string secret)
        {
            var session = Get();
            session.Rooms[code] = new RoomSeat { Secret = secret, JoinedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };
            if (session.Rooms.Count > 12)
            {
                var oldest = "";
                var oldestAt = long.MaxValue;
                foreach (var kv in session.Rooms)
                {
                    if (kv.Value.JoinedAt < oldestAt) { oldestAt = kv.Value.JoinedAt; oldest = kv.Key; }
                }
                if (oldest != "") session.Rooms.Remove(oldest);
            }
            Persist();
        }

        public static void ForgetSeat(string code)
        {
            var session = Get();
            if (session.Rooms.Remove(code)) Persist();
        }

        public static bool TryGetSeat(string code, out string secret)
        {
            var session = Get();
            if (session.Rooms.TryGetValue(code, out var seat)) { secret = seat.Secret; return true; }
            secret = null;
            return false;
        }
    }
}
