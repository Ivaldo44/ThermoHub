import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Equipment, Sector, Unit } from '../types';
import { Plus, Database, Power, Trash2, Edit } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { supabase } from '../lib/supabase';

const equipSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  type: z.string().min(1, 'Selecione um tipo'),
  sector_id: z.string().min(1, 'Selecione um setor'),
  unit_id: z.string().min(1, 'Selecione uma unidade'),
  min_temp: z.string().refine((val) => !isNaN(Number(val)), 'Número inválido'),
  max_temp: z.string().refine((val) => !isNaN(Number(val)), 'Número inválido'),
});

export default function EquipmentManager() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const form = useForm<z.infer<typeof equipSchema>>({
    resolver: zodResolver(equipSchema),
    defaultValues: {
      name: '',
      type: '',
      sector_id: '',
      unit_id: '',
      min_temp: '',
      max_temp: '',
    },
  });

  const fetchData = async () => {
    try {
      const [equipRes, sectorRes, unitRes] = await Promise.all([
        supabase.from('equipment').select('*, sectors(name), units(name)').order('name'),
        supabase.from('sectors').select('*').order('name'),
        supabase.from('units').select('*').order('name')
      ]);

      if (equipRes.error) console.error('Erro ao buscar equipamentos:', equipRes.error);
      
      const formattedEquip = (equipRes.data || []).map((e: any) => ({
        ...e,
        sector_name: e.sectors?.name,
        unit_name: e.units?.name
      }));

      setEquipment(formattedEquip);
      setSectors(sectorRes.data || []);
      setUnits(unitRes.data || []);
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedSectors = async () => {
    const initialSectors = [
      { name: 'Imunoquímica' },
      { name: 'Hematologia' },
      { name: 'Microbiologia' },
      { name: 'Triagem' },
      { name: 'Almoxarifado' }
    ];
    
    const { error } = await supabase.from('sectors').insert(initialSectors);
    if (!error) {
      fetchData();
    } else {
      console.error('Erro ao popular setores:', error);
      alert('Certifique-se de que a tabela "sectors" foi criada no Supabase.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function onSubmit(values: z.infer<typeof equipSchema>) {
    try {
      const payload = {
        name: values.name,
        type: values.type,
        sector_id: parseInt(values.sector_id),
        unit_id: parseInt(values.unit_id),
        min_temp: parseFloat(values.min_temp),
        max_temp: parseFloat(values.max_temp),
        is_active: editingEquipment ? editingEquipment.is_active : true
      };

      let error;
      if (editingEquipment) {
        const res = await supabase
          .from('equipment')
          .update(payload)
          .eq('id', editingEquipment.id);
        error = res.error;
      } else {
        const res = await supabase.from('equipment').insert([payload]);
        error = res.error;
      }
      
      if (!error) {
        setIsDialogOpen(false);
        setEditingEquipment(null);
        form.reset({
          name: '',
          type: '',
          sector_id: '',
          unit_id: '',
          min_temp: '',
          max_temp: '',
        });
        fetchData();
      } else {
        console.error('Erro ao salvar equipamento:', error);
        alert('Erro ao salvar equipamento. Verifique se a tabela "units" existe.');
      }
    } catch (error) {
      console.error(error);
    }
  }

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('equipment')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchData();
  };

  const deleteEquipment = async (id: number) => {
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir equipamento:', error);
    } else {
      fetchData();
    }
  };

  const openEditDialog = (equip: Equipment) => {
    setEditingEquipment(equip);
    form.reset({
      name: equip.name,
      type: equip.type,
      sector_id: equip.sector_id?.toString() || '',
      unit_id: equip.unit_id?.toString() || '',
      min_temp: equip.min_temp?.toString() || '',
      max_temp: equip.max_temp?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Equipamentos</h2>
          <p className="text-zinc-500">Cadastre e gerencie os equipamentos monitorados.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingEquipment(null);
            form.reset({
              name: '',
              type: '',
              sector_id: '',
              unit_id: '',
              min_temp: '',
              max_temp: '',
            });
          }
        }}>
          <DialogTrigger render={
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Novo Equipamento
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEquipment ? 'Editar Equipamento' : 'Adicionar Equipamento'}</DialogTitle>
              <DialogDescription>
                {editingEquipment ? 'Atualize as configurações do equipamento.' : 'Configure os limites de temperatura para o novo equipamento.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Equipamento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Geladeira Reagentes 01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a unidade">
                                {units.find(u => u.id?.toString() === field.value)?.name}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.length === 0 ? (
                              <div className="p-2 text-xs text-center text-zinc-500">
                                Nenhuma unidade cadastrada.
                              </div>
                            ) : (
                              units.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sector_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor">
                                {sectors.find(s => s.id?.toString() === field.value)?.name}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sectors.length === 0 ? (
                              <div className="p-2 text-xs text-center text-zinc-500">
                                <p>Nenhum setor cadastrado.</p>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="h-auto p-0 text-blue-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    seedSectors();
                                  }}
                                >
                                  Clique aqui para popular
                                </Button>
                              </div>
                            ) : (
                              sectors.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Geladeira">Geladeira</SelectItem>
                          <SelectItem value="Freezer">Freezer</SelectItem>
                          <SelectItem value="Ambiente">Ambiente</SelectItem>
                          <SelectItem value="Incubadora">Incubadora</SelectItem>
                          <SelectItem value="Estufa">Estufa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="min_temp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mínima (°C)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_temp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máxima (°C)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingEquipment ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead>Equipamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Faixa Operacional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-zinc-100 animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                    Nenhum equipamento cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                equipment.map((item) => (
                  <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                          <Database className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="font-medium text-zinc-900">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600">{item.type}</TableCell>
                    <TableCell className="text-zinc-600">{item.unit_name || '-'}</TableCell>
                    <TableCell className="text-zinc-600">{item.sector_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-zinc-50">
                        {item.min_temp}°C a {item.max_temp}°C
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge className="bg-green-50 text-green-700 border-green-100 font-normal">Ativo</Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 font-normal">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                          onClick={() => openEditDialog(item)}
                          title="Editar Equipamento"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-red-600"
                          onClick={() => deleteEquipment(item.id)}
                          title="Excluir Equipamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-8 w-8 transition-colors",
                            item.is_active ? "text-green-600 hover:text-zinc-400" : "text-zinc-400 hover:text-green-600"
                          )}
                          onClick={() => toggleStatus(item.id, item.is_active)}
                          title={item.is_active ? "Desativar" : "Ativar"}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
