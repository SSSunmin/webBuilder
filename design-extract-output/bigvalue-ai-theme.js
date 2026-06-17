// React Theme — extracted from https://www.bigvalue.ai/
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
    neutral900: string;
 *   };
 *   fonts: {
    body: string;
 *   };
 *   fontSizes: {
    '10': string;
    '12': string;
    '14': string;
    '16': string;
    '20': string;
    '28': string;
    '32': string;
    '40': string;
    '42': string;
    '80': string;
 *   };
 *   space: {
    '1': string;
    '48': string;
    '56': string;
    '73': string;
    '80': string;
    '100': string;
    '120': string;
    '148': string;
    '200': string;
    '223': string;
    '240': string;
 *   };
 *   radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
 *   };
 *   shadows: {
    sm: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#f5effe",
    "secondary": "#4434e2",
    "accent": "#dcdbfd",
    "background": "#ffffff",
    "foreground": "#000000",
    "neutral50": "#e7e5e4",
    "neutral100": "#0c0a09",
    "neutral200": "#ffffff",
    "neutral300": "#000000",
    "neutral400": "#25252f",
    "neutral500": "#3f3f49",
    "neutral600": "#646371",
    "neutral700": "#9291a5",
    "neutral800": "#64748b",
    "neutral900": "#d4d3dd"
  },
  "fonts": {
    "body": "'Pretendard Variable', sans-serif"
  },
  "fontSizes": {
    "10": "10px",
    "12": "12px",
    "14": "14px",
    "16": "16px",
    "20": "20px",
    "28": "28px",
    "32": "32px",
    "40": "40px",
    "42": "42px",
    "80": "80px"
  },
  "space": {
    "1": "1px",
    "48": "48px",
    "56": "56px",
    "73": "73px",
    "80": "80px",
    "100": "100px",
    "120": "120px",
    "148": "148px",
    "200": "200px",
    "223": "223px",
    "240": "240px"
  },
  "radii": {
    "sm": "4px",
    "md": "8px",
    "lg": "16px",
    "xl": "24px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 0px 10px 0px"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#f5effe",
      "light": "hsl(264, 88%, 95%)",
      "dark": "hsl(264, 88%, 82%)"
    },
    "secondary": {
      "main": "#4434e2",
      "light": "hsl(246, 75%, 70%)",
      "dark": "hsl(246, 75%, 40%)"
    },
    "background": {
      "default": "#ffffff",
      "paper": "#f5f4ff"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#0c0a09"
    }
  },
  "typography": {
    "h1": {
      "fontSize": "32px",
      "fontWeight": "700",
      "lineHeight": "48px"
    },
    "h2": {
      "fontSize": "28px",
      "fontWeight": "400",
      "lineHeight": "42px"
    },
    "h3": {
      "fontSize": "20px",
      "fontWeight": "700",
      "lineHeight": "30px"
    }
  },
  "shape": {
    "borderRadius": 8
  },
  "shadows": [
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(232, 73, 42, 0.4) 0px 2px 8px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(232, 73, 42, 0.55) 0px 8px 24px -8px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(232, 216, 254) 0px 0px 4px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 0px 10px 0px"
  ]
};

export default theme;
