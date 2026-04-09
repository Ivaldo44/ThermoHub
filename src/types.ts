export interface Unit {
  id: number;
  name: string;
}

export interface Sector {
  id: number;
  name: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  sector_id: number;
  unit_id?: number;
  sector_name?: string;
  unit_name?: string;
  min_temp: number;
  max_temp: number;
  is_active: boolean;
  created_at: string;
}

export interface TemperatureLog {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  sector_name?: string;
  measured_temp: number;
  measured_at: string;
  notes: string;
  recorded_by: string;
  status: 'normal' | 'out_of_range';
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'operator' | 'viewer';
  sector_id?: number;
  sector_name?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export interface DashboardStats {
  totalLogsToday: { count: number };
  outOfRangeToday: { count: number };
  activeEquipment: { count: number };
  recentDeviations: TemperatureLog[];
}
