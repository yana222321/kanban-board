import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { cardsApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import type {
  ActivityEntry,
  Attachment,
  Card,
  Comment,
  Label,
  Priority,
  ProjectMember,
} from '../../types';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface Props {
  open: boolean;
  onClose: () => void;
  columnId: string;
  card: Card | null;
  labels: Label[];
  members: ProjectMember[];
  canContribute: boolean;
  onSaved: () => void;
}

export default function CardDialog({
  open,
  onClose,
  columnId,
  card,
  labels,
  members,
  canContribute,
  onSaved,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');

  const isEdit = Boolean(card);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
      setPriority(card.priority);
      setAssigneeId(card.assigneeId ?? '');
      setDueDate(card.dueDate ? card.dueDate.slice(0, 10) : '');
      setLabelIds(card.labels.map((l) => l.id));
      void refreshDetails(card.id);
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId('');
      setDueDate('');
      setLabelIds([]);
      setComments([]);
      setHistory([]);
      setAttachments([]);
    }
  }, [open, card]);

  const refreshDetails = async (cardId: string) => {
    const [c, h, a] = await Promise.all([
      cardsApi.comments(cardId),
      cardsApi.history(cardId),
      cardsApi.attachments(cardId),
    ]);
    setComments(c);
    setHistory(h);
    setAttachments(a);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labelIds,
      };
      if (card) {
        await cardsApi.update(card.id, payload);
      } else {
        await cardsApi.create(columnId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!card) return;
    if (!window.confirm('Удалить карточку?')) return;
    await cardsApi.remove(card.id);
    onSaved();
    onClose();
  };

  const onAddComment = async () => {
    if (!card || !newComment.trim()) return;
    try {
      await cardsApi.addComment(card.id, newComment.trim());
      setNewComment('');
      await refreshDetails(card.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const onUpload = async (file: File) => {
    if (!card) return;
    try {
      await cardsApi.uploadAttachment(card.id, file);
      await refreshDetails(card.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={onSubmit}>
        <DialogTitle>{isEdit ? 'Карточка' : 'Новая карточка'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2} mt={1}>
            <TextField
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canContribute}
              inputProps={{ 'data-testid': 'card-title-input' }}
              required
              fullWidth
            />
            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canContribute}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  label="Приоритет"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  disabled={!canContribute}
                >
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  label="Исполнитель"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={!canContribute}
                >
                  <MenuItem value="">—</MenuItem>
                  {members.map((m) => (
                    <MenuItem key={m.userId} value={m.userId}>
                      {m.user?.name ?? m.userId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Дедлайн"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canContribute}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Метки
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {labels.map((label) => (
                  <FormControlLabel
                    key={label.id}
                    control={
                      <Checkbox
                        checked={labelIds.includes(label.id)}
                        disabled={!canContribute}
                        onChange={(e) =>
                          setLabelIds((prev) =>
                            e.target.checked ? [...prev, label.id] : prev.filter((id) => id !== label.id),
                          )
                        }
                      />
                    }
                    label={<Chip label={label.name} size="small" sx={{ bgcolor: label.color, color: '#fff' }} />}
                  />
                ))}
              </Stack>
            </Box>

            {isEdit && card && (
              <>
                <Divider />
                <Typography variant="subtitle1" fontWeight={600}>
                  Комментарии
                </Typography>
                <List dense>
                  {comments.map((c) => (
                    <ListItem key={c.id} disableGutters>
                      <ListItemText
                        primary={c.body}
                        secondary={`${c.author?.name ?? ''} · ${new Date(c.createdAt).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                  {comments.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Комментариев пока нет.
                    </Typography>
                  )}
                </List>
                {canContribute && (
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      placeholder="Добавить комментарий"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      fullWidth
                      inputProps={{ 'data-testid': 'comment-input' }}
                    />
                    <Button onClick={onAddComment} data-testid="add-comment-button">
                      Отправить
                    </Button>
                  </Stack>
                )}

                <Divider />
                <Typography variant="subtitle1" fontWeight={600}>
                  Вложения
                </Typography>
                <List dense>
                  {attachments.map((a) => (
                    <ListItem key={a.id} disableGutters>
                      <ListItemText primary={a.filename} secondary={`${(a.size / 1024).toFixed(1)} KB`} />
                    </ListItem>
                  ))}
                  {attachments.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Вложений нет.
                    </Typography>
                  )}
                </List>
                {canContribute && (
                  <Button component="label" startIcon={<AttachFileIcon />} size="small">
                    Прикрепить файл
                    <input
                      type="file"
                      hidden
                      data-testid="attachment-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(file);
                      }}
                    />
                  </Button>
                )}

                <Divider />
                <Typography variant="subtitle1" fontWeight={600}>
                  История
                </Typography>
                <List dense>
                  {history.map((h) => (
                    <ListItem key={h.id} disableGutters>
                      <ListItemText
                        primary={`${h.action} · ${h.entity}${h.field ? ` (${h.field})` : ''}`}
                        secondary={`${h.user?.name ?? ''} · ${new Date(h.createdAt).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {isEdit && canContribute && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete} data-testid="delete-card">
              Удалить
            </Button>
          )}
          <Box flexGrow={1} />
          <Button onClick={onClose}>Отмена</Button>
          {canContribute && (
            <Button type="submit" variant="contained" disabled={saving} data-testid="card-save">
              Сохранить
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
