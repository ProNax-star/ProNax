/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown, Tag, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

type Category = {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  color_hex: string | null;
  sort_order: number;
  is_active: boolean;
};

export function CategoriesTab() {
  const [rows, setRows] = useState<Category[] | null>(null);
  const [newRow, setNewRow] = useState({ slug: '', label: '', color_hex: '#3b82f6' });
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, key: keyof Category, value: Category[keyof Category]) => {
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, [key]: value } : x)) ?? null);
  };

  const saveRow = async (row: Category) => {
    setSavingId(row.id);
    const { error } = await supabase.from('categories').update({
      label: row.label,
      slug: row.slug,
      color_hex: row.color_hex,
      is_active: row.is_active,
      sort_order: row.sort_order,
    }).eq('id', row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success('Saved');
  };

  const del = async (row: Category) => {
    if (!confirm(`Delete category "${row.label}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const add = async () => {
    if (!newRow.slug.trim() || !newRow.label.trim()) return toast.error('slug + label required');
    const max = Math.max(0, ...(rows ?? []).map((r) => r.sort_order));
    const { error } = await supabase.from('categories').insert({
      slug: newRow.slug.trim().toLowerCase(),
      label: newRow.label.trim(),
      color_hex: newRow.color_hex,
      sort_order: max + 10,
    });
    if (error) return toast.error(error.message);
    setNewRow({ slug: '', label: '', color_hex: '#3b82f6' });
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    if (!rows) return;
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[idx], b = rows[j];
    const arr = [...rows];
    arr[idx] = { ...a, sort_order: b.sort_order };
    arr[j] = { ...b, sort_order: a.sort_order };
    setRows(arr);
    await Promise.all([
      supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
  };

  if (!rows) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Tag className="w-5 h-5 text-blue-400" /> Categories</h2>
          <p className="text-xs text-slate-400">Add, reorder, or hide the categories users can pick from when uploading.</p>
        </div>
      </div>

      {/* Add new */}
      <div
        className="rounded-2xl p-4 border backdrop-blur-xl grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2"
        style={{ background: 'rgba(10,15,28,0.7)', borderColor: 'rgba(59,130,246,0.18)' }}
      >
        <input placeholder="slug (e.g. cooking)" value={newRow.slug} onChange={(e) => setNewRow({ ...newRow, slug: e.target.value })} className={inputCls} />
        <input placeholder="Label (e.g. Cooking)" value={newRow.label} onChange={(e) => setNewRow({ ...newRow, label: e.target.value })} className={inputCls} />
        <input type="color" value={newRow.color_hex} onChange={(e) => setNewRow({ ...newRow, color_hex: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
        <button
          onClick={add}
          className="h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 text-white"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 0 20px -6px #3b82f6' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden backdrop-blur-xl"
        style={{ background: 'rgba(10,15,28,0.6)', borderColor: 'rgba(59,130,246,0.15)' }}
      >
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5">
          <span>Color</span>
          <span>Slug</span>
          <span>Label</span>
          <span>Order</span>
          <span>Active</span>
          <span className="text-right">Actions</span>
        </div>
        <AnimatePresence initial={false}>
          {rows.map((r, idx) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-2 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-blue-500/5"
            >
              <div className="flex items-center gap-2">
                <input type="color" value={r.color_hex ?? '#3b82f6'} onChange={(e) => patch(r.id, 'color_hex', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent" />
              </div>
              <input value={r.slug} onChange={(e) => patch(r.id, 'slug', e.target.value)} className={inputCls} />
              <input value={r.label} onChange={(e) => patch(r.id, 'label', e.target.value)} className={inputCls} />
              <div className="flex gap-1">
                <button onClick={() => move(idx, -1)} className="w-7 h-7 rounded grid place-items-center border border-white/10 text-slate-400 hover:border-blue-500/40" disabled={idx === 0}><ArrowUp className="w-3 h-3" /></button>
                <button onClick={() => move(idx, 1)} className="w-7 h-7 rounded grid place-items-center border border-white/10 text-slate-400 hover:border-blue-500/40" disabled={idx === rows.length - 1}><ArrowDown className="w-3 h-3" /></button>
              </div>
              <button
                onClick={() => patch(r.id, 'is_active', !r.is_active)}
                className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center border ${r.is_active ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' : 'border-white/10 text-slate-500'}`}
              >
                {r.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <div className="flex justify-end gap-1">
                <button onClick={() => saveRow(r)} className="w-8 h-8 rounded grid place-items-center border border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  {savingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => del(r)} className="w-8 h-8 rounded grid place-items-center border border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {rows.length === 0 && <div className="p-8 text-center text-xs text-slate-500">No categories yet.</div>}
      </div>
    </div>
  );
}

const inputCls =
  'w-full h-9 px-2 rounded-md text-xs outline-none border bg-slate-900/50 border-white/5 focus:border-blue-500/50 text-white';
