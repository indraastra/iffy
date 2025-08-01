import { ref, computed, watch } from 'vue'
import type { GameTheme } from '@/types/theme'

// Built-in themes
const BUILT_IN_THEMES: Record<string, GameTheme> = {
  classic: {
    name: 'Classic Retro',
    id: 'classic',
    colors: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      accent: '#64b5f6',
      background: '#0f0f23',
      surface: '#16213e',
      text: {
        primary: '#eeeeff',
        secondary: '#a0a0cc',
        accent: '#64b5f6'
      },
      markup: {
        character: {
          player: '#64b5f6',
          npc: '#a0a0cc',
          hover: '#81c784'
        },
        item: {
          primary: '#ba68c8',
          interactive: '#9c27b0',
          important: '#7b1fa2',
          hover: '#ad85c6'
        },
        location: {
          primary: '#4db6ac',
          current: '#26a69a',
          accessible: '#00695c',
          hover: '#4dd0e1'
        },
        alerts: {
          warning: {
            bg: '#2e2a1a',
            border: '#ffa726',
            text: '#ffcc80'
          },
          discovery: {
            bg: '#1a2e1a',
            border: '#66bb6a',
            text: '#a5d6a7'
          },
          danger: {
            bg: '#2e1a1a',
            border: '#f44336',
            text: '#ffcdd2'
          }
        }
      }
    },
    typography: {
      fonts: {
        primary: '"JetBrains Mono", "Source Code Pro", "Courier New", monospace',
        secondary: '"JetBrains Mono", "Source Code Pro", "Courier New", monospace',
        monospace: '"JetBrains Mono", "Source Code Pro", "Courier New", monospace'
      },
      sizes: {
        small: '0.875rem',
        normal: '1rem',
        large: '1.125rem',
        heading: '1.375rem'
      },
      weights: {
        normal: '400',
        medium: '500',
        bold: '700'
      }
    },
    interface: {
      header: {
        background: '#2a2a4e',
        border: '2px solid #64b5f6',
        text: '#eeeeff',
        shadow: '0 2px 4px rgba(0, 0, 0, 0.4)'
      },
      panels: {
        background: '#16213e',
        border: '1px solid #404060',
        borderRadius: '4px',
        shadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
      },
      buttons: {
        background: '#3a3a6e',
        backgroundHover: '#4a4a7e',
        border: '1px solid #404060',
        borderRadius: '4px',
        text: '#eeeeff',
        textHover: '#ffffff'
      },
      inputs: {
        background: '#2a2a4e',
        border: '1px solid #404060',
        borderFocus: '1px solid #64b5f6',
        text: '#eeeeff',
        placeholder: '#a0a0cc'
      },
      scrollbars: {
        track: '#1a1a2e',
        thumb: '#404060',
        thumbHover: '#505080'
      }
    },
    effects: {
      transitions: {
        fast: '0.15s ease',
        normal: '0.3s ease',
        slow: '0.5s ease'
      },
      animations: {
        fadeIn: 'fadeIn 0.5s ease',
        slideIn: 'slideInUp 0.3s ease',
        pulse: 'pulse 2s infinite'
      },
      shadows: {
        subtle: '0 2px 4px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 8px rgba(0, 0, 0, 0.15)',
        strong: '0 8px 16px rgba(0, 0, 0, 0.25)'
      }
    }
  },
  
  gothic: {
    name: 'Gothic Elegance',
    id: 'gothic',
    colors: {
      primary: '#2a1f3d',
      secondary: '#4a3c5a',
      accent: '#d4af37',
      background: '#1c1a26',
      surface: '#252231',
      text: {
        primary: '#e8e6f3',
        secondary: '#b8b5c8',
        accent: '#d4af37'
      },
      markup: {
        character: {
          player: '#d4af37',
          npc: '#9b7ede',
          hover: '#e8c547'
        },
        item: {
          primary: '#a967c4',
          interactive: '#c785e0',
          important: '#8e4fa3',
          hover: '#b876d1'
        },
        location: {
          primary: '#6b9dc0',
          current: '#5a8aaa',
          accessible: '#7ba8c7',
          hover: '#8bb7d4'
        },
        alerts: {
          warning: {
            bg: '#3a2f1a',
            border: '#d4af37',
            text: '#f0e68c'
          },
          discovery: {
            bg: '#1f2a3a',
            border: '#6b9dc0',
            text: '#a8d4f0'
          },
          danger: {
            bg: '#3a1f2a',
            border: '#c97b7b',
            text: '#f0a8a8'
          }
        }
      }
    },
    typography: {
      fonts: {
        primary: '"Crimson Text", "EB Garamond", "Times New Roman", serif',
        secondary: '"Cinzel", "Crimson Text", Georgia, serif',
        monospace: '"JetBrains Mono", "Source Code Pro", "Courier New", monospace'
      },
      sizes: {
        small: '0.875rem',
        normal: '1rem',
        large: '1.25rem',
        heading: '1.5rem'
      },
      weights: {
        normal: '400',
        medium: '500',
        bold: '700'
      }
    },
    interface: {
      header: {
        background: '#1c1a26',
        border: '1px solid #4a3c5a',
        text: '#e8e6f3',
        shadow: '0 2px 12px rgba(212, 175, 55, 0.15)'
      },
      panels: {
        background: 'rgba(37, 34, 49, 0.95)',
        border: '1px solid #4a3c5a',
        borderRadius: '8px',
        shadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      },
      buttons: {
        background: '#2a1f3d',
        backgroundHover: '#3d2e5a',
        border: '1px solid #4a3c5a',
        borderRadius: '6px',
        text: '#e8e6f3',
        textHover: '#d4af37'
      },
      inputs: {
        background: '#1c1a26',
        border: '1px solid #4a3c5a',
        borderFocus: '1px solid #d4af37',
        text: '#e8e6f3',
        placeholder: '#8a87a0'
      },
      scrollbars: {
        track: '#252231',
        thumb: '#4a3c5a',
        thumbHover: '#5a4d6a'
      }
    },
    effects: {
      transitions: {
        fast: '0.15s ease',
        normal: '0.3s ease',
        slow: '0.5s ease'
      },
      animations: {
        fadeIn: 'fadeIn 0.5s ease',
        slideIn: 'slideInUp 0.3s ease',
        pulse: 'pulse 2s infinite'
      },
      shadows: {
        subtle: '0 2px 8px rgba(0, 0, 0, 0.2)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.3)',
        strong: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }
    }
  },
  
  modern: {
    name: 'Modern Clean',
    id: 'modern',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1e293b',
        secondary: '#64748b',
        accent: '#3b82f6'
      },
      markup: {
        character: {
          player: '#3b82f6',
          npc: '#64748b',
          hover: '#2563eb'
        },
        item: {
          primary: '#8b5cf6',
          interactive: '#7c3aed',
          important: '#6d28d9',
          hover: '#5b21b6'
        },
        location: {
          primary: '#059669',
          current: '#047857',
          accessible: '#065f46',
          hover: '#064e3b'
        },
        alerts: {
          warning: {
            bg: '#fef3c7',
            border: '#f59e0b',
            text: '#92400e'
          },
          discovery: {
            bg: '#dbeafe',
            border: '#3b82f6',
            text: '#1e40af'
          },
          danger: {
            bg: '#fee2e2',
            border: '#ef4444',
            text: '#991b1b'
          }
        }
      }
    },
    typography: {
      fonts: {
        primary: '"Inter", "Fira Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        secondary: '"Inter", "Fira Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        monospace: '"JetBrains Mono", "Source Code Pro", "Courier New", monospace'
      },
      sizes: {
        small: '0.875rem',
        normal: '1rem',
        large: '1.125rem',
        heading: '1.5rem'
      },
      weights: {
        normal: '400',
        medium: '500',
        bold: '600'
      }
    },
    interface: {
      header: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        text: '#1e293b',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      },
      panels: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        shadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      },
      buttons: {
        background: '#3b82f6',
        backgroundHover: '#2563eb',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        text: '#ffffff',
        textHover: '#ffffff'
      },
      inputs: {
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderFocus: '1px solid #3b82f6',
        text: '#1e293b',
        placeholder: '#9ca3af'
      },
      scrollbars: {
        track: '#f1f5f9',
        thumb: '#cbd5e1',
        thumbHover: '#94a3b8'
      }
    },
    effects: {
      transitions: {
        fast: '0.15s ease',
        normal: '0.25s ease',
        slow: '0.4s ease'
      },
      animations: {
        fadeIn: 'fadeIn 0.3s ease',
        slideIn: 'slideInUp 0.25s ease',
        pulse: 'pulse 2s infinite'
      },
      shadows: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
        strong: '0 10px 15px rgba(0, 0, 0, 0.1)'
      }
    }
  }
}

