function ConnectionStatus({ state }) {
  if (state === 'connected') {
    return null;
  }

  return (
    <div className="fixed top-3 right-3 z-[70] rounded-full border border-amber-500/50 bg-slate-950/90 px-4 py-2 text-xs font-bold text-amber-300 shadow-lg backdrop-blur">
      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
      {state === 'connecting' ? 'Đang kết nối server...' : 'Mất kết nối · đang thử lại'}
    </div>
  );
}

export default ConnectionStatus;
