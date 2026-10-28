'use client';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePrivacy } from '@/components/finance/privacy-context';
import { formatMoney } from '@/lib/finance';

const chartText = '#A8A69E';
const chartGrid = 'rgba(168,166,158,.18)';

function compact(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch { return formatMoney(value, currency); }
}

function tooltip(value: unknown, currency: string) {
  return formatMoney(Number(Array.isArray(value) ? value[0] : (value ?? 0)), currency);
}

export function CashflowChart({ data, currency = 'IDR' }: { data: { name: string; income?: number; expense?: number; net?: number }[]; currency?: string }) {
  const { hidden } = usePrivacy();
  if (hidden) return <div className="chartFrame chartHidden" role="img" aria-label="Chart values hidden">••••••</div>;
  return <div className="chartFrame"><ResponsiveContainer><BarChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 0 }}><XAxis dataKey="name" tick={{ fill: chartText }} axisLine={{ stroke: chartGrid }} tickLine={false}/><YAxis width={72} tick={{ fill: chartText }} tickFormatter={(value) => compact(value, currency)} axisLine={{ stroke: chartGrid }} tickLine={false}/><Tooltip formatter={(value) => tooltip(value, currency)} labelStyle={{ color: '#1A1917' }}/><Bar dataKey="income" name="Income" fill="#2f9569" radius={[4, 4, 0, 0]}/><Bar dataKey="expense" name="Expense" fill="#d45066" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div>;
}
export function ExpensePie({ data, currency = 'IDR', lang = 'en', donut = false }: { data: { name: string; value: number; color?: string }[]; currency?: string; lang?: 'en' | 'id'; donut?: boolean }) {
  const { hidden } = usePrivacy();
  if (hidden) return <div className="chartFrame chartHidden" role="img" aria-label="Chart values hidden">••••••</div>;
  const total = data.reduce((sum, item) => sum + Number(item.value), 0);
  return <div className="chartFrame"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={donut ? 58 : 0} outerRadius={90} paddingAngle={donut ? 2 : 0}>{data.map((d,i)=><Cell key={d.name} fill={d.color ?? ['#38bdf8','#fb7185','#22c55e','#f59e0b'][i%4]}/>)}</Pie>{donut && <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)"><tspan x="50%" dy="0" fontSize="12">{lang === 'id' ? 'Total' : 'Total'}</tspan><tspan x="50%" dy="22" fontSize="16" fontWeight="700">{formatMoney(total, currency)}</tspan></text>}<Tooltip formatter={(value) => tooltip(value, currency)} labelStyle={{ color: '#1A1917' }}/></PieChart></ResponsiveContainer></div>;
}
export function TrendLine({ data, currency = 'IDR' }: { data: { name: string; value: number }[]; currency?: string; lang?: 'en' | 'id' }) {
  const { hidden } = usePrivacy();
  if (hidden) return <div className="chartFrame chartHidden" role="img" aria-label="Chart values hidden">••••••</div>;
  return <div className="chartFrame"><ResponsiveContainer><LineChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 0 }}><XAxis dataKey="name" tick={{ fill: chartText }} axisLine={{ stroke: chartGrid }} tickLine={false}/><YAxis width={72} tick={{ fill: chartText }} tickFormatter={(value) => compact(value, currency)} axisLine={{ stroke: chartGrid }} tickLine={false}/><Tooltip formatter={(value) => tooltip(value, currency)} labelStyle={{ color: '#1A1917' }}/><Line dataKey="value" stroke="var(--accent, #1A1917)" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>;
}
