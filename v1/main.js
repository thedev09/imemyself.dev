const { useState, useEffect } = React;

const commands = {
    help: `Available commands:
  - about: Learn about me
  - skills: See my technical skills
  - projects: View my projects
  - contact: Get my contact info
  - socials: Social media links
  - clear: Clear terminal`,

    about: `Hi! I'm Dev, a passionate Full Stack Developer.
I craft digital experiences and love exploring new technologies.
Currently working on exciting projects and always learning something new.`,

    skills: [
        'Frontend: React, JavaScript/TypeScript, HTML/CSS',
        'Backend: Node.js, Express',
        'Database: MongoDB, SQL',
        'Tools: Git, Docker, AWS',
        'Other: UI/UX, Responsive Design'
    ].join('\n'),

    projects: [
        'Personal Website - Portfolio website with multiple versions',
        'Project Beta - Currently in development',
        'Project Gamma - Coming soon'
    ].join('\n'),

    contact: `Email: thakurrahul2019@gmail.com
Location: India
Open for opportunities: Yes`,

    socials: `GitHub: https://github.com/thedev09
Twitter: https://twitter.com/thakur_d09
Facebook: https://www.facebook.com/sharifladka69
Instagram: https://www.instagram.com/thedev09.eth`
};

function Terminal() {
    const [history, setHistory] = useState([{ type: 'output', content: 'Welcome to Dev\'s terminal! Type "help" to start.' }]);
    const [input, setInput] = useState('');

    const executeCommand = (cmd) => {
        const command = cmd.toLowerCase().trim();
        
        // Add command to history
        setHistory(prev => [...prev, { type: 'command', content: cmd }]);

        // Handle clear command
        if (command === 'clear') {
            setHistory([]);
            return;
        }

        // Process other commands
        const output = commands[command];
        if (output) {
            setHistory(prev => [...prev, { type: 'output', content: output }]);
        } else {
            setHistory(prev => [...prev, { 
                type: 'output', 
                content: `Command not found: ${command}. Type "help" for available commands.`
            }]);
        }
    };

    return React.createElement('div', { className: 'terminal' }, [
        // Terminal Header
        React.createElement('div', { className: 'terminal-header', key: 'header' }, [
            React.createElement('div', { className: 'terminal-button red', key: 'red' }),
            React.createElement('div', { className: 'terminal-button yellow', key: 'yellow' }),
            React.createElement('div', { className: 'terminal-button green', key: 'green' })
        ]),

        // Terminal Content
        React.createElement('div', { className: 'terminal-content', key: 'content' }, [
            ...history.map((entry, i) => 
                React.createElement('div', { 
                    className: 'terminal-line',
                    key: i 
                }, 
                    entry.type === 'command' 
                        ? [
                            React.createElement('span', { 
                                className: 'terminal-prompt',
                                key: 'prompt'
                            }, '➜ '),
                            entry.content
                        ]
                        : entry.content
                )
            ),
            
            // Input Line
            React.createElement('div', { 
                className: 'terminal-line',
                key: 'input-line'
            }, [
                React.createElement('span', { 
                    className: 'terminal-prompt',
                    key: 'prompt'
                }, '➜ '),
                React.createElement('input', {
                    key: 'input',
                    type: 'text',
                    className: 'terminal-input',
                    value: input,
                    onChange: (e) => setInput(e.target.value),
                    onKeyDown: (e) => {
                        if (e.key === 'Enter' && input.trim()) {
                            executeCommand(input);
                            setInput('');
                        }
                    },
                    autoFocus: true
                })
            ])
        ])
    ]);
}

// Render the app
ReactDOM.render(
    React.createElement(Terminal),
    document.getElementById('root')
);
