# Visual Design System for Impressionistic Engine

## Overview

This proposal defines a comprehensive visual design system that transforms the Impressionistic Engine from a text-based interface into a rich, immersive storytelling experience. The system encompasses typography, color theming, interactive elements, and visual effects while maintaining accessibility and performance.

## Design Philosophy

1. **Story-Driven Aesthetics**: Each story can create its own visual atmosphere
2. **Progressive Enhancement**: Beautiful defaults with unlimited customization
3. **Accessibility First**: High contrast, readable fonts, keyboard navigation
4. **Immersive Experience**: Visual design enhances narrative, not distracts
5. **Performance Conscious**: Optimized font loading, smooth animations

## Complete Visual System

### Theme Structure

```yaml
# Complete theme specification in story file
ui:
  theme:
    # Core visual identity
    colors:
      primary: "#ff1493"        # Accent color
      secondary: "#ff69b4"      # Secondary accent
      background: "#000000"     # Main background
      surface: "#1a1a1a"        # Cards, panels
      text: "#ffffff"           # Primary text
      textMuted: "#cccccc"      # Secondary text
      border: "#333333"         # Dividers
    
    # Typography with Google Fonts
    typography:
      fontFamily:
        name: "Crimson Text"
        fallback: "Georgia, serif"
        weights: [400, 700]
      
      headingFamily:
        name: "Playfair Display"
        fallback: "Georgia, serif"
        weights: [700, 900]
      
      monoFamily:
        name: "JetBrains Mono"
        fallback: "Consolas, monospace"
      
      fontSize: "18px"
      lineHeight: 1.6
      letterSpacing: "0.02em"
    
    # Interactive elements
    richText:
      item:
        color: "#4a9eff"
        background: "rgba(74, 158, 255, 0.1)"
        hoverBackground: "rgba(74, 158, 255, 0.2)"
        borderColor: "rgba(74, 158, 255, 0.4)"
      
      character:
        color: "#9b59b6"
        hoverColor: "#8e44ad"
        style: "smallCaps"      # or "bold", "italic"
      
      quote:
        borderColor: "#64748b"
        background: "rgba(100, 116, 139, 0.1)"
        textColor: "#94a3b8"
        style: "italic"
      
      alerts:
        warning:
          background: "#fef3c7"
          border: "#f59e0b"
          text: "#92400e"
          icon: "⚠️"
        
        info:
          background: "#dbeafe"
          border: "#3b82f6"
          text: "#1e40af"
          icon: "💡"
        
        danger:
          background: "#fee2e2"
          border: "#ef4444"
          text: "#991b1b"
          icon: "❗"
    
    # Visual effects
    effects:
      borderRadius: "8px"
      shadowElevation:
        low: "0 2px 4px rgba(0,0,0,0.1)"
        medium: "0 4px 12px rgba(0,0,0,0.15)"
        high: "0 8px 24px rgba(0,0,0,0.2)"
      
      animations:
        speed: "200ms"
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
        
      blur:
        background: "12px"      # For glassmorphism effects
        
    # Layout preferences
    layout:
      maxWidth: "720px"
      padding: "2rem"
      density: "comfortable"    # "compact", "comfortable", "spacious"
```

## Visual Components

### 1. Container Design

```css
/* Main story container with theme-aware styling */
.story-container {
  max-width: var(--layout-max-width, 720px);
  margin: 0 auto;
  padding: var(--layout-padding, 2rem);
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
  letter-spacing: var(--letter-spacing, normal);
}

/* Message bubbles with elevation */
.message {
  background: var(--color-surface);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: var(--shadow-low);
  transition: box-shadow var(--animation-speed) var(--animation-easing);
}

.message:hover {
  box-shadow: var(--shadow-medium);
}

/* Scene transitions */
.scene-transition {
  text-align: center;
  margin: 3rem 0;
  position: relative;
}

.scene-transition::before,
.scene-transition::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: var(--color-border);
}

.scene-transition::before { left: 0; }
.scene-transition::after { right: 0; }
```

### 2. Typography System

```typescript
class TypographySystem {
  async applyTypography(typography: Typography) {
    // Load Google Fonts
    await this.loadGoogleFonts(typography);
    
    // Apply CSS variables
    const root = document.documentElement;
    
    // Font stacks
    if (typography.fontFamily) {
      const font = this.normalizeFont(typography.fontFamily);
      root.style.setProperty('--font-family', `"${font.name}", ${font.fallback}`);
    }
    
    // Heading hierarchy
    if (typography.headingFamily) {
      const font = this.normalizeFont(typography.headingFamily);
      root.style.setProperty('--font-heading', `"${font.name}", ${font.fallback}`);
      
      // Generate heading scale
      this.generateHeadingScale(typography.fontSize || '16px');
    }
    
    // Apply other properties
    root.style.setProperty('--font-size', typography.fontSize || '16px');
    root.style.setProperty('--line-height', String(typography.lineHeight || 1.6));
    root.style.setProperty('--letter-spacing', typography.letterSpacing || 'normal');
  }
  
  private generateHeadingScale(baseSize: string) {
    const base = parseInt(baseSize);
    const scale = 1.25; // Major third scale
    
    document.documentElement.style.setProperty('--font-size-h1', `${base * Math.pow(scale, 4)}px`);
    document.documentElement.style.setProperty('--font-size-h2', `${base * Math.pow(scale, 3)}px`);
    document.documentElement.style.setProperty('--font-size-h3', `${base * Math.pow(scale, 2)}px`);
    document.documentElement.style.setProperty('--font-size-h4', `${base * scale}px`);
  }
}
```

