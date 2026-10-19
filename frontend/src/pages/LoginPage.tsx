import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearError, loginThunk } from '../store/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('manager@kanban.local');
  const [password, setPassword] = useState('Manager123!');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginThunk({ email, password }));
    if (loginThunk.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Card sx={{ width: 400 }} elevation={3}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Вход
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="login-error">
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  dispatch(clearError());
                }}
                inputProps={{ 'data-testid': 'email-input' }}
                fullWidth
                required
              />
              <TextField
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  dispatch(clearError());
                }}
                inputProps={{ 'data-testid': 'password-input' }}
                fullWidth
                required
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={status === 'loading'}
                data-testid="login-submit"
              >
                {status === 'loading' ? 'Вход...' : 'Войти'}
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" mt={2}>
            Нет аккаунта?{' '}
            <Link component={RouterLink} to="/register">
              Зарегистрироваться
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
