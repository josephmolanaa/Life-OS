export type Todo = {
  id: string;
  user_id: string;
  label: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Contribution = {
  id: string;
  user_id: string;
  date: string;
  count: number;
  created_at?: string;
};