### 3. Rich Text Rendering

```typescript
class RichTextRenderer {
  private markdown: MarkdownIt;
  
  constructor() {
    this.markdown = new MarkdownIt({
      html: false,
      breaks: true,
      typographer: true
    });
    
    this.setupCustomRenderers();
  }
  
  private setupCustomRenderers() {
    // Items: `brass key` becomes interactive element
    this.markdown.renderer.rules.code_inline = (tokens, idx) => {
      const content = tokens[idx].content;
      const item = this.gameContext?.findItem(content);
      
      if (item) {
        return `<span class="rich-item interactive" 
                     data-item-id="${item.id}"
                     role="button"
                     tabindex="0"
                     aria-label="Click to interact with ${item.name}">
                  <span class="item-icon">📦</span>
                  <span class="item-text">${item.display_name || item.name}</span>
                </span>`;
      }
      
      return `<code class="inline-code">${content}</code>`;
    };
    
    // Characters: *Sarah* at dialogue start
    this.markdown.renderer.rules.character = (tokens, idx) => {
      const name = tokens[idx].content;
      const character = this.gameContext?.findCharacter(name);
      
      return `<span class="rich-character interactive"
                   data-character="${name}"
                   role="button"
                   tabindex="0">
                <span class="character-icon">${character?.emoji || '👤'}</span>
                <span class="character-name">${name}</span>
              </span>`;
    };
    
    // Atmospheric quotes
    this.markdown.renderer.rules.blockquote_open = () => 
      '<blockquote class="atmospheric-quote"><span class="quote-mark">"</span>';
    
    this.markdown.renderer.rules.blockquote_close = () => 
      '<span class="quote-mark">"</span></blockquote>';
    
    // Alert boxes with icons
    this.markdown.renderer.rules.paragraph_open = (tokens, idx) => {
      const next = tokens[idx + 1];
      if (next?.type === 'inline') {
        const content = next.content;
        
        // Check for emoji prefixes
        const alertTypes = {
          '⚠️': 'warning',
          '💡': 'info',
          '❗': 'danger',
          '✨': 'discovery',
          '🔍': 'clue'
        };
        
        for (const [emoji, type] of Object.entries(alertTypes)) {
          if (content.startsWith(emoji)) {
            // Remove emoji from content
            next.content = content.substring(emoji.length).trim();
            return `<div class="alert alert-${type}" role="alert">
                     <span class="alert-icon" aria-hidden="true">${emoji}</span>
                     <div class="alert-content">`;
          }
        }
      }
      
      return '<p>';
    };
  }
}
```

### 4. Visual Effects

