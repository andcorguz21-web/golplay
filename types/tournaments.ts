// types/tournaments.ts
// Tipos compartidos para el módulo de torneos.
// Importá desde acá en TODAS las páginas y componentes de torneos.

// =====================================================
// ENUMS / STATUS
// =====================================================

export type TournamentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'FULL'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED';

export type TeamStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED';

export type MatchStatus =
  | 'SCHEDULED'
  | 'FINISHED'
  | 'CANCELLED';

export type SportType =
  | 'futbol5'
  | 'futbol7'
  | 'futbol11'
  | 'padel'
  | 'otro';

export type TournamentFormat =
  | 'manual'
  | 'knockout'
  | 'groups'
  | 'league';

// =====================================================
// LABELS (para mostrar en UI)
// =====================================================

export const SPORT_LABEL: Record<SportType, string> = {
  futbol5: 'Fútbol 5',
  futbol7: 'Fútbol 7',
  futbol11: 'Fútbol 11',
  padel: 'Pádel',
  otro: 'Otro',
};

export const FORMAT_LABEL: Record<TournamentFormat, string> = {
  manual: 'Manual',
  knockout: 'Eliminación directa',
  groups: 'Grupos',
  league: 'Liga (todos contra todos)',
};

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: 'Borrador',
  OPEN: 'Inscripciones abiertas',
  FULL: 'Lleno',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
};

// =====================================================
// MODELOS DE BASE DE DATOS
// =====================================================

/**
 * Jugador dentro del array `players` (JSONB) de tournament_teams.
 * Sin tabla aparte porque en MVP no necesitamos stats individuales.
 */
export type TeamPlayer = {
  name: string;
  cedula?: string;
  position?: string;
};

/**
 * Torneo. Refleja la tabla `tournaments`.
 * - Si is_external = true: complex_id es null y venue_* tienen datos.
 * - Si is_external = false: complex_id apunta a un complejo y venue_* son null.
 */
export type Tournament = {
  id: number;
  complex_id: number | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  is_external: boolean;
  managed_by: string;
  slug: string;
  name: string;
  description: string | null;
  rules: string | null;
  sport_type: SportType;
  format: TournamentFormat;
  start_date: string;       // ISO date 'YYYY-MM-DD'
  end_date: string | null;
  max_teams: number;
  price_per_team: number;
  cover_image_url: string | null;
  status: TournamentStatus;
  sinpe_phone: string | null;
  sinpe_holder: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Equipo inscrito en un torneo.
 */
export type TournamentTeam = {
  id: number;
  tournament_id: number;
  team_name: string;
  captain_name: string;
  captain_phone: string;
  captain_email: string | null;
  players: TeamPlayer[];
  status: TeamStatus;
  payment_reference: string | null;
  payment_proof_url: string | null;
  payment_confirmed_at: string | null;
  payment_confirmed_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Partido de un torneo.
 * team_a/team_b pueden ser FK a tournament_teams o labels libres
 * cuando todavía no se sabe el equipo (ej: "Ganador SF1").
 */
export type TournamentMatch = {
  id: number;
  tournament_id: number;
  round_label: string | null;
  team_a_id: number | null;
  team_b_id: number | null;
  team_a_label: string | null;
  team_b_label: string | null;
  scheduled_at: string | null;
  field_id: number | null;
  field_label: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_team_id: number | null;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// =====================================================
// MODELOS EXTENDIDOS (con relaciones para listados)
// =====================================================

/**
 * Tournament + datos derivados que usamos en cards/listados.
 */
export type TournamentWithMeta = Tournament & {
  complex_name: string | null;
  confirmed_count: number;
  pending_count: number;
};

// =====================================================
// PAYLOADS DE FORMULARIOS
// =====================================================

/**
 * Lo que se envía al crear un torneo desde el form.
 * Lo dejo separado del modelo Tournament para no arrastrar
 * id/created_at/etc. en los inserts.
 */
export type TournamentCreatePayload = {
  // Modo
  is_external: boolean;
  complex_id: number | null;

  // Datos del venue (solo si is_external)
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_lat: number | null;
  venue_lng: number | null;

  // Datos del torneo
  managed_by: string;
  slug: string;
  name: string;
  description: string | null;
  rules: string | null;
  sport_type: SportType;
  format: TournamentFormat;
  start_date: string;
  end_date: string | null;
  max_teams: number;
  price_per_team: number;
  cover_image_url: string | null;
  status: TournamentStatus;

  // SINPE
  sinpe_phone: string | null;
  sinpe_holder: string | null;
  contact_phone: string | null;
};

/**
 * Lo que se envía al inscribir un equipo desde el público.
 */
export type TeamRegistrationPayload = {
  tournament_id: number;
  team_name: string;
  captain_name: string;
  captain_phone: string;
  captain_email: string | null;
  players: TeamPlayer[];
  status: 'PENDING_PAYMENT';
  payment_reference: string | null;
  payment_proof_url: string | null;
};

// =====================================================
// HELPERS DE STATUS (para badges)
// =====================================================

export type StatusMeta = {
  label: string;
  color: string;
  bg: string;
};

export const TOURNAMENT_STATUS_META: Record<TournamentStatus, StatusMeta> = {
  DRAFT:       { label: 'Borrador',               color: '#A8A29E', bg: '#2A2D30' },
  OPEN:        { label: 'Inscripciones abiertas', color: '#4ade80', bg: 'rgba(22,163,74,0.15)' },
  FULL:        { label: 'Lleno',                  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  IN_PROGRESS: { label: 'En curso',               color: '#4ade80', bg: 'rgba(22,163,74,0.15)' },
  FINISHED:    { label: 'Finalizado',             color: '#A8A29E', bg: '#2A2D30' },
  CANCELLED:   { label: 'Cancelado',              color: '#DC2626', bg: 'rgba(220,38,38,0.15)' },
};

export const TEAM_STATUS_META: Record<TeamStatus, StatusMeta> = {
  PENDING_PAYMENT: { label: 'Pendiente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  CONFIRMED:       { label: 'Confirmado', color: '#4ade80', bg: 'rgba(22,163,74,0.15)' },
  CANCELLED:       { label: 'Cancelado',  color: '#DC2626', bg: 'rgba(220,38,38,0.15)' },
};