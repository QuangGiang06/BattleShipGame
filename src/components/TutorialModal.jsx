import shipImage from '../assets/Ship-guide-cropped.png';

function TutorialModal({ open, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col gap-6 overflow-y-auto overflow-x-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.7)] sm:p-8 md:flex-row md:gap-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hướng dẫn"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-600 bg-slate-900 text-lg font-bold text-slate-300 transition hover:border-rose-400 hover:bg-rose-500/20 hover:text-white"
        >
          ×
        </button>

        <div className="flex flex-1 flex-col pt-6 md:pt-0">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
            Sổ tay chỉ huy
          </p>
          <h2
            id="tutorial-title"
            className="mb-5 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            Hướng dẫn tác chiến
          </h2>

          <ol className="space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">1</span>
              <span><strong className="text-white">Bố trí 5 tàu</strong> theo chiều ngang hoặc dọc trên hải đồ của bạn.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">2</span>
              <span>Hai người chơi <strong className="text-white">luân phiên chọn tọa độ</strong> trên vùng biển đối thủ để khai hỏa.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">3</span>
              <span><strong className="text-rose-300">Dấu X</strong> là bắn trúng; <strong className="text-sky-300">vòng tròn</strong> là bắn trượt.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">4</span>
              <span>Bắn trúng được tiếp tục khai hỏa. Bắn trượt sẽ <strong className="text-white">chuyển lượt cho đối thủ</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">5</span>
              <span>Người đầu tiên <strong className="text-emerald-300">đánh chìm toàn bộ hạm đội đối phương</strong> sẽ chiến thắng.</span>
            </li>
          </ol>

          <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
            Mẹo: phân tán tàu và tránh xếp chúng theo một đường dễ đoán.
          </div>
        </div>

        <div className="flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white p-2 md:w-[38%]">
          <img
            src={shipImage}
            alt="Năm loại tàu và kích thước tương ứng"
            className="h-auto max-h-[590px] w-full object-contain"
          />
        </div>
      </section>
    </div>
  );
}

export default TutorialModal;
