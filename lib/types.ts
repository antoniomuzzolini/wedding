export type InvitationType = 'full' | 'evening';
export type ResponseStatus = 'pending' | 'confirmed' | 'declined';
export type MenuType = 'adulto' | 'bambino' | 'neonato';

export interface Guest {
  id: number;
  name: string;
  surname: string;
  email: string | null;
  family_id: number | null;
  invitation_type: InvitationType;
  response_status: ResponseStatus;
  response_date: string | null;
  menu_type: MenuType | null;
  dietary_requirements: string | null;
  table_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingTable {
  id: number;
  name: string;
  capacity: number;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface GuestTag {
  guest_id: number;
  tag_id: number;
}

export interface GuestInput {
  name: string;
  surname: string;
  invitation_type: InvitationType;
  family_id?: number | null;
}

export interface GuestResponse {
  response_status: ResponseStatus;
  menu_type?: MenuType;
  dietary_requirements?: string;
}

export interface FamilyMemberResponse {
  guest_id: number;
  response_status: ResponseStatus;
  menu_type?: MenuType;
  dietary_requirements?: string;
}
