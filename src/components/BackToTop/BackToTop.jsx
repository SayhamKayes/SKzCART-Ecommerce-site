import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

export const BackToTop = () => {
  const { isEnglish } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const wTheme = themeConfig?.themesColors?.widgets || {};
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Check if products grid or next section after hero is reached
      const nextSectionEl = document.getElementById("products-grid");
      if (nextSectionEl) {
        const rect = nextSectionEl.getBoundingClientRect();
        // Visible when scrolled down past the hero section into the next section
        setIsVisible(rect.top <= window.innerHeight * 0.75);
      } else {
        // Fallback for pages without products-grid (e.g. tracking, landing): show when scrolled > 350px
        setIsVisible(window.scrollY > 350);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div
      className={`relative group flex items-center justify-end select-none transition-all duration-300 ease-out transform ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-3 scale-75 pointer-events-none"
      }`}
    >
      {/* Tooltip on Desktop hover */}
      <div
        className={`hidden sm:flex absolute right-full mr-3 items-center pointer-events-none transition-all duration-200 transform ${
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        }`}
      >
        <div
          style={{
            backgroundColor: wTheme.backToTopTooltipBg || undefined,
            color: wTheme.backToTopTooltipText || undefined,
            borderColor: wTheme.backToTopBorderColor || undefined,
          }}
          className="bg-neutral-900/95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg border border-neutral-700/60 whitespace-nowrap"
        >
          <span>{"Back to top"}</span>
        </div>
      </div>

      {/* Floating Button */}
      <button
        type="button"
        onClick={scrollToTop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Back to top"
        style={{
          backgroundColor: wTheme.backToTopBg || undefined,
          borderColor: wTheme.backToTopBorderColor || undefined,
          color: wTheme.backToTopIconColor || undefined,
        }}
        className={`w-10.5 h-10.5 sm:w-11 sm:h-11 ${wTheme.backToTopShape || "rounded-full"} bg-neutral-900/90 hover:bg-neutral-950 text-white backdrop-blur-md border border-neutral-700/70 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-hidden`}
      >
        <ChevronUp
          style={{ color: wTheme.backToTopIconColor || undefined }}
          className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5 text-neutral-200 group-hover:text-white"
        />
      </button>
    </div>
  );
};

export default BackToTop;
