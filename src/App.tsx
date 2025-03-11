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

import { Toaster } from '@/components/ui/sonner';

const AppContent: React.FC = () => {
    return (
            <div className="flex flex-col min-h-screen">
                        <Toaster />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                            path="/tabs"
                            element={<Navigate to="/intro" replace />}
                        />
                        <Route
                            path="/intro"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moai"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moai/:id"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moai_link/:graphKey"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moai_link"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/narrativeflow"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/narrativeflow/:graphKey"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/driftflow"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/driftflow/:graphKey"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moaiflow"
                            element={
                                <RiverTabs />
                            }
                        />
                        <Route
                            path="/moaiflow/:title"
                            element={
                                <RiverTabs />
                            }
                        />
                    </Routes>
                </main>
                <Footer />
            </div>
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
