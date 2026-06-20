'use client';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const compactRupiah = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const chartText = '#A8A69E';
const chartGrid = 'rgba(168,166,158,.18)';

function formatAxis(value: number) {
  return `Rp ${compactRupiah.format(value)}`;
}

function formatTooltip(value: unknown) {
  return rupiah.format(Number(Array.isArray(value) ? value[0] : (value ?? 0)));
}

export function CashflowChart({ data }: { data: { name: string; income?: number; expense?: number; net?: number }[] }) {
  return <div className="chartFrame"><ResponsiveContainer><BarChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 0 }}><XAxis dataKey="name" tick={{ fill: chartText }} axisLine={{ stroke: chartGrid }} tickLine={false}/><YAxis width={72} tick={{ fill: chartText }} tickFormatter={formatAxis} axisLine={{ stroke: chartGrid }} tickLine={false}/><Tooltip formatter={formatTooltip} labelStyle={{ color: '#1A1917' }}/><Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]}/><Bar dataKey="expense" fill="#fb7185" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div>;
}
export function ExpensePie({ data }: { data: { name: string; value: number; color?: string }[] }) {
  return <div className="chartFrame"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>{data.map((d,i)=><Cell key={d.name} fill={d.color ?? ['#38bdf8','#fb7185','#22c55e','#f59e0b'][i%4]}/>)}</Pie><Tooltip formatter={formatTooltip} labelStyle={{ color: '#1A1917' }}/></PieChart></ResponsiveContainer></div>;
}
export function TrendLine({ data }: { data: { name: string; value: number }[] }) {
  return <div className="chartFrame"><ResponsiveContainer><LineChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 0 }}><XAxis dataKey="name" tick={{ fill: chartText }} axisLine={{ stroke: chartGrid }} tickLine={false}/><YAxis width={72} tick={{ fill: chartText }} tickFormatter={formatAxis} axisLine={{ stroke: chartGrid }} tickLine={false}/><Tooltip formatter={formatTooltip} labelStyle={{ color: '#1A1917' }}/><Line dataKey="value" stroke="#38bdf8" strokeWidth={3}/></LineChart></ResponsiveContainer></div>;
}
