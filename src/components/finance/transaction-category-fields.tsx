"use client";

import { useState } from 'react';

export function TransactionCategoryFields({ categories, type, categoryId, lang }: { categories: { id: string; name: string; type: string }[]; type: 'income' | 'expense'; categoryId: string | null; lang: 'id' | 'en' }) {
  const [selectedType, setSelectedType] = useState(type);
  const [selectedCategory, setSelectedCategory] = useState(categoryId ?? '');
  return <>
    <label><span>{lang === 'id' ? 'Jenis transaksi' : 'Transaction type'}</span><select className="input" name="type" value={selectedType} onChange={event => {
      const nextType = event.target.value as 'income' | 'expense';
      setSelectedType(nextType);
      setSelectedCategory(categories.find(category => category.type === nextType)?.id ?? '');
    }}><option value="expense">{lang === 'id' ? 'Pengeluaran' : 'Expense'}</option><option value="income">{lang === 'id' ? 'Pemasukan' : 'Income'}</option></select></label>
    <label><span>{lang === 'id' ? 'Kategori' : 'Category'} <small className="muted">({lang === 'id' ? 'opsional' : 'optional'})</small></span><select className="input" name="category_id" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>
      <option value="">{lang === 'id' ? 'Tanpa kategori' : 'No category'}</option>
      {categories.filter(category => category.type === selectedType).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
  </>;
}
