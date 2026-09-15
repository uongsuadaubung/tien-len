import { describe, expect, test } from 'bun:test';
import { 
  ECONOMY_CONSTANTS, 
  calculateMatchLoanSettlement
} from '../../src/engine/constants/economy';
import { PlayerProfileSchema, type ActiveLoan } from '../../src/engine/schemas/profile.schema';

describe('Loan System & Casino Credit Economy (Hệ Thống Vay Ngân Hàng & Tín Dụng Sòng Bạc)', () => {

  test('1. Cấu hình các gói vay (LOAN_PACKAGES) đầy đủ các tham số kinh tế', () => {
    expect(ECONOMY_CONSTANTS.LOAN_PACKAGES.length).toBe(4);
    expect(ECONOMY_CONSTANTS.MIN_PROTECTED_DEPOSIT).toBe(26_000);

    const [p1, p2, p3, p4] = ECONOMY_CONSTANTS.LOAN_PACKAGES;

    expect(p1.id).toBe('tiep_suc');
    expect(p1.amount).toBe(20_000);
    expect(p1.upfrontFeePercent).toBe(10);
    expect(p1.interestPerMatchPercent).toBe(2);
    expect(p1.graceMatches).toBe(5);
    expect(p1.winDeductionPercent).toBe(30);
    expect(p1.overdueDeductionPercent).toBe(60);

    expect(p2.id).toBe('vuc_day');
    expect(p2.amount).toBe(50_000);
    expect(p2.interestPerMatchPercent).toBe(3);
    expect(p2.graceMatches).toBe(7);
    expect(p2.winDeductionPercent).toBe(35);
    expect(p2.overdueDeductionPercent).toBe(65);

    expect(p3.id).toBe('dai_gia');
    expect(p3.amount).toBe(100_000);
    expect(p3.interestPerMatchPercent).toBe(4);
    expect(p3.graceMatches).toBe(10);

    expect(p4.id).toBe('tat_tay');
    expect(p4.amount).toBe(250_000);
    expect(p4.interestPerMatchPercent).toBe(5);
    expect(p4.graceMatches).toBe(12);
  });

  test('2. Không có nợ: calculateMatchLoanSettlement trả về 0 và null', () => {
    const res = calculateMatchLoanSettlement({
      currentCoins: 50_000,
      heldDeposit: 26_000,
      humanNetEarned: 20_000,
      currentLoans: 0,
      activeLoan: null
    });

    expect(res.nextLoans).toBe(0);
    expect(res.nextActiveLoan).toBeNull();
    expect(res.loanDeduction).toBe(0);
    expect(res.interestAdded).toBe(0);
    expect(res.isOverdue).toBe(false);
  });

  test('3. Mang nợ nhưng THUA ván: Nợ tăng thêm lãi suất theo ván, không bị trích nợ', () => {
    const activeLoan: ActiveLoan = {
      packageId: 'vuc_day',
      initialAmount: 50_000,
      matchesPlayed: 1,
      graceMatches: 7,
      interestPerMatchPercent: 3, // 3% của 50,000 = 1,500 Xu
      winDeductionPercent: 35,
      overdueDeductionPercent: 65,
      createdAt: Date.now()
    };

    const res = calculateMatchLoanSettlement({
      currentCoins: 40_000,
      heldDeposit: 0,
      humanNetEarned: -10_000, // Thua ván
      currentLoans: 50_000,
      activeLoan
    });

    expect(res.interestAdded).toBe(1_500);
    expect(res.nextLoans).toBe(51_500);
    expect(res.loanDeduction).toBe(0);
    expect(res.nextActiveLoan?.matchesPlayed).toBe(2);
    expect(res.isOverdue).toBe(false);
  });

  test('4. Mang nợ và THẮNG ván trong hạn: Trích nợ tự động theo tỷ lệ quy định', () => {
    const activeLoan: ActiveLoan = {
      packageId: 'vuc_day',
      initialAmount: 50_000,
      matchesPlayed: 2,
      graceMatches: 7,
      interestPerMatchPercent: 3, // 3% của 50,000 = 1,500 Xu -> Tổng nợ trước trích = 51,500 Xu
      winDeductionPercent: 35, // 35% của 20,000 Xu = 7,000 Xu
      overdueDeductionPercent: 65,
      createdAt: Date.now()
    };

    const res = calculateMatchLoanSettlement({
      currentCoins: 50_000,
      heldDeposit: 26_000,
      humanNetEarned: 20_000,
      currentLoans: 50_000,
      activeLoan
    });

    expect(res.interestAdded).toBe(1_500);
    expect(res.loanDeduction).toBe(7_000); // 35% của 20,000
    expect(res.nextLoans).toBe(51_500 - 7_000); // 44,500 Xu
    expect(res.nextActiveLoan?.matchesPlayed).toBe(3);
    expect(res.isOverdue).toBe(false);
  });

  test('5. SÀN BẢO HỘ VỐN (26,000 Xu): Không bao giờ trích nợ làm ví rớt dưới ngưỡng cọc an toàn', () => {
    const activeLoan: ActiveLoan = {
      packageId: 'vuc_day',
      initialAmount: 50_000,
      matchesPlayed: 3,
      graceMatches: 7,
      interestPerMatchPercent: 3,
      winDeductionPercent: 35, // Đáng lẽ trích 35% của 25,000 = 8,750 Xu
      overdueDeductionPercent: 65,
      createdAt: Date.now()
    };

    // Ví người chơi chỉ còn 5,000 Xu, không có cọc hoàn trả, thắng được 25,000 Xu -> Tổng tài sản sau ván = 30,000 Xu
    const res = calculateMatchLoanSettlement({
      currentCoins: 5_000,
      heldDeposit: 0,
      humanNetEarned: 25_000,
      currentLoans: 50_000,
      activeLoan
    });

    // Để bảo lưu sàn 26,000 Xu: Chỉ được trích tối đa 30,000 - 26,000 = 4,000 Xu (thay vì 8,750 Xu)
    expect(res.loanDeduction).toBe(4_000);

    // Tiền ví sau ván: 5,000 + 25,000 - 4,000 = đúng 26,000 Xu!
    const remainingCoins = 5_000 + 25_000 - res.loanDeduction;
    expect(remainingCoins).toBe(26_000);
  });

  test('6. NỢ XẤU QUÁ HẠN (matchesPlayed > graceMatches): Tăng tỷ lệ trích thu', () => {
    const activeLoan: ActiveLoan = {
      packageId: 'tiep_suc',
      initialAmount: 20_000,
      matchesPlayed: 5, // Đã đánh 5 ván, ván này là ván thứ 6 (> graceMatches 5)
      graceMatches: 5,
      interestPerMatchPercent: 2,
      winDeductionPercent: 30,
      overdueDeductionPercent: 60, // Tỷ lệ nợ xấu 60%
      createdAt: Date.now()
    };

    const res = calculateMatchLoanSettlement({
      currentCoins: 50_000,
      heldDeposit: 26_000,
      humanNetEarned: 20_000,
      currentLoans: 20_000,
      activeLoan
    });

    expect(res.isOverdue).toBe(true);
    // 60% của 20,000 = 12,000 Xu
    expect(res.loanDeduction).toBe(12_000);
  });

  test('7. TẤT TOÁN SẠCH NỢ: Khi tiền trích đủ bù nợ thì activeLoan trở về null', () => {
    const activeLoan: ActiveLoan = {
      packageId: 'tiep_suc',
      initialAmount: 5_000,
      matchesPlayed: 2,
      graceMatches: 5,
      interestPerMatchPercent: 2, // 2% của 5,000 = 100 Xu -> Tổng nợ = 5,100 Xu
      winDeductionPercent: 30,
      overdueDeductionPercent: 60,
      createdAt: Date.now()
    };

    // Thắng lớn 50,000 Xu, 30% = 15,000 Xu (vượt quá tổng nợ 5,100 Xu)
    const res = calculateMatchLoanSettlement({
      currentCoins: 50_000,
      heldDeposit: 26_000,
      humanNetEarned: 50_000,
      currentLoans: 5_000,
      activeLoan
    });

    // Chỉ trích đúng số nợ gốc + lãi (5,100 Xu), không trích lố
    expect(res.loanDeduction).toBe(5_100);
    expect(res.nextLoans).toBe(0);
    expect(res.nextActiveLoan).toBeNull();
  });

  test('8. PlayerProfileSchema hỗ trợ activeLoan và tương thích ngược', () => {
    // Profile cũ không có activeLoan -> Mặc định là null
    const profile = PlayerProfileSchema.parse({
      id: 'usr_test',
      name: 'Player 1',
      coins: 50_000
    });

    expect(profile.activeLoan).toBeNull();
    expect(profile.loans).toBe(0);

    // Profile có activeLoan hợp lệ
    const profileWithLoan = PlayerProfileSchema.parse({
      id: 'usr_test_loan',
      name: 'Player 2',
      coins: 80_000,
      loans: 50_000,
      activeLoan: {
        packageId: 'vuc_day',
        initialAmount: 50_000,
        matchesPlayed: 1,
        graceMatches: 7,
        interestPerMatchPercent: 3,
        winDeductionPercent: 35,
        overdueDeductionPercent: 65,
        createdAt: 1700000000000
      }
    });

    expect(profileWithLoan.activeLoan).not.toBeNull();
    expect(profileWithLoan.activeLoan?.matchesPlayed).toBe(1);
    expect(profileWithLoan.activeLoan?.packageId).toBe('vuc_day');
  });

});
