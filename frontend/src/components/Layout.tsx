import { AppBar, Box, Button, Chip, Toolbar, Typography } from '@mui/material';
import { ViewKanban as ViewKanbanIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar>
          <ViewKanbanIcon color="primary" sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'text.primary', fontWeight: 700 }}
          >
            Kanban Board
          </Typography>
          {user && (
            <>
              <Chip label={user.name} sx={{ mr: 1 }} />
              <Chip label={user.role} color="primary" variant="outlined" sx={{ mr: 2 }} />
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                data-testid="logout-button"
              >
                Выйти
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" flexGrow={1} p={3}>
        <Outlet />
      </Box>
    </Box>
  );
}
