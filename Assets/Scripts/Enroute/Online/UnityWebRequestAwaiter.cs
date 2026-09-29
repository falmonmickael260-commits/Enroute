using System;
using System.Runtime.CompilerServices;
using UnityEngine.Networking;

namespace Enroute.Online
{
    /// <summary>Lets `await someUnityWebRequestAsyncOperation;` work, so the Supabase
    /// calls below can be written as plain async/await instead of coroutines.</summary>
    public struct UnityWebRequestAwaiter : INotifyCompletion
    {
        private readonly UnityWebRequestAsyncOperation _asyncOp;
        public UnityWebRequestAwaiter(UnityWebRequestAsyncOperation asyncOp) => _asyncOp = asyncOp;

        public bool IsCompleted => _asyncOp.isDone;

        public void GetResult() { }

        public void OnCompleted(Action continuation) => _asyncOp.completed += _ => continuation();
    }

    public static class UnityWebRequestExtensions
    {
        public static UnityWebRequestAwaiter GetAwaiter(this UnityWebRequestAsyncOperation asyncOp) => new UnityWebRequestAwaiter(asyncOp);
    }
}
