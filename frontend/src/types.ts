export type Role = 'ADMIN' | 'MANAGER' | 'DEVELOPER';
export type MemberRole = 'MANAGER' | 'DEVELOPER' | 'VIEWER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Comment {
  id: string;
  body: string;
  authorId: string;
  author?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  columnId: string;
  position: number;
  priority: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
  assignee?: Pick<User, 'id' | 'name' | 'email'> | null;
  labels: Label[];
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  boardId: string;
  position: number;
  wipLimit: number | null;
  cards: Card[];
}

export interface Board {
  id: string;
  name: string;
  projectId: string;
  columns: BoardColumn[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  ownerId: string;
  owner?: Pick<User, 'id' | 'name' | 'email'>;
  boards?: Board[];
  members?: ProjectMember[];
  _count?: { boards: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt: string;
}
