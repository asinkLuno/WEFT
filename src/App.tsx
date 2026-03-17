import {
    BrowserRouter as Router,
    Route,
    Routes,
    Navigate,
} from 'react-router-dom';
import Home from './components/Home';
import RiverTabs from './components/RiverTabs';
import Footer from './components/Footer';
import React from 'react';
import { Toaster } from '@/components/ui/sonner';

const AppContent: React.FC = () => {
    return (
        <div className="flex min-h-screen flex-col">
            <Toaster />
            <main className="flex-grow">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route
                        path="/tabs"
                        element={<Navigate to="/intro" replace />}
                    />
                    {/* Dynamic routes for all tabs */}
                    <Route path="/:tab" element={<RiverTabs />} />
                    <Route path="/:tab/:id" element={<RiverTabs />} />
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
