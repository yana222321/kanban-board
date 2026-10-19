import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api';
import { apiErrorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import type { Project } from '../types';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = async () => {
    try {
      setProjects(await projectsApi.list());
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await projectsApi.create({ name, key: key.toUpperCase(), description });
      setOpen(false);
      setName('');
      setKey('');
      setDescription('');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Проекты
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            data-testid="create-project-button"
          >
            Новый проект
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {projects.length === 0 ? (
        <Typography color="text.secondary" data-testid="empty-projects">
          Пока нет проектов.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card data-testid={`project-card-${project.key}`}>
                <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Chip label={project.key} color="primary" size="small" />
                      <Typography variant="h6" fontWeight={600}>
                        {project.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" minHeight={40}>
                      {project.description || 'Без описания'}
                    </Typography>
                    <Box mt={1} display="flex" gap={1}>
                      <Chip label={`${project._count?.boards ?? 0} досок`} size="small" variant="outlined" />
                      <Chip
                        label={`${project._count?.members ?? 0} участников`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={onCreate}>
          <DialogTitle>Новый проект</DialogTitle>
          <DialogContent>
            <TextField
              label="Название"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ 'data-testid': 'project-name-input' }}
              required
            />
            <TextField
              label="Ключ (напр. PROJ)"
              fullWidth
              margin="normal"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              inputProps={{ 'data-testid': 'project-key-input' }}
              required
            />
            <TextField
              label="Описание"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" variant="contained" data-testid="project-submit">
              Создать
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
