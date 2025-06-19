export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: {
    primary: string
    secondary: string
    accent: string
  }
  markup: {
    character: {
      player: string
      npc: string
      hover: string
    }
    item: {
      primary: string
      interactive: string
      important: string
      hover: string
    }
    location: {
      primary: string
      current: string
      accessible: string
      hover: string
    }
    alerts: {
      warning: {
        bg: string
        border: string
        text: string
      }
      discovery: {
        bg: string
        border: string
        text: string
      }
      danger: {
        bg: string
        border: string
        text: string
      }
    }
  }
}

export interface ThemeTypography {
  fonts: {
    primary: string
    secondary: string
    monospace: string
  }
  sizes: {
    small: string
    normal: string
    large: string
    heading: string
  }
  weights: {
    normal: string
    medium: string
    bold: string
  }
}

export interface InterfaceTheme {
  panels: {
    background: string
    border: string
    borderRadius: string
    shadow: string
  }
  buttons: {
    background: string
    backgroundHover: string
    border: string
    borderRadius: string
    text: string
    textHover: string
  }
  inputs: {
    background: string
    border: string
    borderFocus: string
    text: string
    placeholder: string
  }
  scrollbars: {
    track: string
    thumb: string
    thumbHover: string
  }
}

export interface ThemeEffects {
  transitions: {
    fast: string
    normal: string
    slow: string
  }
  animations: {
    fadeIn: string
    slideIn: string
    pulse: string
  }
  shadows: {
    subtle: string
    medium: string
    strong: string
  }
}

export interface GameTheme {
  name: string
  id: string
  colors: ThemeColors
  typography: ThemeTypography
  interface: InterfaceTheme
  effects: ThemeEffects
}