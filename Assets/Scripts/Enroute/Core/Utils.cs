using System;
using System.Collections.Generic;
using System.Text;

namespace Enroute.Core
{
    /// <summary>Ported from game/utils/array.ts.</summary>
    public static class Utils
    {
        private static readonly Random Rng = new Random();
        private const string Alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

        /// <summary>Short random id, mirroring the web client's `uid(prefix)` helper.</summary>
        public static string Uid(string prefix = "")
        {
            var sb = new StringBuilder(prefix);
            for (var i = 0; i < 8; i++)
                sb.Append(Alphabet[Rng.Next(Alphabet.Length)]);
            return sb.ToString();
        }

        /// <summary>Fisher-Yates shuffle, in place, returns the same list for chaining.</summary>
        public static List<T> Shuffle<T>(List<T> list)
        {
            for (var i = list.Count - 1; i > 0; i--)
            {
                var j = Rng.Next(i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
            return list;
        }
    }
}
