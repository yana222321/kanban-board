import { useDroppable } from '@dnd-kit/core';
import { Box, Button, Chip, IconButton, Typography } from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon } from '@mui/icons-material';
import DraggableCard from './DraggableCard';
import type { BoardColumn, Card } from '../../types';

export default function ColumnView({
  column,
  cards,
  canContribute,
  canManage,
  onAddCard,
  onCardClick,
  onEditColumn,
}: {
  column: BoardColumn;
  cards: Card[];
  canContribute: boolean;
  canManage: boolean;
  onAddCard: () => void;
  onCardClick: (card: Card) => void;
  onEditColumn: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });
  const atLimit = column.wipLimit !== null && cards.length >= column.wipLimit;

  return (
    <Box
      ref={setNodeRef}
      data-testid={`column-${column.name}`}
      sx={{
        width: 300,
        minWidth: 300,
        bgcolor: isOver ? '#1a1a1a' : '#0f0f0f',
        border: isOver ? '1px solid #e7e5e4' : '1px solid #262626',
        borderRadius: 0,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        mb={1.5}
        pb={1}
        sx={{ borderBottom: '1px solid #262626' }}
      >
        <Typography variant="subtitle1">{column.name}</Typography>
        <Chip
          label={column.wipLimit !== null ? `${cards.length}/${column.wipLimit}` : `${cards.length}`}
          size="small"
          variant="outlined"
          data-testid={`wip-${column.name}`}
          sx={{
            ml: 'auto',
            borderColor: atLimit ? '#e7e5e4' : '#3f3f3f',
            color: atLimit ? '#e7e5e4' : '#8a8a8a',
          }}
        />
        {canManage && (
          <IconButton
            size="small"
            sx={{ color: '#6b6b6b', '&:hover': { color: '#e7e5e4' } }}
            onClick={onEditColumn}
            aria-label="edit column"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box flexGrow={1} minHeight={40}>
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </Box>

      {canContribute && (
        <Button
          startIcon={<AddIcon />}
          onClick={onAddCard}
          size="small"
          data-testid={`add-card-${column.name}`}
          sx={{
            justifyContent: 'flex-start',
            mt: 1,
            color: '#8a8a8a',
            borderTop: '1px solid #262626',
            borderRadius: 0,
            pt: 1,
            '&:hover': { color: '#e7e5e4', bgcolor: 'transparent' },
          }}
        >
          Добавить карточку
        </Button>
      )}
    </Box>
  );
}
