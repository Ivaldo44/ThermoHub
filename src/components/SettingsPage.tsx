import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../lib/supabase';
import { Sector, Unit } from '../types';
import { Plus, Trash2, Save, Building } from 'lucide-react';

export default function SettingsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [newSectorName, setNewSectorName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [editingSectorId, setEditingSectorId] = useState<number | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // System Parameters State
  const [unitName, setUnitName] = useState('Laboratório Central');
  const [alertInterval, setAlertInterval] = useState('60');
  const [savingParams, setSavingParams] = useState(false);

  const fetchSectors = async () => {
    const { data, error } = await supabase.from('sectors').select('*').order('name');
    if (!error) setSectors(data || []);
  };

  const fetchUnits = async () => {
    const { data, error } = await supabase.from('units').select('*').order('name');
    if (!error) setUnits(data || []);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (!error && data) {
      setUnitName(data.unit_name);
      setAlertInterval(data.alert_interval_minutes?.toString() || '60');
    } else if (error && error.code === 'PGRST116') {
      console.warn('Configurações não encontradas no Supabase. Usando padrões.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSectors(), fetchUnits(), fetchSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  const addSector = async () => {
    if (!newSectorName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('sectors').insert([{ name: newSectorName.trim() }]);
    if (!error) {
      setNewSectorName('');
      fetchSectors();
    }
    setSaving(false);
  };

  const addUnit = async () => {
    if (!newUnitName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('units').insert([{ name: newUnitName.trim() }]);
    if (!error) {
      setNewUnitName('');
      fetchUnits();
    }
    setSaving(false);
  };

  const updateSector = async () => {
    if (!editName.trim() || editingSectorId === null) return;
    setSaving(true);
    const { error } = await supabase
      .from('sectors')
      .update({ name: editName.trim() })
      .eq('id', editingSectorId);
    
    if (!error) {
      setEditingSectorId(null);
      setEditName('');
      fetchSectors();
    }
    setSaving(false);
  };

  const updateUnit = async () => {
    if (!editName.trim() || editingUnitId === null) return;
    setSaving(true);
    const { error } = await supabase
      .from('units')
      .update({ name: editName.trim() })
      .eq('id', editingUnitId);
    
    if (!error) {
      setEditingUnitId(null);
      setEditName('');
      fetchUnits();
    }
    setSaving(false);
  };

  const deleteSector = async (id: number) => {
    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir setor:', error);
    } else {
      fetchSectors();
    }
  };

  const deleteUnit = async (id: number) => {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir unidade:', error);
    } else {
      fetchUnits();
    }
  };

  const saveSystemParams = async () => {
    setSavingParams(true);
    const { error } = await supabase.from('system_settings').upsert({
      id: 1,
      unit_name: unitName,
      alert_interval_minutes: parseInt(alertInterval)
    });

    if (error) {
      console.error('Erro ao salvar configurações:', error);
    }
    setSavingParams(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h2>
        <p className="text-zinc-500">Gerencie setores, usuários e parâmetros globais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gestão de Unidades</CardTitle>
            <CardDescription>Adicione ou remova unidades hospitalares.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nome da nova unidade" 
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
              <Button onClick={addUnit} disabled={saving} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-zinc-100 rounded" />
                </div>
              ) : units.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">Nenhuma unidade cadastrada.</p>
              ) : (
                units.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-2 border rounded-md bg-zinc-50">
                    <div className="flex items-center gap-2 flex-1">
                      <Building className="w-4 h-4 text-zinc-400" />
                      {editingUnitId === unit.id ? (
                        <Input 
                          size="sm"
                          className="h-7 text-sm py-0"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateUnit();
                            if (e.key === 'Escape') setEditingUnitId(null);
                          }}
                        />
                      ) : (
                        <span className="text-sm font-medium">{unit.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingUnitId === unit.id ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={updateUnit}
                        >
                          <Plus className="w-4 h-4 rotate-45 scale-125" /> {/* Using Plus as a checkmark alternative or just Save icon */}
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                          onClick={() => {
                            setEditingUnitId(unit.id);
                            setEditName(unit.name);
                          }}
                        >
                          <Plus className="w-4 h-4 rotate-45" /> {/* Using Plus rotated as Edit or just use a proper icon */}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-red-600"
                        onClick={() => deleteUnit(unit.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gestão de Setores</CardTitle>
            <CardDescription>Adicione ou remova setores do laboratório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nome do novo setor" 
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
              />
              <Button onClick={addSector} disabled={saving} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-zinc-100 rounded" />
                </div>
              ) : sectors.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">Nenhum setor cadastrado.</p>
              ) : (
                sectors.map(sector => (
                  <div key={sector.id} className="flex items-center justify-between p-2 border rounded-md bg-zinc-50">
                    <div className="flex-1">
                      {editingSectorId === sector.id ? (
                        <Input 
                          size="sm"
                          className="h-7 text-sm py-0"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateSector();
                            if (e.key === 'Escape') setEditingSectorId(null);
                          }}
                        />
                      ) : (
                        <span className="text-sm font-medium">{sector.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingSectorId === sector.id ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={updateSector}
                        >
                          <Plus className="w-4 h-4 rotate-45 scale-125" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                          onClick={() => {
                            setEditingSectorId(sector.id);
                            setEditName(sector.name);
                          }}
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-red-600"
                        onClick={() => deleteSector(sector.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parâmetros do Sistema</CardTitle>
            <CardDescription>Configurações de exibição e alertas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Unidade Principal</Label>
              <Input 
                value={unitName} 
                onChange={(e) => setUnitName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo de Alerta (minutos)</Label>
              <Input 
                type="number" 
                value={alertInterval}
                onChange={(e) => setAlertInterval(e.target.value)}
              />
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={saveSystemParams}
              disabled={savingParams}
            >
              <Save className="w-4 h-4" />
              {savingParams ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
