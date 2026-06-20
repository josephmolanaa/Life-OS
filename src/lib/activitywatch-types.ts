export type ActivityRule = {
  id: string;
  user_id: string;
  match_type: 'app' | 'title';
  match_value: string;
  display_name: string;
  category: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ActivityWatchItem = {
  app: string;
  window: string;
  minutes: number;
  started: string;
};

export type ActivityWatchDisplayItem = ActivityWatchItem & {
  display_name: string;
  category: string;
};
