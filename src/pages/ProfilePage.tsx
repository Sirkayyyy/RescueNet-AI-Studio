import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import API from '../services/api.js';
import { User as UserIcon, Phone, Plus, Trash2, HeartHandshake, Shield, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [loading, setLoading] = useState(false);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);

    try {
      await API.post('/auth/contacts', { name, phone, relationship });
      await refreshUser();
      setName('');
      setPhone('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adding contact');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = async (id: string) => {
    try {
      await API.delete(`/auth/contacts/${id}`);
      await refreshUser();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting contact');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* User Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shadow-inner">
            <UserIcon className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{user?.name}</h1>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Role: {user?.role}
              </span>
              {user?.phone && (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-red-400" /> {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-red-400" />
              Personal Emergency Contacts
            </h2>
            <p className="text-xs text-slate-400">
              Direct contacts accessible for one-tap calling and automatically linked to your SOS dispatches.
            </p>
          </div>
        </div>

        {/* Existing Contacts List */}
        <div className="space-y-2.5">
          {user?.emergencyContacts?.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No personal contacts registered yet.</p>
          ) : (
            user?.emergencyContacts?.map((c) => (
              <div
                key={c._id}
                className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between transition hover:border-slate-700"
              >
                <div>
                  <div className="text-sm font-bold text-white">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    <span className="text-slate-300 font-semibold">{c.relationship}</span> • {c.phone}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <button
                    onClick={() => handleRemoveContact(c._id)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800 transition"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Contact Form */}
        <form onSubmit={handleAddContact} className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            required
            placeholder="Contact Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
          <input
            type="tel"
            required
            placeholder="Phone (e.g. +1 555-019-2834)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
          />
          <div className="flex gap-2">
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            >
              <option value="Family">Family</option>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Physician">Physician</option>
              <option value="Colleague">Colleague</option>
              <option value="Neighbor">Neighbor</option>
              <option value="Guardian">Guardian</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50 cursor-pointer shadow-md"
              title="Save Contact"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
