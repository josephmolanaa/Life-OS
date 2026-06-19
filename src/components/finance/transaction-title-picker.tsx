'use client';

import { useMemo, useState } from 'react';

type Category = { id: string; name: string };

export function TransactionTitlePicker({ categories, placeholder }: { categories: Category[]; placeholder: string }) {
  const defaultCategory = categories[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategory?.id ?? '');
  const [note, setNote] = useState('');

  const selectedCategory = useMemo(() => categories.find((category) => category.id === selectedCategoryId), [categories, selectedCategoryId]);

  const handleSelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find((item) => item.id === categoryId);
    if (category) setNote(category.name);
  };

  return <>
    <label className="sepranField"><input name="note" placeholder={placeholder} value={note} onChange={(event) => setNote(event.target.value)}/><span aria-hidden="true">🎤</span></label>
    <div className="chipGroup">
      {categories.slice(0, 8).map((category) => <label className="categoryChip" key={category.id}>
        <input type="radio" name="category_id" value={category.id} required checked={selectedCategoryId === category.id} onChange={() => handleSelect(category.id)}/>
        <span>{category.name}</span>
      </label>)}
    </div>
    {selectedCategoryId && !note && <input type="hidden" name="note" value={selectedCategory?.name ?? ''}/>} 
  </>;
}
