import { describe, expect, it } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SplashScreen } from '../../src/ui/components/SplashScreen';

describe('SplashScreen Component & Version Update Tests', () => {
  it('1. Render SplashScreen mặc định hiển thị emblem và thanh tiến trình', () => {
    const html = renderToString(
      <SplashScreen isHydrated={true} />
    );

    expect(html).toContain('TIẾN LÊN MIỀN NAM');
    expect(html).toContain('%');
  });

  it('2. Render SplashScreen với message và subMessage tùy biến', () => {
    const html = renderToString(
      <SplashScreen
        isHydrated={true}
        message="ĐANG KIỂM TRA PHIÊN BẢN MỚI"
        subMessage="CHỜ TRONG GIÂY LÁT"
      />
    );

    expect(html).toContain('ĐANG KIỂM TRA PHIÊN BẢN MỚI');
    expect(html).toContain('CHỜ TRONG GIÂY LÁT');
  });

  it('3. Render SplashScreen hiển thị version theo build time dạng yyyymmdd', () => {
    const html = renderToString(
      <SplashScreen
        isHydrated={true}
        version="v20260925"
      />
    );

    expect(html).toContain('v20260925');
  });
});
