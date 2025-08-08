/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace']
      },
      colors: {
        // Premium colors extracted from reference image
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Dark theme colors
        dark: {
          bg: '#0a0a0b',
          surface: '#1a1a1b',
          card: '#252526',
          border: '#333334',
          text: {
            primary: '#ffffff',
            secondary: '#e5e5e5',
            muted: '#a1a1aa'
          }
        },
        // Light theme colors
        light: {
          bg: '#fafafa',
          surface: '#ffffff',
          card: '#f8f9fa',
          border: '#e4e4e7',
          text: {
            primary: '#18181b',
            secondary: '#3f3f46',
            muted: '#71717a'
          }
        },
        // Engine colors with both dark and light variants
        engine: {
          v1: {
            dark: '#3b82f6',
            light: '#2563eb',
            bg: {
              dark: 'rgba(59, 130, 246, 0.1)',
              light: 'rgba(37, 99, 235, 0.1)'
            }
          },
          v2: {
            dark: '#a855f7',
            light: '#7c3aed',
            bg: {
              dark: 'rgba(168, 85, 247, 0.1)',
              light: 'rgba(124, 58, 237, 0.1)'
            }
          },
          v3: {
            dark: '#06b6d4',
            light: '#0891b2',
            bg: {
              dark: 'rgba(6, 182, 212, 0.1)',
              light: 'rgba(8, 145, 178, 0.1)'
            }
          }
        },
        // Trading colors
        trading: {
          up: {
            dark: '#10b981',
            light: '#059669'
          },
          down: {
            dark: '#ef4444',
            light: '#dc2626'
          },
          neutral: {
            dark: '#64748b',
            light: '#475569'
          }
        },
        // Status colors
        status: {
          online: {
            dark: '#10b981',
            light: '#059669'
          },
          offline: {
            dark: '#ef4444',
            light: '#dc2626'
          },
          warning: {
            dark: '#f59e0b',
            light: '#d97706'
          }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Premium gradients inspired by the reference image
        'premium-pink': 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        'premium-purple': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        'premium-blue': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'premium-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        // Card backgrounds
        'card-dark': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'card-light': 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.5) 100%)',
        'card-hover-dark': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        'card-hover-light': 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.7) 100%)',
        // Engine gradients
        'engine-v1-dark': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.1) 100%)',
        'engine-v2-dark': 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
        'engine-v3-dark': 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.1) 100%)',
        'engine-v1-light': 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(29, 78, 216, 0.05) 100%)',
        'engine-v2-light': 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(109, 40, 217, 0.05) 100%)',
        'engine-v3-light': 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)'
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(236, 72, 153, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(236, 72, 153, 0.6), 0 0 30px rgba(236, 72, 153, 0.3)' }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'premium': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'premium-lg': '0 16px 64px rgba(0, 0, 0, 0.16)',
        'premium-dark': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'premium-dark-lg': '0 16px 64px rgba(0, 0, 0, 0.4)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'inner-premium': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem'
      }
    },
  },
  plugins: [],
}