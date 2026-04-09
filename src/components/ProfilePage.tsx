import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Mail, Shield, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, sectors(name)')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile({
            ...data,
            sector_name: data.sectors?.name
          });
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-zinc-500">Gerencie suas informações pessoais e preferências.</p>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="border-b bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold border-2 border-white shadow-sm overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.full_name?.substring(0, 2).toUpperCase() || 'U'
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full border shadow-sm text-zinc-500 hover:text-green-600 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <CardTitle>{profile?.full_name || 'Usuário'}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <Input 
                    id="name" 
                    value={profile?.full_name || ''} 
                    onChange={(e) => setProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                    className="pl-10"
                  />
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (Não alterável)</Label>
                <div className="relative">
                  <Input id="email" value={profile?.email || ''} disabled className="pl-10 bg-zinc-50" />
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Função</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border rounded-md text-sm text-zinc-600">
                    <Shield className="w-4 h-4 text-zinc-400" />
                    <span className="capitalize">{profile?.role || 'Visualizador'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border rounded-md text-sm text-zinc-600">
                    <span className="capitalize">{profile?.sector_name || 'Não atribuído'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">URL da Foto de Perfil</Label>
                <Input 
                  id="avatar" 
                  placeholder="https://exemplo.com/foto.jpg" 
                  value={profile?.avatar_url || ''} 
                  onChange={(e) => setProfile(prev => prev ? {...prev, avatar_url: e.target.value} : null)}
                />
                <p className="text-[10px] text-zinc-400">Insira um link direto para uma imagem.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
