// Global dependencies
const { useState, useEffect } = React;
const motion = { div: props => React.createElement('div', props) };
const AnimatePresence = ({ children }) => children;

// Get icons from Lucide global
const icons = window.lucide.icons;
const createIcon = (icon) => {
    return (props) => React.createElement('span', {
        ...props,
        dangerouslySetInnerHTML: { __html: icon.toSvg() }
    });
};

// Create icon components
const Github = createIcon(icons.Github);
const Twitter = createIcon(icons.Twitter);
const Facebook = createIcon(icons.Facebook);
const Instagram = createIcon(icons.Instagram);
const Mail = createIcon(icons.Mail);


// Matrix background component
const Matrix = () => React.createElement('div', {
  className: 'fixed inset-0 pointer-events-none overflow-hidden opacity-20'
}, 
  React.createElement('div', {
    className: 'absolute inset-0 matrix-effect font-mono text-green-500'
  })
);

const commands = {
  help: `Available commands:
  - about: Learn about me
  - skills: See my technical skills
  - projects: View my projects
  - contact: Get my contact info
  - socials: Social media links
  - clear: Clear terminal
  - theme: Change color theme`,

  about: `Hi! I'm Dev, a passionate Full Stack Developer.
I craft digital experiences and love exploring new technologies.
Currently working on exciting projects and always learning something new.`,

  skills: [
    'Frontend: React, JavaScript/TypeScript, HTML/CSS',
    'Backend: Node.js, Express',
    'Database: MongoDB, SQL',
    'Tools: Git, Docker, AWS',
    'Other: UI/UX, Responsive Design'
  ],

  projects: [
    {
      name: 'Personal Website',
      tech: 'HTML, CSS, JavaScript',
      desc: 'My portfolio website with multiple versions'
    }
    // Add more projects as needed
  ],

  contact: `Email: thakurrahul2019@gmail.com
Location: India
Open for opportunities: Yes`,

  socials: `GitHub: https://github.com/thedev09
Twitter: https://twitter.com/thakur_d09
Facebook: https://www.facebook.com/sharifladka69
Instagram: https://www.instagram.com/thedev09.eth`
};

const Terminal = () => {
  const [history, setHistory] = useState([
    { type: 'output', content: 'Welcome to Dev\'s terminal portfolio! Type "help" to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState('cyber');

  const themes = {
    cyber: 'from-cyan-500 to-blue-500',
    retro: 'from-orange-500 to-red-500',
    matrix: 'from-green-500 to-emerald-500',
    neon: 'from-pink-500 to-purple-500'
  };

  const executeCommand = (cmd) => {
    const command = cmd.toLowerCase().trim();
    setHistory(prev => [...prev, { type: 'input', content: `➜ ${cmd}` }]);

    if (command === 'clear') {
      setHistory([]);
      return;
    }

    if (command === 'theme') {
      const nextTheme = {
        cyber: 'retro',
        retro: 'matrix',
        matrix: 'neon',
        neon: 'cyber'
      }[theme];
      setTheme(nextTheme);
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Theme changed to ${nextTheme}`
      }]);
      return;
    }

    const output = commands[command];
    if (!output) {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Command not found: ${command}. Type "help" for available commands.`
      }]);
      return;
    }

    if (Array.isArray(output)) {
      setHistory(prev => [...prev, { type: 'output', content: output.join('\n') }]);
    } else if (typeof output === 'object') {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: output.map(proj => 
          `${proj.name} (${proj.tech})\n└─ ${proj.desc}`
        ).join('\n\n')
      }]);
    } else {
      setHistory(prev => [...prev, { type: 'output', content: output }]);
    }
  };

  const socialLinks = [
    { Icon: Github, label: 'GitHub', url: 'https://github.com/thedev09' },
    { Icon: Twitter, label: 'Twitter', url: 'https://twitter.com/thakur_d09' },
    { Icon: Facebook, label: 'Facebook', url: 'https://www.facebook.com/sharifladka69' },
    { Icon: Instagram, label: 'Instagram', url: 'https://www.instagram.com/thedev09.eth' },
    { Icon: Mail, label: 'Email', url: 'mailto:thakurrahul2019@gmail.com' }
  ];

  return React.createElement('div', {
    className: 'min-h-screen bg-black text-white overflow-hidden relative'
  }, [
    React.createElement(Matrix, { key: 'matrix' }),
    React.createElement('div', {
      key: 'container',
      className: 'max-w-4xl mx-auto p-4 pt-16'
    }, [
      // Terminal Window
      React.createElement(motion.div, {
        key: 'terminal',
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        className: 'bg-zinc-900/90 backdrop-blur-lg rounded-lg border border-zinc-700 shadow-2xl'
      }, [
        // Terminal Header
        React.createElement('div', {
          key: 'header',
          className: 'p-2 border-b border-zinc-700 flex items-center justify-between'
        }, [
          React.createElement('div', { className: 'flex gap-2' }, [
            React.createElement('div', { className: 'w-3 h-3 rounded-full bg-red-500' }),
            React.createElement('div', { className: 'w-3 h-3 rounded-full bg-yellow-500' }),
            React.createElement('div', { className: 'w-3 h-3 rounded-full bg-green-500' })
          ]),
          React.createElement('div', { className: 'text-zinc-400 text-sm' }, 'dev@portfolio ~ '),
          React.createElement('div', { className: 'w-16' })
        ]),

        // Terminal Content
        React.createElement('div', {
          className: 'p-4 font-mono h-[600px] overflow-auto'
        }, [
          // Command History
          React.createElement(AnimatePresence, { mode: 'popLayout' },
            history.map((entry, i) => 
              React.createElement(motion.div, {
                key: i,
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                exit: { opacity: 0, x: 20 },
                className: `mb-2 ${entry.type === 'input' ? `text-${themes[theme].split('-')[1]}` : 'text-zinc-300'}`
              }, 
                entry.content.split('\n').map((line, j) => 
                  React.createElement('div', { key: j }, line)
                )
              )
            )
          ),

          // Input Line
          React.createElement('div', {
            className: 'flex items-center gap-2 mt-4'
          }, [
            React.createElement('span', {
              className: `text-transparent bg-clip-text bg-gradient-to-r ${themes[theme]}`
            }, '➜'),
            React.createElement('input', {
              type: 'text',
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter' && input.trim()) {
                  executeCommand(input);
                  setInput('');
                }
              },
              className: 'flex-1 bg-transparent outline-none border-b border-zinc-700 focus:border-blue-500 transition-colors',
              placeholder: 'Type a command...',
              spellCheck: 'false'
            })
          ])
        ])
      ]),

      // Social Links
      React.createElement('div', {
        key: 'social',
        className: 'mt-6 flex justify-center gap-4'
      }, 
        socialLinks.map(({ Icon, label, url }) => 
          React.createElement(motion.a, {
            key: label,
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.95 },
            className: `p-3 rounded-lg bg-zinc-900/50 backdrop-blur border border-zinc-800 
              hover:border-${themes[theme].split('-')[1]} transition-colors`
          },
            React.createElement(Icon, {
              className: `w-5 h-5 text-transparent bg-clip-text bg-gradient-to-r ${themes[theme]}`
            })
          )
        )
      )
    ])
  ]);
};

// Render the app
ReactDOM.render(
  React.createElement(Terminal),
  document.getElementById('root')
);
