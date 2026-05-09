import  { useState } from 'react';
import backgroundImage from '../assets/Battle_Ship.png';
import shipImage from '../assets/Ship.png';

function Splash({ onStart }) {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-50 flex items-center justify-end flex-col pb-24"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="relative z-10 flex gap-6 flex-wrap justify-center">
        <button
          onClick={() => setShowTutorial(true)}
          className="bg-white hover:bg-gray-200 cursor-pointer text-black font-pixel text-xl px-10 py-4 border-[6px] border-black rounded-[40px] shadow-[0_10px_0_#000] active:shadow-[0_0_0_#000] active:translate-y-[10px] transition-all tracking-widest uppercase"
        >
          HOW TO PLAY
        </button>

        <button
          onClick={onStart}
          className="bg-[#FFD700] hover:bg-[#FFEA00] cursor-pointer text-black font-pixel text-xl sm:text-2xl px-12 py-5 border-[6px] border-black rounded-[40px] shadow-[0_10px_0_#000] active:shadow-[0_0_0_#000] active:translate-y-[10px] transition-all tracking-widest uppercase"
        >
          LET'S START
        </button>
      </div>

      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          
          {/* BOX NGOÀI CÙNG: Đảm bảo có p-6 md:p-8 để tạo viền xanh xung quanh */}
          <div className="bg-[#C6DEF1] w-full max-w-5xl rounded-xl border-[6px] border-black shadow-[0_15px_0_#000] p-6 md:p-8 relative flex flex-col md:flex-row gap-6 md:gap-8 font-pixel text-black max-h-[90vh] overflow-y-auto overflow-x-hidden">
            
            {/* NÚT X: Nằm sát góc trên cùng bên phải của box xanh ngoài cùng */}
            <button 
              onClick={() => setShowTutorial(false)}
              className="absolute top-3 right-3 md:top-4 md:right-4 w-10 h-10 bg-red-500 hover:bg-red-600 text-white border-[3px] border-black rounded-full flex items-center justify-center font-bold text-xl cursor-pointer active:translate-y-1 active:shadow-none shadow-[0_4px_0_#000] transition-all z-[110]"
            >
              X
            </button>

            {/* Cột trái */}
            <div className="flex-1 flex flex-col pt-4 md:pt-0 pr-0 md:pr-4">
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-[#5C6BC0] text-center md:text-left drop-shadow-[2px_2px_0_#000] text-stroke tracking-wider">
                WAR AT SEA
              </h2>
              
              <div className="text-xs sm:text-sm font-sans font-semibold space-y-1 mb-6 leading-snug">
                <p className="text-lg font-bold mb-2">INSTRUCTIONS:</p>
                <ul className="list-disc pl-5 space-y-1 md:space-y-2">
                  <li><strong>Place your ships</strong> on the grid horizontally or vertically.</li>
                  <li><strong>Take turns</strong> attacking your opponent's fleet by guessing coordinates.</li>
                  <li>Say <strong>"Hit!"</strong> if an enemy attacks a box with your ship.</li>
                  <li>Say <strong>"Miss!"</strong> if the box is empty.</li>
                  <li>Mark hits with an (X) and misses with an (O).</li>
                  <li>The first player to sink all the enemy ships <strong>wins</strong>.</li>
                </ul>
              </div>

          
              <div className="mt-auto flex flex-col items-center w-full">
                <h3 className="font-bold text-xl mb-3 tracking-widest text-center">MY FLEET</h3>
                <div className="grid grid-cols-10 grid-rows-10 border-[4px] border-black bg-white w-fit shadow-md">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 border border-blue-200"></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full md:w-2/5 bg-white border-[4px] border-black rounded-lg flex items-center justify-center min-h-[300px] md:min-h-[400px] overflow-hidden relative">
              <img 
                src={shipImage} 
                alt="Ship Types" 
                
                className="absolute inset-0 w-full h-full object-cover object-center scale-[1.1] sm:scale-[1.15]" 
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Splash;