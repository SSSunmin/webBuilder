/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(264, 88%, 97%)',
            '100': 'hsl(264, 88%, 94%)',
            '200': 'hsl(264, 88%, 86%)',
            '300': 'hsl(264, 88%, 76%)',
            '400': 'hsl(264, 88%, 64%)',
            '500': 'hsl(264, 88%, 50%)',
            '600': 'hsl(264, 88%, 40%)',
            '700': 'hsl(264, 88%, 32%)',
            '800': 'hsl(264, 88%, 24%)',
            '900': 'hsl(264, 88%, 16%)',
            '950': 'hsl(264, 88%, 10%)',
            DEFAULT: '#f5effe'
        },
        secondary: {
            '50': 'hsl(246, 75%, 97%)',
            '100': 'hsl(246, 75%, 94%)',
            '200': 'hsl(246, 75%, 86%)',
            '300': 'hsl(246, 75%, 76%)',
            '400': 'hsl(246, 75%, 64%)',
            '500': 'hsl(246, 75%, 50%)',
            '600': 'hsl(246, 75%, 40%)',
            '700': 'hsl(246, 75%, 32%)',
            '800': 'hsl(246, 75%, 24%)',
            '900': 'hsl(246, 75%, 16%)',
            '950': 'hsl(246, 75%, 10%)',
            DEFAULT: '#4434e2'
        },
        accent: {
            '50': 'hsl(242, 89%, 97%)',
            '100': 'hsl(242, 89%, 94%)',
            '200': 'hsl(242, 89%, 86%)',
            '300': 'hsl(242, 89%, 76%)',
            '400': 'hsl(242, 89%, 64%)',
            '500': 'hsl(242, 89%, 50%)',
            '600': 'hsl(242, 89%, 40%)',
            '700': 'hsl(242, 89%, 32%)',
            '800': 'hsl(242, 89%, 24%)',
            '900': 'hsl(242, 89%, 16%)',
            '950': 'hsl(242, 89%, 10%)',
            DEFAULT: '#dcdbfd'
        },
        'neutral-50': '#e7e5e4',
        'neutral-100': '#0c0a09',
        'neutral-200': '#ffffff',
        'neutral-300': '#000000',
        'neutral-400': '#25252f',
        'neutral-500': '#3f3f49',
        'neutral-600': '#646371',
        'neutral-700': '#9291a5',
        'neutral-800': '#64748b',
        'neutral-900': '#d4d3dd',
        background: '#ffffff',
        foreground: '#000000'
    },
    fontFamily: {
        sans: [
            'Pretendard Variable',
            'sans-serif'
        ]
    },
    fontSize: {
        '10': [
            '10px',
            {
                lineHeight: '15px'
            }
        ],
        '12': [
            '12px',
            {
                lineHeight: '18px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '21px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '30px'
            }
        ],
        '28': [
            '28px',
            {
                lineHeight: '42px',
                letterSpacing: '-1px'
            }
        ],
        '32': [
            '32px',
            {
                lineHeight: '48px'
            }
        ],
        '40': [
            '40px',
            {
                lineHeight: '60px'
            }
        ],
        '42': [
            '42px',
            {
                lineHeight: '63px',
                letterSpacing: '-2.1px'
            }
        ],
        '80': [
            '80px',
            {
                lineHeight: '120px',
                letterSpacing: '-2.5px'
            }
        ]
    },
    spacing: {
        '12': '48px',
        '14': '56px',
        '20': '80px',
        '25': '100px',
        '30': '120px',
        '37': '148px',
        '50': '200px',
        '60': '240px',
        '1px': '1px',
        '73px': '73px',
        '223px': '223px'
    },
    borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        full: '9999px'
    },
    boxShadow: {
        sm: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 0px 10px 0px'
    },
    screens: {
        sm: '600px',
        '1200px': '1200px',
        '1400px': '1400px'
    },
    transitionDuration: {
        '150': '0.15s',
        '200': '0.2s',
        '300': '0.3s',
        '500': '0.5s'
    },
    transitionTimingFunction: {
        custom: 'cubic-bezier(0, 0, 0.2, 1)'
    },
    container: {
        center: true,
        padding: '0px'
    },
    maxWidth: {
        container: '100%'
    }
},
  },
};