```css
/* Glassmorphism panels */
.glass-panel {
  background: rgba(var(--color-surface-rgb), 0.7);
  backdrop-filter: blur(var(--blur-background, 12px));
  -webkit-backdrop-filter: blur(var(--blur-background, 12px));
  border: 1px solid rgba(var(--color-border-rgb), 0.2);
  box-shadow: var(--shadow-medium);
}

/* Interactive element animations */
.interactive {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.1em 0.4em;
  border-radius: var(--border-radius-small, 4px);
  transition: all var(--animation-speed) var(--animation-easing);
  cursor: pointer;
}

.interactive::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  opacity: 0;
  transition: opacity var(--animation-speed) var(--animation-easing);
}

.interactive:hover::after {
  opacity: 1;
  background: radial-gradient(
    circle at center,
    transparent 30%,
    currentColor 100%
  );
  filter: blur(8px);
  z-index: -1;
}

/* Text reveal animation for new content */
@keyframes textReveal {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.new-content {
  animation: textReveal 0.6s var(--animation-easing) forwards;
}

/* Scene transition effects */
.scene-change {
  animation: fadeInUp 0.8s var(--animation-easing);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

## Preset Visual Themes

```typescript
const VISUAL_PRESETS = {
  // Noir: High contrast, monochrome with red accents
  noir: {
    colors: {
      primary: '#ff4444',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#e0e0e0',
      border: '#333'
    },
    typography: {
      fontFamily: {
        name: 'Courier Prime',
        fallback: 'Courier New, monospace'
      },
      fontSize: '16px',
      letterSpacing: '0.05em'
    },
    effects: {
      borderRadius: '2px',
      shadowElevation: {
        low: '0 2px 4px rgba(255,0,0,0.1)',
        medium: '0 4px 8px rgba(255,0,0,0.2)'
      }
    }
  },
  
  // Fantasy: Warm, parchment-like with ornate fonts
  fantasy: {
    colors: {
      primary: '#8b4513',
      secondary: '#daa520',
      background: '#f4e4c1',
      surface: '#fff8e7',
      text: '#2c1810',
      border: '#d4a574'
    },
    typography: {
      fontFamily: {
        name: 'Crimson Text',
        weights: [400, 600]
      },
      headingFamily: {
        name: 'Cinzel Decorative',
        weights: [700]
      },
      fontSize: '18px',
      lineHeight: 1.7
    },
    richText: {
      item: {
        color: '#b8860b',
        style: 'smallCaps'
      },
      quote: {
        style: 'italic',
        borderColor: '#8b4513'
      }
    },
    effects: {
      borderRadius: '0',
      animations: {
        speed: '400ms'
      }
    }
  },
  
  // Sci-Fi: Dark with neon accents, monospace
  scifi: {
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      background: '#000011',
      surface: '#0a0a2e',
      text: '#e0e0ff',
      border: '#0066cc'
    },
    typography: {
      fontFamily: {
        name: 'Exo 2',
        weights: [400, 700]
      },
      monoFamily: {
        name: 'Share Tech Mono'
      },
      fontSize: '16px',
      letterSpacing: '0.03em'
    },
    richText: {
      item: {
        color: '#00ff00',
        background: 'rgba(0, 255, 0, 0.1)'
      },
      alerts: {
        info: {
          background: 'rgba(0, 255, 255, 0.1)',
          border: '#00ffff',
          text: '#00ffff'
        }
      }
    },
    effects: {
      borderRadius: '0',
      shadowElevation: {
        low: '0 0 10px rgba(0, 255, 255, 0.3)',
        medium: '0 0 20px rgba(0, 255, 255, 0.5)'
      },
      animations: {
        speed: '150ms',
        easing: 'linear'
      }
    }
  },
  
  // Horror: Dark reds, unsettling fonts
  horror: {
    colors: {
      primary: '#8b0000',
      background: '#0a0a0a',
      surface: '#1a0a0a',
      text: '#cccccc',
      border: '#4a0000'
    },
    typography: {
      fontFamily: {
        name: 'Creepster',
        fallback: 'Georgia, serif'
      },
      fontSize: '18px',
      lineHeight: 1.8
    },
    richText: {
      alerts: {
        danger: {
          background: 'rgba(139, 0, 0, 0.2)',
          border: '#8b0000',
          text: '#ff6666',
          icon: '💀'
        }
      }
    },
    effects: {
      animations: {
        speed: '600ms',
        easing: 'ease-in-out'
      }
    }
  }
};
```

## Responsive Design

```css
/* Mobile-first responsive design */
:root {
  --layout-padding: 1rem;
  --font-size: 16px;
}

@media (min-width: 640px) {
  :root {
    --layout-padding: 1.5rem;
    --font-size: 17px;
  }
}

@media (min-width: 768px) {
  :root {
    --layout-padding: 2rem;
    --font-size: 18px;
  }
}

/* Density preferences */
[data-density="compact"] {
  --layout-padding: 1rem;
  --message-padding: 1rem;
  --line-height: 1.5;
}

[data-density="comfortable"] {
  --layout-padding: 2rem;
  --message-padding: 1.5rem;
  --line-height: 1.6;
}

[data-density="spacious"] {
  --layout-padding: 3rem;
  --message-padding: 2rem;
  --line-height: 1.8;
}
```

## Accessibility Features

```typescript
class AccessibilityManager {
  // High contrast mode
  enableHighContrast() {
    document.documentElement.setAttribute('data-contrast', 'high');
  }
  
  // Reduced motion
  respectMotionPreference() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-speed', '0ms');
      document.documentElement.style.setProperty('--transition-speed', '0ms');
    }
  }
  
  // Font size adjustment
  adjustFontSize(delta: number) {
    const current = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size');
    const size = parseInt(current) + delta;
    
    if (size >= 14 && size <= 24) {
      document.documentElement.style.setProperty('--font-size', `${size}px`);
    }
  }
}
```

## Implementation Benefits

1. **Immersive Storytelling**: Visual design enhances narrative atmosphere
2. **Author Control**: Complete customization or simple presets
3. **Accessibility**: WCAG compliant with high contrast and motion preferences
4. **Performance**: Optimized font loading, CSS-only animations
5. **Responsive**: Beautiful on all devices
6. **Maintainable**: CSS custom properties enable runtime theming

This visual design system transforms the Impressionistic Engine into a truly immersive storytelling platform where each story can create its own unique visual world while maintaining usability and accessibility.