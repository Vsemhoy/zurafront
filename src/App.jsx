import './App.css';
import { useEffect } from 'react';
import { AppRouter } from './app/AppRouter';
import { loadOptionalFonts } from './shared/ui/optionalFonts';
export default function App() {
    useEffect(() => { loadOptionalFonts(document); }, []);
    return <AppRouter />;
}
