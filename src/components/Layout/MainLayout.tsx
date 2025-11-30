import React from 'react';

interface MainLayoutProps {
    header: React.ReactNode;
    main: React.ReactNode;
    rightPanel: React.ReactNode;
    footer: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    header,
    main,
    rightPanel,
    footer,
}) => {
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
            {/* Header */}
            <header className="flex-none p-2 border-b border-gray-700 bg-gray-800">
                {header}
            </header>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Terminal */}
                <main className="flex-1 flex flex-col min-w-0 border-r border-gray-700 bg-black">
                    {main}
                </main>

                {/* Right Panel (Logs) */}
                <aside className="w-96 flex flex-col bg-gray-800 flex-none">
                    {rightPanel}
                </aside>
            </div>

            {/* Footer */}
            <footer className="flex-none p-2 border-t border-gray-700 bg-gray-800">
                {footer}
            </footer>
        </div>
    );
};
