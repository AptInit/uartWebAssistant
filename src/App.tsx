import React from 'react';
import { SerialProvider, useSerialContext } from './context/SerialContext';
import { MainLayout } from './components/Layout/MainLayout';
import { ConnectionPanel } from './components/Connection/ConnectionPanel';
import { CommunicationLog } from './components/LogPanel/CommunicationLog';
import { TerminalView } from './components/Terminal/TerminalView';
import { InputArea } from './components/Input/InputArea';
import { XmodemModal } from './components/Xmodem/XmodemModal';

const AppContent = () => {
  const { isConnected, connect, disconnect } = useSerialContext();

  const [isXmodemOpen, setIsXmodemOpen] = React.useState(false);

  return (
    <>
      <MainLayout
        header={
          <ConnectionPanel
            isConnected={isConnected}
            onConnect={connect}
            onDisconnect={disconnect}
            onOpenXmodem={() => setIsXmodemOpen(true)}
          />
        }
        main={<TerminalView />}
        rightPanel={<CommunicationLog />}
        footer={<InputArea />}
      />
      <XmodemModal isOpen={isXmodemOpen} onClose={() => setIsXmodemOpen(false)} />
    </>
  );
};

function App() {
  return (
    <SerialProvider>
      <AppContent />
    </SerialProvider>
  );
}

export default App;
