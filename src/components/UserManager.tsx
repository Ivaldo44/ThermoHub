import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { UserPlus, Trash2, Shield, User, Building2, Mail, Plus, MapPin, Thermometer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, Sector, Unit, Equipment } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

import { cn } from '../lib/utils';

const userSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'operator', 'viewer']),
  sector_id: z.string().min(1, 'Selecione um setor'),
});

const sectorSchema = z.object({
  name: z.string().min(2, 'Nome do setor deve ter pelo menos 2 caracteres'),
});

const unitSchema = z.object({
  name: z.string().min(2, 'Nome da unidade deve ter pelo menos 2 caracteres'),
});

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'operator',
      sector_id: '',
    },
  });

  const sectorForm = useForm<z.infer<typeof sectorSchema>>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      name: '',
    },
  });

  const unitForm = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, sectorsRes, unitsRes, equipmentRes] = await Promise.all([
        supabase.from('profiles').select('*, sectors(name)').order('full_name'),
        supabase.from('sectors').select('*').order('name'),
        supabase.from('units').select('*').order('name'),
        supabase.from('equipment').select('*, sectors(name), units(name)').order('name'),
      ]);

      if (profilesRes.error) console.error('Erro ao buscar perfis:', profilesRes.error);
      if (sectorsRes.error) console.error('Erro ao buscar setores:', sectorsRes.error);
      if (unitsRes.error) console.error('Erro ao buscar unidades:', unitsRes.error);
      if (equipmentRes.error) console.error('Erro ao buscar equipamentos:', equipmentRes.error);

      const formattedProfiles = (profilesRes.data || []).map((p: any) => ({
        ...p,
        sector_name: p.sectors?.name,
      }));

      const formattedEquipment = (equipmentRes.data || []).map((e: any) => ({
        ...e,
        sector_name: e.sectors?.name,
        unit_name: e.units?.name,
      }));

      setUsers(formattedProfiles);
      setSectors(sectorsRes.data || []);
      setUnits(unitsRes.data || []);
      setEquipment(formattedEquipment);
    } catch (error) {
      console.error('Erro geral ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function onUserSubmit(values: z.infer<typeof userSchema>) {
    console.log('Submitting user:', values);
    try {
      const { error } = await supabase.from('profiles').insert([{
        full_name: values.full_name,
        email: values.email,
        role: values.role,
        sector_id: parseInt(values.sector_id),
      }]);

      if (error) {
        console.error('Supabase error:', error);
        alert(`Erro do Supabase: ${error.message}`);
        throw error;
      }
      
      console.log('User saved successfully');
      setIsUserDialogOpen(false);
      userForm.reset();
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário. Verifique o console para mais detalhes.');
    }
  }

  async function onSectorSubmit(values: z.infer<typeof sectorSchema>) {
    try {
      const { error } = await supabase.from('sectors').insert([{
        name: values.name,
      }]);

      if (error) throw error;
      
      setIsSectorDialogOpen(false);
      sectorForm.reset();
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar setor:', error);
    }
  }

  async function onUnitSubmit(values: z.infer<typeof unitSchema>) {
    try {
      const { error } = await supabase.from('units').insert([{
        name: values.name,
      }]);

      if (error) throw error;
      
      setIsUnitDialogOpen(false);
      unitForm.reset();
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar unidade:', error);
    }
  }

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) fetchData();
  };

  const deleteSector = async (id: number) => {
    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (!error) fetchData();
  };

  const deleteUnit = async (id: number) => {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (!error) fetchData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Equipe e Setores</h2>
        <p className="text-zinc-500">Gerencie os membros da equipe e a estrutura organizacional.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-zinc-100 p-1 mb-4">
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Usuários
          </TabsTrigger>
          <TabsTrigger value="units" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Unidades
          </TabsTrigger>
          <TabsTrigger value="sectors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Setores
          </TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Equipamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Membro</DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form 
                    onSubmit={(e) => {
                      console.log('Form submit triggered');
                      userForm.handleSubmit(onUserSubmit, (errors) => {
                        console.error('Validation errors:', errors);
                      })(e);
                    }} 
                    className="space-y-4"
                  >
                    <FormField
                      control={userForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: João Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input placeholder="joao@laboratorio.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="operator">Operador</SelectItem>
                                <SelectItem value="viewer">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={userForm.control}
                        name="sector_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Setor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione">
                                    {sectors.find(s => s.id.toString() === field.value)?.name}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sectors.length === 0 ? (
                                  <div className="p-2 text-xs text-zinc-500 text-center">
                                    Nenhum setor cadastrado. <br/>
                                    Crie um setor primeiro na aba "Setores".
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
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Salvar Usuário</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-green-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600 hover:bg-green-600">
                  <TableHead className="text-white font-bold py-4">Usuário</TableHead>
                  <TableHead className="text-white font-bold py-4">E-mail</TableHead>
                  <TableHead className="text-white font-bold py-4">Setor</TableHead>
                  <TableHead className="text-white font-bold py-4">Função</TableHead>
                  <TableHead className="text-white font-bold py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-400">Carregando usuários...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-400">Nenhum usuário cadastrado.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-green-50/30 transition-colors group">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                            {(user.full_name || 'Usuário').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-900">{user.full_name || 'Sem nome'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Building2 className="w-3 h-3 text-zinc-400" />
                          {user.sector_name}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={cn(
                          "gap-1 font-medium",
                          user.role === 'admin' ? "border-purple-200 bg-purple-50 text-purple-700" :
                          user.role === 'operator' ? "border-blue-200 bg-blue-50 text-blue-700" :
                          "border-zinc-200 bg-zinc-50 text-zinc-700"
                        )}>
                          <Shield className="w-3 h-3" />
                          {user.role === 'admin' ? 'Admin' : user.role === 'operator' ? 'Operador' : 'Visualizador'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isSectorDialogOpen} onOpenChange={setIsSectorDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  Novo Setor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Setor</DialogTitle>
                </DialogHeader>
                <Form {...sectorForm}>
                  <form onSubmit={sectorForm.handleSubmit(onSectorSubmit)} className="space-y-4">
                    <FormField
                      control={sectorForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Setor</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Microbiologia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Salvar Setor</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-green-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600 hover:bg-green-600">
                  <TableHead className="text-white font-bold py-4">Nome do Setor</TableHead>
                  <TableHead className="text-white font-bold py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-zinc-400">Carregando setores...</TableCell>
                  </TableRow>
                ) : sectors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-zinc-400">Nenhum setor cadastrado.</TableCell>
                  </TableRow>
                ) : (
                  sectors.map((sector) => (
                    <TableRow key={sector.id} className="hover:bg-green-50/30 transition-colors group">
                      <TableCell className="py-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-green-600" />
                          {sector.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteSector(sector.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Unidade</DialogTitle>
                </DialogHeader>
                <Form {...unitForm}>
                  <form onSubmit={unitForm.handleSubmit(onUnitSubmit)} className="space-y-4">
                    <FormField
                      control={unitForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Unidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Unidade Central" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Salvar Unidade</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-green-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600 hover:bg-green-600">
                  <TableHead className="text-white font-bold py-4">Nome da Unidade</TableHead>
                  <TableHead className="text-white font-bold py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-zinc-400">Carregando unidades...</TableCell>
                  </TableRow>
                ) : units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-zinc-400">Nenhuma unidade cadastrada.</TableCell>
                  </TableRow>
                ) : (
                  units.map((unit) => (
                    <TableRow key={unit.id} className="hover:bg-green-50/30 transition-colors group">
                      <TableCell className="py-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-green-600" />
                          {unit.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteUnit(unit.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card className="border-green-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600 hover:bg-green-600">
                  <TableHead className="text-white font-bold py-4">Equipamento</TableHead>
                  <TableHead className="text-white font-bold py-4">Unidade</TableHead>
                  <TableHead className="text-white font-bold py-4">Setor</TableHead>
                  <TableHead className="text-white font-bold py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-zinc-400">Carregando equipamentos...</TableCell>
                  </TableRow>
                ) : equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-zinc-400">Nenhum equipamento cadastrado.</TableCell>
                  </TableRow>
                ) : (
                  equipment.map((item) => (
                    <TableRow key={item.id} className="hover:bg-green-50/30 transition-colors group">
                      <TableCell className="py-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <Thermometer className="w-4 h-4 text-green-600" />
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 py-4">{item.unit_name || '-'}</TableCell>
                      <TableCell className="text-zinc-600 py-4">{item.sector_name || '-'}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
