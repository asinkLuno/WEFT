import {
    BrowserRouter as Router,
    Route,
    Routes,
    Navigate,
} from 'react-router-dom'; // 添加 useNavigate
import Home from './components/Home';
import RiverTabs from './components/RiverTabs';
import Footer from './components/Footer';
import React from 'react';

import { SnackbarProvider } from './context/SnackContext';
import { DaoProvider } from './context/DaoContext';

const AppContent: React.FC = () => {
    return (
        <SnackbarProvider>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route
                    path="/tabs"
                    element={<Navigate to="/intro" replace />}
                />
                <Route
                    path="/intro"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moai"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moai/:id"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moai_link/:graphKey"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moai_link"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/narrativeflow"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/narrativeflow/:graphKey"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/driftflow"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/driftflow/:graphKey"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moaiflow"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
                <Route
                    path="/moaiflow/:title"
                    element={
                        <DaoProvider>
                            <RiverTabs />
                        </DaoProvider>
                    }
                />
            </Routes>
            <Footer />
        </SnackbarProvider>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

export default App;
