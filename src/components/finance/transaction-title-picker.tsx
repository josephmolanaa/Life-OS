type Category = { id: string; name: string };

export function TransactionTitlePicker({ categories, placeholder, label = 'Category', emptyLabel = 'No category' }: { categories: Category[]; placeholder: string; label?: string; emptyLabel?: string }) {
  return <><label><span>{label} <small className="muted">(optional)</small></span><select className="input" name="category_id" defaultValue="">
    <option value="">{emptyLabel}</option>
    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
  </select></label><label><span>{placeholder}</span><textarea className="input" name="note" rows={3}/></label></>;
}
