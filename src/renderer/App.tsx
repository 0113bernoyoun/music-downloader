import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, Container, Typography, Paper } from '@mui/material'
import MusicNoteIcon from '@mui/icons-material/MusicNote'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
          }}
        >
          <Container maxWidth="md">
            <Paper
              elevation={8}
              sx={{
                padding: 4,
                textAlign: 'center',
                borderRadius: 3,
              }}
            >
              <Box sx={{ mb: 3 }}>
                <MusicNoteIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h3" component="h1" gutterBottom>
                  Music Downloader
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  YouTube 음악 다운로더
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="body1" paragraph>
                  YouTube와 다양한 플랫폼에서 음악을 다운로드하여
                </Typography>
                <Typography variant="body1" paragraph>
                  원하는 오디오 형식으로 변환할 수 있는 데스크톱 애플리케이션입니다.
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  개발 환경이 성공적으로 설정되었습니다! 🎉
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Phase 1.2: 빌드 시스템 및 개발 환경 구성 완료
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App