import { useState } from 'react';

import backgroundImage from '../assets/Battle_Ship.webp';
import TutorialModal from './TutorialModal';

function Splash({ onStart }) {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col items-center justify-center gap-8 overflow-hidden bg-[#69bbee] pb-8 sm:pb-24 md:justify-end md:gap-0">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="relative z-0 h-auto w-full md:absolute md:inset-0 md:h-full md:object-cover"
      />

      <div className="relative z-10 flex flex-col justify-center gap-4 px-4 sm:flex-row sm:gap-6">
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className="cursor-pointer rounded-[40px] border-[5px] border-black bg-white px-8 py-4 font-sans text-sm font-black uppercase leading-none tracking-[0.08em] text-black shadow-[0_8px_0_#000] transition-all hover:bg-gray-200 active:translate-y-[8px] active:shadow-none sm:border-[6px] sm:px-10 sm:text-lg sm:shadow-[0_10px_0_#000]"
        >
          HƯỚNG DẪN
        </button>

        <button
          type="button"
          onClick={onStart}
          className="cursor-pointer rounded-[40px] border-[5px] border-black bg-[#FFD700] px-10 py-4 font-sans text-base font-black uppercase leading-none tracking-[0.08em] text-black shadow-[0_8px_0_#000] transition-all hover:bg-[#FFEA00] active:translate-y-[8px] active:shadow-none sm:border-[6px] sm:px-12 sm:py-5 sm:text-xl sm:shadow-[0_10px_0_#000]"
        >
          VÀO TRÒ CHƠI
        </button>
      </div>

      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}

export default Splash;