// Global theme state
const currentTheme = ref<GameTheme>(BUILT_IN_THEMES.classic)
const userOverrides = ref<Partial<GameTheme>>({})

export function useTheme() {
  const effectiveTheme = computed(() => {
    return mergeThemes(currentTheme.value, userOverrides.value)
  })

  // Apply theme changes to CSS variables
  watch(effectiveTheme, (theme) => {
    applyThemeToDOM(theme)
  }, { immediate: true })

  function setTheme(theme: GameTheme | string) {
    if (typeof theme === 'string') {
      const builtInTheme = BUILT_IN_THEMES[theme]
      if (!builtInTheme) {
        console.warn(`Theme "${theme}" not found, using classic`)
        currentTheme.value = BUILT_IN_THEMES.classic
      } else {
        currentTheme.value = builtInTheme
      }
    } else {
      currentTheme.value = theme
    }
  }

  function setUserOverride(path: string, value: any) {
    const override = { ...userOverrides.value }
    setNestedProperty(override, path, value)
    userOverrides.value = override
  }

  function resetUserOverrides() {
    userOverrides.value = {}
  }

  function getAvailableThemes() {
    return BUILT_IN_THEMES
  }

  return {
    currentTheme: effectiveTheme,
    setTheme,
    setUserOverride,
    resetUserOverrides,
    getAvailableThemes
  }
}

