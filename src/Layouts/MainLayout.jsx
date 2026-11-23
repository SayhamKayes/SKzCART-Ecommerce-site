import React from 'react';
import { Front_Header } from '../components/Header';
import { WhatsAppWidget } from '../components/WhatsApp';
import { BackToTop } from '../components/BackToTop';
import { useThemeConfig } from '../components/frontPanel/FrontPanelContext';
import { buildBgStyle } from '../utils/themeHelper';

export const MainLayout = ({
  children,
  cartItems,
  onOpenCart,
  isCartOpen = false,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  currentUser,
  onOpenAuthModal,
  onLogoutUser,
}) => {
  const { themeConfig } = useThemeConfig();
  const isFrontendPage = activeView !== 'admin' && activeView !== 'courier' && activeView !== 'front-panel';
  const themesColors = themeConfig?.themesColors || {};
  const globalT = themesColors.globalTheme || {};
  const widgets = themesColors.widgets || {};

  const frontendBgStyle = isFrontendPage
    ? {
        ...buildBgStyle(
          {
            bgType: globalT.pageBgType || 'solid',
            solidBg: globalT.pageBgColor || '#f5f5f5',
            gradientFrom: globalT.pageGradientFrom || '#f8fafc',
            gradientTo: globalT.pageGradientTo || '#f0fdf4',
            gradientDirection: globalT.gradientDirection || 'to bottom',
          },
          '#f5f5f5'
        ),
        color: globalT.bodyTextColor || undefined,
      }
    : undefined;

  return (
    <div
      style={frontendBgStyle}
      className={`min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900 selection:bg-emerald-500 selection:text-white print:min-h-0 print:bg-white print:block ${
        isFrontendPage ? 'amardokan-storefront-root' : ''
      }`}
    >
      {activeView !== 'admin' && activeView !== 'courier' && activeView !== 'landing' && activeView !== 'front-panel' && (
        <Front_Header
          cartItems={cartItems}
          onOpenCart={onOpenCart}
          activeView={activeView}
          setActiveView={setActiveView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          currentUser={currentUser}
          onOpenAuthModal={onOpenAuthModal}
          onLogoutUser={onLogoutUser}
        />
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* Floating Action Widgets for all Frontend Pages: WhatsApp on top, BackToTop below it */}
      {/* Automatically hidden when CartDrawer is open so it NEVER overlaps or blocks the cart drawer */}
      {isFrontendPage && !isCartOpen && (
        <div className="fixed bottom-20 md:bottom-7 right-4 sm:right-6 z-30 flex flex-col items-center gap-2.5 sm:gap-3 pointer-events-none select-none transition-opacity duration-200">
          <div className="pointer-events-auto">
            <WhatsAppWidget />
          </div>
          {widgets.backToTopEnabled !== false && (
            <div className="pointer-events-auto">
              <BackToTop />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

