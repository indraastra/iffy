/**
 * Default theme configuration for Iffy Engine
 * This provides fallback colors when stories don't define custom themes
 */

export interface ThemeConfig {
  ui: {
    colors: {
      primary: string;
      background: string;
      text: string;
    };
  };
  alerts: {
    discovery: {
      text: string;
      background: string;
      opacity: number;
    };
    warning: {
      text: string;
      background: string;
      opacity: number;
    };
    danger: {
      text: string;
      background: string;
      opacity: number;
    };
  };
  items: {
    color: string;
    characterColor: string;
  };
}

export const DEFAULT_THEME: ThemeConfig = {
  ui: {
    colors: {
      primary: '#1a1a2e',
      background: '#0f0f23', 
      text: '#eee'
    }
  },
  alerts: {
    discovery: {
      text: '#90EE90',      // Light green - readable on dark backgrounds
      background: '#28a745', // Dark green for background/border
      opacity: 0.15
    },
    warning: {
      text: '#FFE082',      // Light amber - readable on dark backgrounds
      background: '#ffc107', // Amber for background/border
      opacity: 0.15
    },
    danger: {
      text: '#FFAB91',      // Light coral - readable on dark backgrounds
      background: '#dc3545', // Red for background/border
      opacity: 0.15
    }
  },
  items: {
    color: '#ffd700',       // Gold for item links
    characterColor: '#64B5F6' // Blue for character links
  }
};