function mergeThemes(base: GameTheme, overrides: Partial<GameTheme>): GameTheme {
  return {
    ...base,
    ...overrides,
    colors: {
      ...base.colors,
      ...overrides.colors,
      text: {
        ...base.colors.text,
        ...overrides.colors?.text
      },
      markup: {
        ...base.colors.markup,
        ...overrides.colors?.markup,
        character: {
          ...base.colors.markup.character,
          ...overrides.colors?.markup?.character
        },
        item: {
          ...base.colors.markup.item,
          ...overrides.colors?.markup?.item
        },
        location: {
          ...base.colors.markup.location,
          ...overrides.colors?.markup?.location
        },
        alerts: {
          ...base.colors.markup.alerts,
          ...overrides.colors?.markup?.alerts
        }
      }
    },
    typography: {
      ...base.typography,
      ...overrides.typography
    },
    interface: {
      ...base.interface,
      ...overrides.interface
    },
    effects: {
      ...base.effects,
      ...overrides.effects
    }
  }
}

function applyThemeToDOM(theme: GameTheme) {
  const root = document.documentElement
  const cssVars = generateCSSVariables(theme)
  
  // Apply CSS custom properties
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
  
  // Add theme class to body
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .trim() + ` theme-${theme.id}`
}

function generateCSSVariables(theme: GameTheme): Record<string, string> {
  return {
    // Base colors
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-text-primary': theme.colors.text.primary,
    '--color-text-secondary': theme.colors.text.secondary,
    '--color-text-accent': theme.colors.text.accent,

    // Typography
    '--font-primary': theme.typography.fonts.primary,
    '--font-secondary': theme.typography.fonts.secondary,
    '--font-monospace': theme.typography.fonts.monospace,
    '--font-size-small': theme.typography.sizes.small,
    '--font-size-normal': theme.typography.sizes.normal,
    '--font-size-large': theme.typography.sizes.large,
    '--font-size-heading': theme.typography.sizes.heading,

    // Interface components (simplified names)
    '--header-bg': theme.interface.header.background,
    '--header-border': theme.interface.header.border,
    '--header-text': theme.interface.header.text,
    '--header-shadow': theme.interface.header.shadow,
    '--panel-bg': theme.interface.panels.background,
    '--panel-border': theme.interface.panels.border,
    '--button-bg': theme.interface.buttons.background,
    '--button-hover-bg': theme.interface.buttons.backgroundHover,
    '--button-text': theme.interface.buttons.text,
    '--input-bg': theme.interface.inputs.background,
    '--input-border': theme.interface.inputs.border,
    '--input-border-focus': theme.interface.inputs.borderFocus,
    '--scrollbar-track': theme.interface.scrollbars.track,
    '--scrollbar-thumb': theme.interface.scrollbars.thumb,
    '--scrollbar-thumb-hover': theme.interface.scrollbars.thumbHover,

    // Effects
    '--transition-fast': theme.effects.transitions.fast,
    '--transition-normal': theme.effects.transitions.normal,
    '--shadow-subtle': theme.effects.shadows.subtle,
    '--shadow-medium': theme.effects.shadows.medium,

    // Markup colors
    '--markup-character-player': theme.colors.markup.character.player,
    '--markup-character-npc': theme.colors.markup.character.npc,
    '--markup-character-hover': theme.colors.markup.character.hover,
    '--markup-item-primary': theme.colors.markup.item.primary,
    '--markup-item-hover': theme.colors.markup.item.hover,
    '--markup-location-primary': theme.colors.markup.location.primary,
    '--markup-location-hover': theme.colors.markup.location.hover,
    '--alert-warning-bg': theme.colors.markup.alerts.warning.bg,
    '--alert-warning-border': theme.colors.markup.alerts.warning.border,
    '--alert-warning-text': theme.colors.markup.alerts.warning.text,
    '--alert-discovery-bg': theme.colors.markup.alerts.discovery.bg,
    '--alert-discovery-border': theme.colors.markup.alerts.discovery.border,
    '--alert-discovery-text': theme.colors.markup.alerts.discovery.text,
    '--alert-danger-bg': theme.colors.markup.alerts.danger.bg,
    '--alert-danger-border': theme.colors.markup.alerts.danger.border,
    '--alert-danger-text': theme.colors.markup.alerts.danger.text
  }
}

function setNestedProperty(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}