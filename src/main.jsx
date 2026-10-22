import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './i18n';
import './index.css';
import App from './App.jsx';
import { EditorNavigationGuard } from './shared/ui/EditorNavigationGuard';
import './shared/ui/AvatarFrame.css';
import './shared/ui/WorkspaceControls.css';
const queryClient = new QueryClient();
const router = createBrowserRouter([{ path: '*', element: <EditorNavigationGuard><App /></EditorNavigationGuard> }]);
const theme = createTheme({
    primaryColor: 'blue',
    fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
    fontFamilyMonospace: '"JetBrains Mono", Consolas, monospace',
    defaultRadius: 'sm',
});
createRoot(document.getElementById('root')).render(<StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router}/>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>);
