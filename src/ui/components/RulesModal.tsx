import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Swords, 
  Layers, 
  Trophy, 
  AlertTriangle, 
  Shield, 
  Zap, 
  Info 
} from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'COUNTER' | 'COMBOS' | 'INSTANT' | 'SPECIAL';

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('COUNTER');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 select-none backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] sm:h-[620px] max-h-[90vh] bg-[#0e121c] border border-white/10 rounded-2xl shadow-2xl flex flex-col text-slate-200 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#121724] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1a2133] border border-white/10 text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Luật Chơi & Cẩm Nang Khắc Chế
              </h2>
              <p className="text-xs text-slate-400">
                Quy chuẩn so bài, bảng chặt Heo/Hàng và các luật thi đấu Tiến Lên Miền Nam
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#161c2b] hover:bg-[#20293e] text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION (Thanh Tab Tối Giản, Sang Trọng) */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#0b0e17] border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#121622] rounded-xl border border-white/5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('COUNTER')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'COUNTER'
                  ? 'bg-[#1e2638] text-[#f3e5ab] border border-[#d4af37]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Swords className="w-4 h-4 text-[#d4af37]" />
              <span>Bảng Khắc Chế & Đè Hàng</span>
            </button>

            <button
              onClick={() => setActiveTab('COMBOS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'COMBOS'
                  ? 'bg-[#1e2638] text-[#f3e5ab] border border-[#d4af37]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4 text-[#d4af37]" />
              <span>Các Bộ Bài & Thứ Tự</span>
            </button>

            <button
              onClick={() => setActiveTab('INSTANT')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'INSTANT'
                  ? 'bg-[#1e2638] text-[#f3e5ab] border border-[#d4af37]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#d4af37]" />
              <span>Tới Trắng Tức Thì</span>
            </button>

            <button
              onClick={() => setActiveTab('SPECIAL')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'SPECIAL'
                  ? 'bg-[#1e2638] text-[#f3e5ab] border border-[#d4af37]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[#d4af37]" />
              <span>Luật Cấm & Xử Phạt</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỪNG TAB (SCROLLABLE & CLEAN TYPOGRAPHY) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm custom-scrollbar bg-[#0e121c]">
          
          {/* =========================================================
              TAB 1: BẢNG KHẮC CHẾ & ĐÈ HÀNG (TRỌNG TÂM)
              ========================================================= */}
          {activeTab === 'COUNTER' && (
            <div className="space-y-4">
              {/* Thanh tóm tắt quy tắc cốt lõi */}
              <div className="bg-[#141926] border border-white/10 p-3.5 rounded-xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#d4af37] mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-xs leading-relaxed">
                  Trong Tiến Lên Miền Nam, các tổ hợp đặc biệt (3 Đôi Thông, Tứ Quý, 4 Đôi Thông) có khả năng đè Heo và chặn Hàng của đối phương. Nắm vững ma trận dưới đây giúp bạn ra bài đúng thời điểm và tối ưu lợi thế kinh tế.
                </p>
              </div>

              {/* MA TRẬN KHẮC CHẾ DẠNG THẺ TINH TẾ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* 1. LÁ HEO ĐƠN */}
                <div className="bg-[#131824] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">1 Lá Heo (2 bất kỳ)</span>
                        <span className="text-xs font-mono font-bold flex items-center gap-1">
                          <span className="text-slate-300">2♠</span>
                          <span className="text-slate-300">2♣</span>
                          <span className="text-red-400">2♦</span>
                          <span className="text-red-400">2♥</span>
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                        Lá Đơn
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Bộ có thể chặt / đè:</span>
                        <ul className="mt-1 space-y-1 text-slate-200">
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span>
                              <strong>Heo lớn hơn</strong>: <span className="font-mono font-bold text-red-400">2♥</span> &gt; <span className="font-mono font-bold text-red-400">2♦</span> &gt; <span className="font-mono font-bold text-slate-300">2♣</span> &gt; <span className="font-mono font-bold text-slate-300">2♠</span>
                            </span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>3 Đôi Thông</strong> <span className="text-slate-400 text-[11px]">(phải theo vòng)</span></span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>Tứ Quý</strong> <span className="text-slate-400 text-[11px]">(phải theo vòng)</span></span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>4 Đôi Thông</strong> <span className="text-amber-300 text-[11px]">(nhảy cóc tự do)</span></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                    Phạt khi bị chặt: <span className="text-slate-300 font-medium">Heo Đen (<span className="font-mono font-bold text-slate-300">2♠, 2♣</span>): 0.5x</span> cược, <span className="text-red-400 font-medium">Heo Đỏ (<span className="font-mono font-bold text-red-400">2♦, 2♥</span>): 1.0x</span> cược.
                  </div>
                </div>

                {/* 2. ĐÔI HEO */}
                <div className="bg-[#131824] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Đôi Heo (2 lá 2)</span>
                        <span className="text-xs font-mono font-bold flex items-center gap-1">
                          <span className="text-red-400">2♥</span>
                          <span className="text-red-400">2♦</span>
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                        Cực Đại Đôi
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Bộ có thể chặt / đè:</span>
                        <ul className="mt-1 space-y-1 text-slate-200">
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>Đôi Heo lớn hơn</strong> (so theo chất lá cao nhất)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>Tứ Quý</strong> <span className="text-slate-400 text-[11px]">(phải theo vòng)</span></span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="text-[#d4af37]">•</span>
                            <span><strong>4 Đôi Thông</strong> <span className="text-amber-300 text-[11px]">(nhảy cóc tự do)</span></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-amber-300/80">
                    ⚠️ <strong>Lưu ý</strong>: 3 Đôi Thông <strong>không</strong> thể chặt được Đôi Heo.
                  </div>
                </div>

                {/* 3. 3 ĐÔI THÔNG */}
                <div className="bg-[#131824] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">3 Đôi Thông</span>
                        <span className="text-[11px] text-slate-400">3 đôi liên tiếp</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                        Theo Vòng
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Chặt được:</span>
                        <p className="mt-0.5 text-slate-200">1 Heo bất kỳ, 3 Đôi Thông nhỏ hơn.</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Bị chặt bởi:</span>
                        <p className="mt-0.5 text-slate-200">3 Đôi Thông lớn hơn, Tứ Quý, 4 Đôi Thông.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                    Bắt buộc phải có mặt trong vòng đánh mới được ra bài.
                  </div>
                </div>

                {/* 4. TỨ QUÝ */}
                <div className="bg-[#131824] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Tứ Quý</span>
                        <span className="text-[11px] text-slate-400">4 lá cùng số</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                        Hàng Mạnh
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Chặt được:</span>
                        <p className="mt-0.5 text-slate-200">1 Heo, Đôi Heo, 3 Đôi Thông, Tứ Quý nhỏ hơn.</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Bị chặt bởi:</span>
                        <p className="mt-0.5 text-slate-200">Tứ Quý lớn hơn, 4 Đôi Thông.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                    Được dùng để đè Đôi Heo mà không cần đến 4 Đôi Thông.
                  </div>
                </div>

                {/* 5. 4 ĐÔI THÔNG (VUA CHẶT HÀNG) */}
                <div className="bg-[#131824] border border-[#d4af37]/30 rounded-xl p-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#d4af37]" />
                      <span className="font-bold text-[#f3e5ab] text-sm sm:text-base">
                        4 Đôi Thông — Quyền Năng Tối Thượng
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded bg-[#1e2638] border border-[#d4af37]/40 text-[#f3e5ab] font-bold">
                      Nhảy Cóc Tự Do
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Khắc chế được toàn bộ:</span>
                      <ul className="mt-1 space-y-0.5 text-slate-200 text-[11px]">
                        <li>
                          • 1 Heo (<span className="text-slate-300 font-medium">Heo đen <span className="font-mono">2♠ 2♣</span></span> &amp; <span className="text-red-400 font-medium">Heo đỏ <span className="font-mono">2♦ 2♥</span></span>)
                        </li>
                        <li>• Đôi Heo</li>
                        <li>• 3 Đôi Thông bất kỳ</li>
                        <li>• Tứ Quý bất kỳ</li>
                        <li>• 4 Đôi Thông nhỏ hơn</li>
                      </ul>
                    </div>

                    <div className="bg-[#0b0e17] p-3 rounded-lg border border-white/5 text-[11px] text-slate-300">
                      <div className="text-white font-semibold mb-1 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Đặc Quyền Bỏ Vòng:</span>
                      </div>
                      <p className="leading-relaxed text-slate-400">
                        Người giữ 4 Đôi Thông có thể ra bài chặt bất cứ lúc nào trong ván đấu, kể cả khi đã chọn bỏ lượt ở các vòng trước đó.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUY TẮC CHẶT CHỒNG */}
              <div className="bg-[#131824] border border-white/10 rounded-xl p-3.5 text-xs text-slate-300">
                <div className="font-semibold text-white mb-1">
                  Quy Tắc Chặt Chồng (Chặt Đè Tích Lũy)
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Khi người chơi A chặt Heo/Hàng, người chơi B tiếp tục chặt đè lên A bằng Hàng lớn hơn. Khi đó, toàn bộ số tiền phạt cộng dồn của tất cả các lần chặt trước sẽ do <strong>người bị chặt cuối cùng gánh chịu toàn bộ</strong> cho người chặt thành công sau cùng.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: CÁC BỘ BÀI & THỨ TỰ
              ========================================================= */}
          {activeTab === 'COMBOS' && (
            <div className="space-y-4">
              {/* Thang Độ Lớn */}
              <div className="bg-[#131824] border border-white/10 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-xs sm:text-sm">1. Thang Điểm &amp; Thứ Tự So Sánh</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-medium">Độ lớn Số (Rank):</span>
                    <span className="font-mono text-slate-200 bg-[#0b0e17] px-2.5 py-1 rounded border border-white/5 font-semibold">
                      3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; <span className="text-amber-300 font-bold">2 (Heo)</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-medium">Độ lớn Chất (Suit):</span>
                    <span className="bg-[#0b0e17] px-2.5 py-1 rounded border border-white/5 font-semibold flex items-center gap-1.5 font-mono">
                      <span className="text-slate-300 font-bold">Bích (♠)</span>
                      <span className="text-slate-500">&lt;</span>
                      <span className="text-slate-300 font-bold">Chuồn (♣)</span>
                      <span className="text-slate-500">&lt;</span>
                      <span className="text-red-400 font-bold">Rô (♦)</span>
                      <span className="text-slate-500">&lt;</span>
                      <span className="text-red-400 font-bold">Cơ (♥)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Quy tắc: So sánh giá trị số trước. Nếu bằng số thì so sánh chất của lá bài cao nhất trong tổ hợp. Lá <span className="font-mono font-bold text-red-400">2♥</span> (<span className="text-red-400 font-medium">Heo Cơ</span>) là lá bài đơn lớn nhất.
                  </p>
                </div>
              </div>

              {/* Bảng Các Tổ Hợp Cơ Bản */}
              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs sm:text-sm">2. Các Tổ Hợp Chuẩn</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5">
                    <div className="font-semibold text-white mb-1">Lá Rác (Single)</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      1 lá bài đơn lẻ. Đè bài bằng lá có số cao hơn, hoặc cùng số nhưng chất lớn hơn (VD: <span className="font-mono text-slate-300 font-bold">4♠</span> đè <span className="font-mono text-red-400 font-bold">3♥</span>, <span className="font-mono text-red-400 font-bold">3♥</span> đè <span className="font-mono text-red-400 font-bold">3♦</span>).
                    </div>
                  </div>

                  <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5">
                    <div className="font-semibold text-white mb-1">Đôi (Pair)</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      2 lá cùng số (VD: <span className="font-mono text-slate-300 font-bold">5♠</span> <span className="font-mono text-red-400 font-bold">5♥</span>). Đôi đè đôi: so giá trị số, hoặc chất của lá cao nhất trong đôi.
                    </div>
                  </div>

                  <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5">
                    <div className="font-semibold text-white mb-1">Sám Cô (Triple)</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      3 lá cùng số (VD: <span className="font-mono text-slate-300 font-bold">8♠</span> <span className="font-mono text-slate-300 font-bold">8♣</span> <span className="font-mono text-red-400 font-bold">8♦</span>). Sám đè sám: so giá trị số lớn hơn.
                    </div>
                  </div>

                  <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5">
                    <div className="font-semibold text-white mb-1">Sảnh (Straight)</div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      Dãy 3 đến 12 lá liên tiếp từ 3 đến A (VD: <span className="font-mono text-slate-300 font-bold">3♠</span> <span className="font-mono text-red-400 font-bold">4♦</span> <span className="font-mono text-red-400 font-bold">5♥</span>). So lá cao nhất của sảnh cùng độ dài.
                      <div className="text-slate-400 font-medium mt-1">⚠️ Sảnh không được chứa quân 2 (Heo).</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: TỚI TRẮNG TỨC THÌ
              ========================================================= */}
          {activeTab === 'INSTANT' && (
            <div className="space-y-3">
              <div className="bg-[#131824] border border-white/10 p-3 rounded-xl text-xs text-slate-300 leading-relaxed">
                Người chơi sở hữu một trong các bộ đặc biệt dưới đây sẽ được <strong>Tới Trắng Tức Thì</strong> ngay sau khi chia bài, thắng ván đấu mà không cần đánh bài.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">Sảnh Rồng (12 - 13 Lá)</div>
                  <div className="text-slate-400 text-[11px]">Dãy liên tiếp từ 3 đến Át hoặc 3 đến 2.</div>
                </div>

                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">Tứ Quý 2 (Tứ Quý Heo)</div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <span>Cầm trọn 4 lá 2:</span>
                    <span className="font-mono font-bold text-slate-300">2♠</span>
                    <span className="font-mono font-bold text-slate-300">2♣</span>
                    <span className="font-mono font-bold text-red-400">2♦</span>
                    <span className="font-mono font-bold text-red-400">2♥</span>
                  </div>
                </div>

                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">5 Đôi Thông</div>
                  <div className="text-slate-400 text-[11px]">5 đôi có giá trị số liên tiếp (VD: 3-3 đến 7-7).</div>
                </div>

                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">6 Đôi Bất Kỳ</div>
                  <div className="text-slate-400 text-[11px]">Tay bài có 6 đôi bất kỳ trong 13 lá.</div>
                </div>

                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">13 Lá Đồng Màu</div>
                  <div className="text-slate-400 text-[11px]">
                    Cả 13 lá cùng màu <span className="text-red-400 font-medium">Đỏ (<span className="font-mono font-bold">Cơ ♥, Rô ♦</span>)</span> hoặc cùng màu <span className="text-slate-300 font-medium">Đen (<span className="font-mono font-bold">Bích ♠, Chuồn ♣</span>)</span>.
                  </div>
                </div>

                <div className="bg-[#131824] p-3 rounded-xl border border-white/5">
                  <div className="font-semibold text-white mb-0.5">Tứ Quý 3 ở Ván Đầu Tiên</div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <span>Sở hữu 4 con 3 (</span>
                    <span className="font-mono font-bold text-slate-300">3♠</span>
                    <span className="font-mono font-bold text-slate-300">3♣</span>
                    <span className="font-mono font-bold text-red-400">3♦</span>
                    <span className="font-mono font-bold text-red-400">3♥</span>
                    <span>) ở ván mở màn.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 4: LUẬT CẤM & XỬ PHẠT
              ========================================================= */}
          {activeTab === 'SPECIAL' && (
            <div className="space-y-3">
              <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5 border-l-2 border-l-amber-500/70">
                <div className="font-semibold text-white text-xs sm:text-sm mb-1">
                  Cấm Về 2 Cuối Cùng &amp; Phạt Thối Heo
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Không được phép đánh quân 2 (Heo) hoặc bộ chứa Heo ở nước đi cuối cùng để về Nhất. Người chơi bị kẹt Heo khi người khác hết bài sẽ bị xử phạt Thối Heo/Hàng theo hệ số cược.
                </p>
              </div>

              <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5 border-l-2 border-l-amber-500/70">
                <div className="font-semibold text-white text-xs sm:text-sm mb-1">
                  Luật Chống Đền Bài Khi Báo 1 Lá
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Khi người chơi kế tiếp chỉ còn đúng 1 lá bài trên tay, người đi trước nếu đánh lá đơn bắt buộc phải đánh lá bài lớn nhất có thể để chặn đầu. Nếu cố tình thả bài nhỏ cho người sau về Nhất, người đi trước sẽ bị xử Đền Bài thay cho cả bàn.
                </p>
              </div>

              <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5 border-l-2 border-l-amber-500/70">
                <div className="font-semibold text-white text-xs sm:text-sm mb-1">
                  Phạt Cóng (Cháy Bài)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Người chơi không đánh được bất kỳ quân bài nào trong suốt ván đấu cho đến khi có người về Nhất sẽ bị xử Cóng và chịu phạt tối đa số lá quy định cùng toàn bộ Heo/Hàng trên tay.
                </p>
              </div>

              <div className="bg-[#131824] p-3.5 rounded-xl border border-white/5 border-l-2 border-l-emerald-500/70">
                <div className="font-semibold text-white text-xs sm:text-sm mb-1">
                  Thưởng Ăn 3 Bích Cuối Cùng (x2 Thưởng)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Từ ván thứ 2 trở đi, nếu người chơi về Nhất bằng lá <span className="font-mono font-bold text-slate-300">3 Bích (3♠)</span> ở nước đi dứt điểm, người đó nhận thưởng gấp đôi (2x) tiền thắng ván từ tất cả người thua.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#121724] border-t border-white/10 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1e2638] hover:bg-[#28334b] text-[#f3e5ab] hover:text-white border border-white/10 font-bold text-xs sm:text-sm tracking-wide shadow-sm cursor-pointer transition-all"
          >
            Đóng Cẩm Nang
          </button>
        </div>
      </div>
    </div>
  );
};
