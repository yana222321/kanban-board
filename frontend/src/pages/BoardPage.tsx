import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { boardTheme } from '../theme';
import { Add as AddIcon } from '@mui/icons-material';
import ColumnView from '../components/board/ColumnView';
import CardDialog from '../components/board/CardDialog';
import { boardsApi, cardsApi, projectsApi } from '../api';
import { apiErrorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import type { Board, BoardColumn, Card, Label, Project, ProjectMember } from '../types';

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const [project, setProject] = useState<Project | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  const [cardDialog, setCardDialog] = useState<{ open: boolean; columnId: string; card: Card | null }>({
    open: false,
    columnId: '',
    card: null,
  });
  const [columnDialog, setColumnDialog] = useState<{
    open: boolean;
    column: BoardColumn | null;
    name: string;
    wip: string;
  }>({ open: false, column: null, name: '', wip: '' });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadBoard = useCallback(async (boardId: string) => {
    setBoard(await boardsApi.get(boardId));
  }, []);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [p, ls, ms] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.labels(projectId),
        projectsApi.members(projectId),
      ]);
      setProject(p);
      setLabels(ls);
      setMembers(ms);
      const boards = await boardsApi.listByProject(projectId);
      if (boards.length > 0) {
        await loadBoard(boards[0].id);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [projectId, loadBoard]);

  useEffect(() => {
    void load();
  }, [load]);

  const access = useMemo(() => {
    if (!project || !user) return { canManage: false, canContribute: false };
    let level: string;
    if (user.role === 'ADMIN') level = 'ADMIN';
    else if (project.ownerId === user.id) level = 'OWNER';
    else level = project.members?.find((m) => m.userId === user.id)?.role ?? 'VIEWER';
    return {
      canManage: ['ADMIN', 'OWNER', 'MANAGER'].includes(level),
      canContribute: ['ADMIN', 'OWNER', 'MANAGER', 'DEVELOPER'].includes(level),
    };
  }, [project, user]);

  const visibleCards = useCallback(
    (column: BoardColumn): Card[] =>
      column.cards.filter((card) => {
        if (search && !card.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (priorityFilter && card.priority !== priorityFilter) return false;
        if (assigneeFilter && card.assigneeId !== assigneeFilter) return false;
        return true;
      }),
    [search, priorityFilter, assigneeFilter],
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !board) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    let targetColumnId: string;
    let position: number;
    if (overId.startsWith('col-')) {
      targetColumnId = overId.slice(4);
      const col = board.columns.find((c) => c.id === targetColumnId);
      position = col ? col.cards.length : 0;
    } else {
      const targetCol = board.columns.find((c) => c.cards.some((card) => card.id === overId));
      if (!targetCol) return;
      targetColumnId = targetCol.id;
      position = targetCol.cards.findIndex((c) => c.id === overId);
    }

    try {
      await cardsApi.move(activeId, targetColumnId, position);
      await loadBoard(board.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const saveColumn = async () => {
    if (!board || !columnDialog.name.trim()) return;
    const wip = columnDialog.wip ? Number(columnDialog.wip) : null;
    try {
      if (columnDialog.column) {
        await boardsApi.updateColumn(columnDialog.column.id, { name: columnDialog.name, wipLimit: wip });
      } else {
        await boardsApi.createColumn(board.id, { name: columnDialog.name, wipLimit: wip });
      }
      setColumnDialog({ open: false, column: null, name: '', wip: '' });
      await loadBoard(board.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const deleteColumn = async () => {
    if (!board || !columnDialog.column) return;
    if (!window.confirm(`Удалить колонку "${columnDialog.column.name}"?`)) return;
    await boardsApi.deleteColumn(columnDialog.column.id);
    setColumnDialog({ open: false, column: null, name: '', wip: '' });
    await loadBoard(board.id);
  };

  if (!project) {
    return <Typography>Загрузка...</Typography>;
  }

  return (
    <ThemeProvider theme={boardTheme}>
      <Box
        sx={{
          bgcolor: 'background.default',
          color: 'text.primary',
          p: { xs: 1.5, md: 2.5 },
          minHeight: '72vh',
          border: '1px solid #1c1c1c',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Chip label={project.key} variant="outlined" sx={{ borderColor: '#e7e5e4', color: '#e7e5e4' }} />
          <Typography variant="h5" data-testid="project-title">
            {project.name}
          </Typography>
        </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            bgcolor: '#111111',
            color: '#f5f5f4',
            border: '1px solid #3a3a3a',
            borderRadius: 0,
            '& .MuiAlert-icon': { color: '#e7e5e4' },
          }}
          onClose={() => setError(null)}
          data-testid="board-error"
        >
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField
          size="small"
          placeholder="Поиск карточек"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ 'data-testid': 'search-input' }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Приоритет</InputLabel>
          <Select
            label="Приоритет"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <MenuItem value="">Все</MenuItem>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Исполнитель</InputLabel>
          <Select
            label="Исполнитель"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <MenuItem value="">Все</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.userId} value={m.userId}>
                {m.user?.name ?? m.userId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {access.canManage && board && (
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setColumnDialog({ open: true, column: null, name: '', wip: '' })}
            data-testid="add-column-button"
            sx={{ borderColor: '#3f3f3f', color: '#e7e5e4', '&:hover': { borderColor: '#e7e5e4' } }}
          >
            Колонка
          </Button>
        )}
      </Stack>

      {board && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <Box display="flex" gap={2} alignItems="flex-start" overflow="auto" pb={2}>
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={visibleCards(column)}
                canContribute={access.canContribute}
                canManage={access.canManage}
                onAddCard={() => setCardDialog({ open: true, columnId: column.id, card: null })}
                onCardClick={(card) => setCardDialog({ open: true, columnId: column.id, card })}
                onEditColumn={() =>
                  setColumnDialog({
                    open: true,
                    column,
                    name: column.name,
                    wip: column.wipLimit ? String(column.wipLimit) : '',
                  })
                }
              />
            ))}
          </Box>
        </DndContext>
      )}

      <CardDialog
        open={cardDialog.open}
        onClose={() => setCardDialog((s) => ({ ...s, open: false }))}
        columnId={cardDialog.columnId}
        card={cardDialog.card}
        labels={labels}
        members={members}
        canContribute={access.canContribute}
        onSaved={() => board && loadBoard(board.id)}
      />

      <Dialog
        open={columnDialog.open}
        onClose={() => setColumnDialog((s) => ({ ...s, open: false }))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{columnDialog.column ? 'Колонка' : 'Новая колонка'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Название"
            fullWidth
            margin="normal"
            value={columnDialog.name}
            onChange={(e) => setColumnDialog((s) => ({ ...s, name: e.target.value }))}
            inputProps={{ 'data-testid': 'column-name-input' }}
          />
          <TextField
            label="WIP-лимит (пусто = без лимита)"
            type="number"
            fullWidth
            margin="normal"
            value={columnDialog.wip}
            onChange={(e) => setColumnDialog((s) => ({ ...s, wip: e.target.value }))}
            inputProps={{ 'data-testid': 'column-wip-input' }}
          />
        </DialogContent>
        <DialogActions>
          {columnDialog.column && access.canManage && (
            <Button color="error" onClick={deleteColumn}>
              Удалить
            </Button>
          )}
          <Box flexGrow={1} />
          <Button onClick={() => setColumnDialog((s) => ({ ...s, open: false }))}>Отмена</Button>
          <Button variant="contained" onClick={saveColumn} data-testid="column-save">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </ThemeProvider>
  );
}
