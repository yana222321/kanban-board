import api from './client';
import type {
  ActivityEntry,
  Attachment,
  AuthResponse,
  Board,
  BoardColumn,
  Card,
  Comment,
  Label,
  Project,
  ProjectMember,
  User,
} from '../types';

// ---- Auth ----
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
};

// ---- Users ----
export const usersApi = {
  list: (search?: string) =>
    api.get<{ users: User[] }>('/users', { params: { search } }).then((r) => r.data.users),
};

// ---- Projects ----
export const projectsApi = {
  list: (search?: string) =>
    api.get<{ projects: Project[] }>('/projects', { params: { search } }).then((r) => r.data.projects),
  get: (id: string) => api.get<{ project: Project }>(`/projects/${id}`).then((r) => r.data.project),
  create: (data: { name: string; key: string; description?: string }) =>
    api.post<{ project: Project }>('/projects', data).then((r) => r.data.project),
  update: (id: string, data: { name?: string; description?: string | null }) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data).then((r) => r.data.project),
  remove: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
  members: (id: string) =>
    api.get<{ members: ProjectMember[] }>(`/projects/${id}/members`).then((r) => r.data.members),
  addMember: (id: string, data: { email: string; role: string }) =>
    api.post(`/projects/${id}/members`, data).then((r) => r.data),
  labels: (id: string) =>
    api.get<{ labels: Label[] }>(`/projects/${id}/labels`).then((r) => r.data.labels),
  createLabel: (id: string, data: { name: string; color: string }) =>
    api.post<{ label: Label }>(`/projects/${id}/labels`, data).then((r) => r.data.label),
};

// ---- Boards & columns ----
export const boardsApi = {
  get: (id: string) => api.get<{ board: Board }>(`/boards/${id}`).then((r) => r.data.board),
  listByProject: (projectId: string) =>
    api.get<{ boards: Board[] }>(`/projects/${projectId}/boards`).then((r) => r.data.boards),
  create: (projectId: string, data: { name: string }) =>
    api.post<{ board: Board }>(`/projects/${projectId}/boards`, data).then((r) => r.data.board),
  createColumn: (boardId: string, data: { name: string; wipLimit?: number | null }) =>
    api.post<{ column: BoardColumn }>(`/boards/${boardId}/columns`, data).then((r) => r.data.column),
  updateColumn: (
    columnId: string,
    data: { name?: string; wipLimit?: number | null },
  ) => api.patch<{ column: BoardColumn }>(`/columns/${columnId}`, data).then((r) => r.data.column),
  deleteColumn: (columnId: string) => api.delete(`/columns/${columnId}`).then((r) => r.data),
  reorderColumns: (boardId: string, columnIds: string[]) =>
    api.patch(`/boards/${boardId}/columns/reorder`, { columnIds }).then((r) => r.data),
};

// ---- Cards ----
export interface CardFilters {
  search?: string;
  assigneeId?: string;
  priority?: string;
  labelId?: string;
}

export const cardsApi = {
  listByBoard: (boardId: string, filters: CardFilters = {}) =>
    api.get<{ cards: Card[] }>(`/boards/${boardId}/cards`, { params: filters }).then((r) => r.data.cards),
  get: (id: string) => api.get<{ card: Card }>(`/cards/${id}`).then((r) => r.data.card),
  create: (columnId: string, data: Partial<Card> & { title: string }) =>
    api.post<{ card: Card }>(`/columns/${columnId}/cards`, data).then((r) => r.data.card),
  update: (id: string, data: Partial<Card>) =>
    api.patch<{ card: Card }>(`/cards/${id}`, data).then((r) => r.data.card),
  remove: (id: string) => api.delete(`/cards/${id}`).then((r) => r.data),
  move: (id: string, columnId: string, position: number) =>
    api.patch<{ card: Card }>(`/cards/${id}/move`, { columnId, position }).then((r) => r.data.card),
  history: (id: string) =>
    api.get<{ history: ActivityEntry[] }>(`/cards/${id}/history`).then((r) => r.data.history),
  comments: (id: string) =>
    api.get<{ comments: Comment[] }>(`/cards/${id}/comments`).then((r) => r.data.comments),
  addComment: (id: string, body: string) =>
    api.post<{ comment: Comment }>(`/cards/${id}/comments`, { body }).then((r) => r.data.comment),
  attachments: (id: string) =>
    api.get<{ attachments: Attachment[] }>(`/cards/${id}/attachments`).then((r) => r.data.attachments),
  uploadAttachment: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ attachment: Attachment }>(`/cards/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.attachment);
  },
};
