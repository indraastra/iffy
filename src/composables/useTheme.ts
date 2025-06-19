import { ref, computed, watch } from 'vue'
import type { GameTheme } from '@/types/theme'

// Built-in themes
const BUILT_IN_THEMES: Record<string, GameTheme> = {
  classic: {
    name: 'Classic',
    id: 'classic',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1e293b',
        secondary: '#64748b',
        accent: '#f59e0b'
      },
      markup: {
        character: {
          player: '#f59e0b',
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
            bg: '#d1fae5',
            border: '#10b981',
            text: '#065f46'
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
        primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        secondary: 'Georgia, "Times New Roman", serif',
        monospace: '"Courier New", monospace'
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
      panels: {
        background: 'rgba(248, 250, 252, 0.95)',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      },
      buttons: {
        background: '#2563eb',
        backgroundHover: '#1d4ed8',
        border: '1px solid #2563eb',
        borderRadius: '4px',
        text: '#ffffff',
        textHover: '#ffffff'
      },
      inputs: {
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderFocus: '1px solid #2563eb',
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
    name: 'Gothic Horror',
    id: 'gothic',
    colors: {
      primary: '#2c1810',
      secondary: '#8b0000',
      accent: '#c9b037',
      background: '#1a1a1a',
      surface: '#2d2d2d',
      text: {
        primary: '#e8e8e8',
        secondary: '#b8b8b8',
        accent: '#c9b037'
      },
      markup: {
        character: {
          player: '#c9b037',
          npc: '#8b0000',
          hover: '#ffd700'
        },
        item: {
          primary: '#800080',
          interactive: '#9932cc',
          important: '#8b008b',
          hover: '#aa44aa'
        },
        location: {
          primary: '#2f4f4f',
          current: '#556b2f',
          accessible: '#696969',
          hover: '#1c1c1c'
        },
        alerts: {
          warning: {
            bg: '#3d2914',
            border: '#8b6914',
            text: '#ffd700'
          },
          discovery: {
            bg: '#1a3d1a',
            border: '#4caf50',
            text: '#90ee90'
          },
          danger: {
            bg: '#3d1414',
            border: '#8b0000',
            text: '#ff6b6b'
          }
        }
      }
    },
    typography: {
      fonts: {
        primary: '"Crimson Text", "Times New Roman", serif',
        secondary: '"Cinzel", Georgia, serif',
        monospace: '"Courier New", monospace'
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
      panels: {
        background: 'rgba(45, 45, 45, 0.95)',
        border: '1px solid #555',
        borderRadius: '8px',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
      },
      buttons: {
        background: '#2c1810',
        backgroundHover: '#3d2414',
        border: '1px solid #8b0000',
        borderRadius: '4px',
        text: '#e8e8e8',
        textHover: '#c9b037'
      },
      inputs: {
        background: '#1a1a1a',
        border: '1px solid #555',
        borderFocus: '1px solid #c9b037',
        text: '#e8e8e8',
        placeholder: '#888'
      },
      scrollbars: {
        track: '#2d2d2d',
        thumb: '#555',
        thumbHover: '#777'
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
        subtle: '0 2px 4px rgba(0, 0, 0, 0.3)',
        medium: '0 4px 8px rgba(0, 0, 0, 0.5)',
        strong: '0 8px 16px rgba(0, 0, 0, 0.7)'
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

    // Markup colors
    '--markup-character-player': theme.colors.markup.character.player,
    '--markup-character-npc': theme.colors.markup.character.npc,
    '--markup-character-hover': theme.colors.markup.character.hover,
    '--markup-item-primary': theme.colors.markup.item.primary,
    '--markup-item-hover': theme.colors.markup.item.hover,
    '--markup-location-primary': theme.colors.markup.location.primary,
    '--markup-location-hover': theme.colors.markup.location.hover,
    
    // Alert colors
    '--alert-warning-bg': theme.colors.markup.alerts.warning.bg,
    '--alert-warning-border': theme.colors.markup.alerts.warning.border,
    '--alert-warning-text': theme.colors.markup.alerts.warning.text,
    '--alert-discovery-bg': theme.colors.markup.alerts.discovery.bg,
    '--alert-discovery-border': theme.colors.markup.alerts.discovery.border,
    '--alert-discovery-text': theme.colors.markup.alerts.discovery.text,
    '--alert-danger-bg': theme.colors.markup.alerts.danger.bg,
    '--alert-danger-border': theme.colors.markup.alerts.danger.border,
    '--alert-danger-text': theme.colors.markup.alerts.danger.text,

    // Typography
    '--font-primary': theme.typography.fonts.primary,
    '--font-secondary': theme.typography.fonts.secondary,
    '--font-monospace': theme.typography.fonts.monospace,
    '--font-size-small': theme.typography.sizes.small,
    '--font-size-normal': theme.typography.sizes.normal,
    '--font-size-large': theme.typography.sizes.large,
    '--font-size-heading': theme.typography.sizes.heading,

    // Interface
    '--interface-panel-bg': theme.interface.panels.background,
    '--interface-panel-border': theme.interface.panels.border,
    '--interface-button-bg': theme.interface.buttons.background,
    '--interface-button-hover-bg': theme.interface.buttons.backgroundHover,
    '--interface-button-text': theme.interface.buttons.text,
    '--interface-input-bg': theme.interface.inputs.background,
    '--interface-input-border': theme.interface.inputs.border,
    '--interface-input-border-focus': theme.interface.inputs.borderFocus,

    // Effects
    '--transition-fast': theme.effects.transitions.fast,
    '--transition-normal': theme.effects.transitions.normal,
    '--shadow-subtle': theme.effects.shadows.subtle,
    '--shadow-medium': theme.effects.shadows.medium
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