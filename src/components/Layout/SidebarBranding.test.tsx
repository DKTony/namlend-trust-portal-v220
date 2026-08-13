import type { BrandingConfig, BrandingContextType } from '@/types/branding';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GroupedSidebar } from './GroupedSidebar';
import { ThemedSidebar } from './ThemedSidebar';

const mocks = vi.hoisted(() => ({
  useBrandingSafe: vi.fn(),
  useTheme: vi.fn(),
}));

vi.mock('@/context/BrandingContext', () => ({
  useBrandingSafe: mocks.useBrandingSafe,
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: mocks.useTheme,
}));

const brandingConfig: BrandingConfig = {
  general: {
    company_name: 'OG Financial Services',
    company_tagline: 'Finance that moves you forward',
    support_email: 'finance@example.test',
    support_phone: '+264 00 000 0000',
  },
  colors: {
    primary_color: '#3F713E',
    secondary_color: '#7CA05C',
    accent_color: '#274F35',
    use_custom_colors: true,
  },
  assets: {
    logo_url: '/og-financial-logo-v2.svg',
    favicon_url: '/og-financial-favicon-v2.svg',
    logo_width: 220,
    logo_height: 72,
    show_company_name_with_logo: false,
  },
  meta: {
    page_title_template: '{company_name} - {page_name}',
    meta_description: 'OG Financial Services',
    og_image_url: '/og-financial-social-v2.png',
  },
};

function useBranding(config: BrandingConfig): BrandingContextType {
  return {
    config,
    loading: false,
    error: null,
    refreshBranding: vi.fn(),
    updateBrandingLocally: vi.fn(),
  };
}

function renderThemedSidebar(displayMode: 'rail' | 'sidebar' = 'sidebar') {
  return render(
    <ThemedSidebar currentPage="dashboard" onNavigate={vi.fn()} displayMode={displayMode} />
  );
}

function renderGroupedSidebar(displayMode: 'rail' | 'sidebar' = 'sidebar') {
  return render(
    <MemoryRouter initialEntries={['/admin/overview']}>
      <GroupedSidebar groups={[]} displayMode={displayMode} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mocks.useBrandingSafe.mockReturnValue(useBranding(brandingConfig));
  mocks.useTheme.mockReturnValue({
    styles: {
      accentClass: 'bg-primary',
      cardClass: 'bg-card',
      textClass: 'text-foreground',
      variant: 'neo',
    },
    isDark: false,
  });
});

describe('ThemedSidebar branding', () => {
  test('renders the full logo in the sidebar and the favicon in the compact rail', () => {
    const { rerender } = renderThemedSidebar();

    expect(screen.getByTestId('sidebar-brand-logo')).toHaveAttribute(
      'src',
      '/og-financial-logo-v2.svg'
    );
    expect(screen.getByTestId('sidebar-brand-logo')).toHaveStyle({
      width: '180px',
      height: '56px',
    });

    rerender(<ThemedSidebar currentPage="dashboard" onNavigate={vi.fn()} displayMode="rail" />);

    expect(screen.getByTestId('sidebar-brand-logo')).toHaveAttribute(
      'src',
      '/og-financial-favicon-v2.svg'
    );
    expect(screen.getByTestId('sidebar-brand-logo')).toHaveStyle({
      width: '40px',
      height: '40px',
    });
  });

  test('replaces a failed image with the local mark and company name', () => {
    renderThemedSidebar();

    fireEvent.error(screen.getByTestId('sidebar-brand-logo'));

    expect(screen.queryByTestId('sidebar-brand-logo')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-brand-fallback')).toHaveAccessibleName(
      'OG Financial Services fallback mark'
    );
    expect(screen.getByText('OG Financial Services')).toBeInTheDocument();
  });

  test('tries a new configured URL after a previous asset failed', () => {
    const { rerender } = renderThemedSidebar();
    fireEvent.error(screen.getByTestId('sidebar-brand-logo'));

    mocks.useBrandingSafe.mockReturnValue(
      useBranding({
        ...brandingConfig,
        assets: { ...brandingConfig.assets, logo_url: '/og-financial-logo-v3.svg' },
      })
    );
    rerender(<ThemedSidebar currentPage="dashboard" onNavigate={vi.fn()} displayMode="sidebar" />);

    expect(screen.getByTestId('sidebar-brand-logo')).toHaveAttribute(
      'src',
      '/og-financial-logo-v3.svg'
    );
    expect(screen.queryByTestId('sidebar-brand-fallback')).not.toBeInTheDocument();
  });
});

describe('GroupedSidebar branding', () => {
  test('renders the full configured logo at its intended sidebar size', () => {
    renderGroupedSidebar();

    expect(screen.getByTestId('sidebar-brand-logo')).toHaveAttribute(
      'src',
      '/og-financial-logo-v2.svg'
    );
    expect(screen.getByTestId('sidebar-brand-logo')).toHaveStyle({
      width: '180px',
      height: '56px',
    });
  });

  test('uses the favicon for a compact rail', () => {
    renderGroupedSidebar('rail');

    expect(screen.getByTestId('sidebar-brand-logo')).toHaveAttribute(
      'src',
      '/og-financial-favicon-v2.svg'
    );
  });

  test('replaces a failed image with the local mark and company name', () => {
    renderGroupedSidebar();

    fireEvent.error(screen.getByTestId('sidebar-brand-logo'));

    expect(screen.queryByTestId('sidebar-brand-logo')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-brand-fallback')).toHaveAccessibleName(
      'OG Financial Services fallback mark'
    );
    expect(screen.getByText('OG Financial Services')).toBeInTheDocument();
  });
});
