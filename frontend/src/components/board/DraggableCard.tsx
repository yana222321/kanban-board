import { useDraggable } from '@dnd-kit/core';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { Event as EventIcon, Comment as CommentIcon } from '@mui/icons-material';
import type { Card, Priority } from '../../types';

const PRIORITY_TONE: Record<Priority, string> = {
  LOW: '#4d4d4d',
  MEDIUM: '#7a7a7a',
  HIGH: '#b8b8b8',
  URGENT: '#f5f5f4',
};

export default function DraggableCard({
  card,
  onClick,
}: {
  card: Card;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.6 : 1 }
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      data-testid={`card-${card.id}`}
      sx={{
        bgcolor: '#080808',
        border: '1px solid #2a2a2a',
        borderLeft: '3px solid #3a3a3a',
        borderRadius: 0,
        p: 1.5,
        mb: 1,
        cursor: 'grab',
        transition: 'border-color 120ms ease, background-color 120ms ease',
        '&:hover': {
          bgcolor: '#111111',
          borderColor: '#e7e5e4',
          borderLeftColor: '#e7e5e4',
        },
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {card.title}
      </Typography>
      {card.labels.length > 0 && (
        <Stack direction="row" spacing={0.5} mb={0.5} flexWrap="wrap" useFlexGap>
          {card.labels.map((label) => (
            <Chip
              key={label.id}
              label={label.name}
              size="small"
              sx={{ bgcolor: label.color, color: '#0a0a0a', height: 18, borderRadius: 0, fontWeight: 700 }}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          label={card.priority}
          size="small"
          variant="outlined"
          sx={{ borderColor: PRIORITY_TONE[card.priority], color: PRIORITY_TONE[card.priority], borderRadius: 0 }}
        />
        {card.dueDate && (
          <Stack direction="row" spacing={0.25} alignItems="center">
            <EventIcon fontSize="inherit" sx={{ color: '#6b6b6b' }} />
            <Typography variant="caption" color="text.secondary">
              {new Date(card.dueDate).toLocaleDateString()}
            </Typography>
          </Stack>
        )}
        {card._count && card._count.comments > 0 && (
          <Stack direction="row" spacing={0.25} alignItems="center">
            <CommentIcon fontSize="inherit" sx={{ color: '#6b6b6b' }} />
            <Typography variant="caption" color="text.secondary">
              {card._count.comments}
            </Typography>
          </Stack>
        )}
        {card.assignee && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {card.assignee.name}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
