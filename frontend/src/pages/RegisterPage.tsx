import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearError, registerThunk } from '../store/authSlice';

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await dispatch(registerThunk({ email, name, password }));
    if (registerThunk.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Card sx={{ width: 400 }} elevation={3}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Регистрация
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="register-error">
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ 'data-testid': 'name-input' }}
                fullWidth
                required
              />
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
                label="Пароль (мин. 8 символов)"
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
                data-testid="register-submit"
              >
                {status === 'loading' ? 'Создание...' : 'Зарегистрироваться'}
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" mt={2}>
            Уже есть аккаунт?{' '}
            <Link component={RouterLink} to="/login">
              Войти
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
