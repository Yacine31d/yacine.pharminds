import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Building,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

const AdminUserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  /* ── confirm-delete dialog state ── */
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  /* ── update role ─────────────────────────────────────────── */
  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      /* 1. Update profiles table */
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw new Error(profileError.message);
      }

      /* 2. Upsert user_roles (row may not exist yet) */
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' });

      if (roleError) {
        console.error('user_roles upsert error:', roleError);
        // Non-blocking — profile already updated
        toast.warning(`Role changed to ${newRole}, but user_roles sync failed: ${roleError.message}`);
      } else {
        toast.success(`Rôle mis à jour : ${newRole}`);
      }

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(`Échec de la mise à jour : ${error.message ?? 'Erreur inconnue'}`);
    }
  };

  /* ── remove user ─────────────────────────────────────────── */
  const handleRemoveUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      /* Deleting from profiles cascades to all related data.
         The auth.users entry is retained (requires service-role to delete).
         The user will be unable to access the app without a profile. */
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', deleteTarget.user_id);

      if (error) throw new Error(error.message);

      toast.success(`Utilisateur "${deleteTarget.full_name || deleteTarget.email}" supprimé`);
      setUsers(prev => prev.filter(u => u.user_id !== deleteTarget.user_id));
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Échec de la suppression : ${error.message ?? 'Erreur inconnue'}`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ── filtering ───────────────────────────────────────────── */
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.wilaya?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.pharmacy_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':      return 'destructive';
      case 'pharmacist': return 'default';
      case 'patient':    return 'secondary';
      default:           return 'outline';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':      return <Shield className="w-3 h-3" />;
      case 'pharmacist': return <Building className="w-3 h-3" />;
      case 'patient':    return <UserCheck className="w-3 h-3" />;
      default:           return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage all users across the platform
            </p>
          </div>
          <Badge variant="outline" className="text-sm self-start">
            {users.length} Total Users
          </Badge>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, pharmacy, or wilaya..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/50"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] bg-secondary/30 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="pharmacist">Pharmacists</SelectItem>
              <SelectItem value="patient">Patients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-foreground font-bold text-sm">
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {user.wilaya && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{user.wilaya}</span>
                            </div>
                          )}
                          {user.pharmacy_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building className="w-3 h-3" />
                              <span>{user.pharmacy_name}</span>
                            </div>
                          )}
                          {!user.wilaya && !user.pharmacy_name && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                          {getRoleIcon(user.role)}
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateUserRole(user.user_id, 'admin')}
                                disabled={user.role === 'admin'}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateUserRole(user.user_id, 'pharmacist')}
                                disabled={user.role === 'pharmacist'}
                              >
                                <Building className="w-4 h-4 mr-2" />
                                Make Pharmacist
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateUserRole(user.user_id, 'patient')}
                                disabled={user.role === 'patient'}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Make Patient
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Confirm Delete Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Supprimer l'utilisateur
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{' '}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>.
              <br />
              Toutes ses données (ordonnances, médicaments, inventaire) seront définitivement supprimées.
              Cette action est <strong>irréversible</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUserManagement;
