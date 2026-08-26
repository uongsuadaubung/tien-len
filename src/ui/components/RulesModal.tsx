import React, { useState } from 'react';
import { 
  BookOpen, 
  Swords, 
  Layers, 
  Trophy, 
  AlertTriangle, 
  Shield, 
  Zap, 
  Info 
} from 'lucide-react';
import { Modal, Tabs, Card, Badge, Button } from '../primitives';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'COUNTER' | 'COMBOS' | 'INSTANT' | 'SPECIAL';

const tabOptions = [
  { id: 'COUNTER' as TabType, label: 'Bảng Khắc Chế & Đè Hàng', icon: <Swords className="w-4 h-4" /> },
  { id: 'COMBOS' as TabType, label: 'Các Bộ Bài & Thứ Tự', icon: <Layers className="w-4 h-4" /> },
  { id: 'INSTANT' as TabType, label: 'Tới Trắng Tức Thì', icon: <Trophy className="w-4 h-4" /> },
  { id: 'SPECIAL' as TabType, label: 'Luật Cấm & Xử Phạt', icon: <AlertTriangle className="w-4 h-4" /> }
];

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('COUNTER');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Luật Chơi & Cẩm Nang Khắc Chế"
      subtitle="Quy chuẩn so bài, bảng chặt Heo/Hàng và các luật thi đấu Tiến Lên Miền Nam"
      icon={<BookOpen className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="4xl"
      height="h-[85vh] sm:h-[620px]"
      footer={
        <Button variant="gold" size="md" onClick={onClose}>
          Đã Hiểu &amp; Đóng
        </Button>
      }
    >
      {/* TABS NAVIGATION */}
      <Tabs
        options={tabOptions}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
        className="mb-4"
      />

      {/* TAB 1: BẢNG KHẮC CHẾ */}
      {activeTab === 'COUNTER' && (
        <div className="space-y-4">
          <Card variant="surface" className="p-3.5 flex items-start gap-3">
            <Shield className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
              Trong Tiến Lên Miền Nam, các tổ hợp đặc biệt (3 Đôi Thông, Tứ Quý, 4 Đôi Thông) có khả năng đè Heo và chặn Hàng của đối phương. Nắm vững ma trận dưới đây giúp bạn ra bài đúng thời điểm và tối ưu lợi thế kinh tế.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. LÁ HEO ĐƠN */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">1 Lá Heo (2 bất kỳ)</span>
                    <span className="text-xs font-mono font-bold flex items-center gap-1">
                      <span className="text-[#cbd5e1]">2♠</span>
                      <span className="text-[#cbd5e1]">2♣</span>
                      <span className="text-[#f87171]">2♦</span>
                      <span className="text-[#f87171]">2♥</span>
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">Lá Đơn</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Bộ có thể chặt / đè:</span>
                    <ul className="mt-1 space-y-1 text-[var(--text-secondary)]">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span>
                          <strong>Heo lớn hơn</strong>: <span className="font-mono font-bold text-[#f87171]">2♥</span> &gt; <span className="font-mono font-bold text-[#f87171]">2♦</span> &gt; <span className="font-mono font-bold text-[#cbd5e1]">2♣</span> &gt; <span className="font-mono font-bold text-[#cbd5e1]">2♠</span>
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>3 Đôi Thông</strong> <span className="text-[var(--text-muted)] text-[11px]">(phải theo vòng)</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>Tứ Quý</strong> <span className="text-[var(--text-muted)] text-[11px]">(phải theo vòng)</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>4 Đôi Thông</strong> <span className="text-[var(--color-gold)] text-[11px]">(nhảy cóc tự do)</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                Phạt khi bị chặt: <span className="text-[#cbd5e1] font-medium">Heo Đen (<span className="font-mono font-bold text-[#cbd5e1]">2♠, 2♣</span>): 0.5x</span> cược, <span className="text-[#f87171] font-medium">Heo Đỏ (<span className="font-mono font-bold text-[#f87171]">2♦, 2♥</span>): 1.0x</span> cược.
              </div>
            </Card>

            {/* 2. ĐÔI HEO */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">Đôi Heo (2 lá 2)</span>
                    <span className="text-xs font-mono font-bold flex items-center gap-1">
                      <span className="text-[#f87171]">2♥</span>
                      <span className="text-[#f87171]">2♦</span>
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">Cực Đại Đôi</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Bộ có thể chặt / đè:</span>
                    <ul className="mt-1 space-y-1 text-[var(--text-secondary)]">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>Đôi Heo lớn hơn</strong> (so theo chất lá cao nhất)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>Tứ Quý</strong> <span className="text-[var(--text-muted)] text-[11px]">(phải theo vòng)</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>4 Đôi Thông</strong> <span className="text-[var(--color-gold)] text-[11px]">(nhảy cóc tự do)</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--color-gold)]">
                ⚠️ <strong>Lưu ý</strong>: 3 Đôi Thông <strong>không</strong> thể chặt được Đôi Heo.
              </div>
            </Card>

            {/* 3. 3 ĐÔI THÔNG */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">3 Đôi Thông</span>
                    <span className="text-[11px] text-[var(--text-muted)]">3 đôi liên tiếp</span>
                  </div>
                  <Badge variant="neutral" size="sm">Theo Vòng</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Chặt được:</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">1 Heo bất kỳ, 3 Đôi Thông nhỏ hơn.</p>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Bị chặt bởi:</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">3 Đôi Thông lớn hơn, Tứ Quý, 4 Đôi Thông.</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                Bắt buộc phải có mặt trong vòng đánh mới được ra bài.
              </div>
            </Card>

            {/* 4. TỨ QUÝ */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">Tứ Quý</span>
                    <span className="text-[11px] text-[var(--text-muted)]">4 lá cùng số</span>
                  </div>
                  <Badge variant="neutral" size="sm">Hàng Mạnh</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Chặt được:</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">1 Heo, Đôi Heo, 3 Đôi Thông, Tứ Quý nhỏ hơn.</p>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Bị chặt bởi:</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">Tứ Quý lớn hơn, 4 Đôi Thông.</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                Được dùng để đè Đôi Heo mà không cần đến 4 Đôi Thông.
              </div>
            </Card>

            {/* 5. 4 ĐÔI THÔNG */}
            <Card variant="nested" className="p-4 md:col-span-2 border-[var(--color-gold-border)]">
              <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--color-gold)]" />
                  <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">
                    4 Đôi Thông — Quyền Năng Tối Thượng
                  </span>
                </div>
                <Badge variant="gold" size="sm">Nhảy Cóc Tự Do</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] font-medium">Khắc chế được toàn bộ:</span>
                  <ul className="mt-1 space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                    <li>
                      • 1 Heo (<span className="text-[#cbd5e1] font-medium">Heo đen <span className="font-mono">2♠ 2♣</span></span> &amp; <span className="text-[#f87171] font-medium">Heo đỏ <span className="font-mono">2♦ 2♥</span></span>)
                    </li>
                    <li>• Đôi Heo</li>
                    <li>• 3 Đôi Thông bất kỳ</li>
                    <li>• Tứ Quý bất kỳ</li>
                    <li>• 4 Đôi Thông nhỏ hơn</li>
                  </ul>
                </div>

                <div className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-container)] text-[11px] text-[var(--text-secondary)]">
                  <div className="text-[var(--text-primary)] font-semibold mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                    <span>Đặc Quyền Bỏ Vòng:</span>
                  </div>
                  <p className="leading-relaxed text-[var(--text-muted)]">
                    Người giữ 4 Đôi Thông có thể ra bài chặt bất cứ lúc nào trong ván đấu, kể cả khi đã chọn bỏ lượt ở các vòng trước đó.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* QUY TẮC CHẶT CHỒNG */}
          <Card variant="nested" className="p-3.5 text-xs text-[var(--text-secondary)]">
            <div className="font-semibold text-[var(--text-primary)] mb-1">
              Quy Tắc Chặt Chồng (Chặt Đè Tích Lũy)
            </div>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
              Khi người chơi A chặt Heo/Hàng, người chơi B tiếp tục chặt đè lên A bằng Hàng lớn hơn. Khi đó, toàn bộ số tiền phạt cộng dồn của tất cả các lần chặt trước sẽ do <strong>người bị chặt cuối cùng gánh chịu toàn bộ</strong> cho người chặt thành công sau cùng.
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: CÁC BỘ BÀI */}
      {activeTab === 'COMBOS' && (
        <div className="space-y-4">
          <Card variant="nested" className="p-4 space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">1. Thang Điểm &amp; Thứ Tự So Sánh</h3>
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--text-muted)] font-medium">Độ lớn Số (Rank):</span>
                <span className="font-mono text-[var(--text-primary)] bg-[var(--bg-input)] px-2.5 py-1 rounded border border-[var(--border-container)] font-semibold">
                  3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; <span className="text-[var(--color-gold)] font-bold">2 (Heo)</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--text-muted)] font-medium">Độ lớn Chất (Suit):</span>
                <span className="bg-[var(--bg-input)] px-2.5 py-1 rounded border border-[var(--border-container)] font-semibold flex items-center gap-1.5 font-mono">
                  <span className="text-[#cbd5e1] font-bold">Bích (♠)</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#cbd5e1] font-bold">Chuồn (♣)</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#f87171] font-bold">Rô (♦)</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#f87171] font-bold">Cơ (♥)</span>
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Quy tắc: So sánh giá trị số trước. Nếu bằng số thì so sánh chất của lá bài cao nhất trong tổ hợp. Lá <span className="font-mono font-bold text-[#f87171]">2♥</span> (<span className="text-[#f87171] font-medium">Heo Cơ</span>) là lá bài đơn lớn nhất.
              </p>
            </div>
          </Card>

          <div className="space-y-2">
            <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">2. Các Tổ Hợp Chuẩn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">Lá Rác (Single)</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  1 lá bài đơn lẻ. Đè bài bằng lá có số cao hơn, hoặc cùng số nhưng chất lớn hơn (VD: <span className="font-mono text-[#cbd5e1] font-bold">4♠</span> đè <span className="font-mono text-[#f87171] font-bold">3♥</span>).
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">Đôi (Pair)</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  2 lá cùng số (VD: <span className="font-mono text-[#cbd5e1] font-bold">5♠</span> <span className="font-mono text-[#f87171] font-bold">5♥</span>). Đôi đè đôi: so giá trị số, hoặc chất của lá cao nhất.
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">Sám Cô (Triple)</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  3 lá cùng số (VD: <span className="font-mono text-[#cbd5e1] font-bold">8♠</span> <span className="font-mono text-[#cbd5e1] font-bold">8♣</span> <span className="font-mono text-[#f87171] font-bold">8♦</span>). Sám đè sám: so giá trị số.
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">Sảnh (Straight)</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  Dãy 3 đến 12 lá liên tiếp từ 3 đến A (VD: <span className="font-mono text-[#cbd5e1] font-bold">3♠</span> <span className="font-mono text-[#f87171] font-bold">4♦</span> <span className="font-mono text-[#f87171] font-bold">5♥</span>). So lá cao nhất của sảnh cùng độ dài.
                  <div className="text-[var(--color-gold)] font-medium mt-1">⚠️ Sảnh không được chứa quân 2 (Heo).</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TỚI TRẮNG */}
      {activeTab === 'INSTANT' && (
        <div className="space-y-3">
          <Card variant="surface" className="p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            Người chơi sở hữu một trong các bộ đặc biệt dưới đây sẽ được <strong>Tới Trắng Tức Thì</strong> ngay sau khi chia bài, thắng ván đấu mà không cần đánh bài.
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">Sảnh Rồng (12 - 13 Lá)</div>
              <div className="text-[var(--text-muted)] text-[11px]">Dãy liên tiếp từ 3 đến Át hoặc 3 đến 2.</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">Tứ Quý 2 (Tứ Quý Heo)</div>
              <div className="text-[var(--text-muted)] text-[11px] flex items-center gap-1">
                <span>Cầm trọn 4 lá 2:</span>
                <span className="font-mono font-bold text-[#cbd5e1]">2♠</span>
                <span className="font-mono font-bold text-[#cbd5e1]">2♣</span>
                <span className="font-mono font-bold text-[#f87171]">2♦</span>
                <span className="font-mono font-bold text-[#f87171]">2♥</span>
              </div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">5 Đôi Thông</div>
              <div className="text-[var(--text-muted)] text-[11px]">5 đôi có giá trị số liên tiếp (VD: 3-3 đến 7-7).</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">6 Đôi Bất Kỳ</div>
              <div className="text-[var(--text-muted)] text-[11px]">Tay bài có 6 đôi bất kỳ trong 13 lá.</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">13 Lá Đồng Màu</div>
              <div className="text-[var(--text-muted)] text-[11px]">
                Cả 13 lá cùng màu <span className="text-[#f87171] font-medium">Đỏ (<span className="font-mono font-bold">Cơ ♥, Rô ♦</span>)</span> hoặc cùng màu <span className="text-[#cbd5e1] font-medium">Đen (<span className="font-mono font-bold">Bích ♠, Chuồn ♣</span>)</span>.
              </div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">Tứ Quý 3 ở Ván Đầu Tiên</div>
              <div className="text-[var(--text-muted)] text-[11px] flex items-center gap-1">
                <span>Sở hữu 4 con 3 (</span>
                <span className="font-mono font-bold text-[#cbd5e1]">3♠</span>
                <span className="font-mono font-bold text-[#cbd5e1]">3♣</span>
                <span className="font-mono font-bold text-[#f87171]">3♦</span>
                <span className="font-mono font-bold text-[#f87171]">3♥</span>
                <span>) ở ván mở màn.</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: LUẬT CẤM */}
      {activeTab === 'SPECIAL' && (
        <div className="space-y-3">
          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              Cấm Về 2 Cuối Cùng &amp; Phạt Thối Heo
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Không được phép đánh quân 2 (Heo) hoặc bộ chứa Heo ở nước đi cuối cùng để về Nhất. Người chơi bị kẹt Heo khi người khác hết bài sẽ bị xử phạt Thối Heo/Hàng theo hệ số cược.
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              Luật Chống Đền Bài Khi Báo 1 Lá
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Khi người chơi kế tiếp chỉ còn đúng 1 lá bài trên tay, người đi trước nếu đánh lá đơn bắt buộc phải đánh lá bài lớn nhất có thể để chặn đầu. Nếu cố tình thả bài nhỏ cho người sau về Nhất, người đi trước sẽ bị xử Đền Bài thay cho cả bàn.
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              Phạt Cóng (Cháy Bài)
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Người chơi không đánh được bất kỳ quân bài nào trong suốt ván đấu cho đến khi có người về Nhất sẽ bị xử Cóng và chịu phạt tối đa số lá quy định cùng toàn bộ Heo/Hàng trên tay.
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[#4ade80]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              Thưởng Ăn 3 Bích Cuối Cùng (x2 Thưởng)
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Từ ván thứ 2 trở đi, nếu người chơi về Nhất bằng lá <span className="font-mono font-bold text-[#cbd5e1]">3 Bích (3♠)</span> ở nước đi dứt điểm, người đó nhận thưởng gấp đôi (2x) tiền thắng ván từ tất cả người thua.
            </p>
          </Card>
        </div>
      )}
    </Modal>
  );
};
