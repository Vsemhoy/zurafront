import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './i18n'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()
const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", Consolas, monospace',
  defaultRadius: 'sm',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
