import type { ActivityRule, ActivityWatchItem, ActivityWatchDisplayItem } from './activitywatch-types';

export function applyActivityRules(items: ActivityWatchItem[], rules: ActivityRule[]): ActivityWatchDisplayItem[] {
  return items.map((item) => {
    const matched = rules.find((rule) => {
      if (!rule.is_active) return false;
      if (rule.match_type === 'app') return item.app.toLowerCase().includes(rule.match_value.toLowerCase());
      return item.window.toLowerCase().includes(rule.match_value.toLowerCase());
    });

    return {
      ...item,
      display_name: matched?.display_name ?? item.app,
      category: matched?.category ?? 'uncategorized',
    };
  });
}
