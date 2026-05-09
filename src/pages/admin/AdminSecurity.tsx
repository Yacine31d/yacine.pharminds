import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  Key,
  UserX,
  Activity,
  Clock,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'role_change';
  user: string;
  timestamp: string;
  ip: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
}

const AdminSecurity = () => {
  const [securityScore, setSecurityScore] = useState(85);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate mock security events
    const mockEvents: SecurityEvent[] = [
      { id: '1', type: 'login', user: 'admin@pharma.dz', timestamp: new Date().toISOString(), ip: '197.200.10.45', location: 'Alger', severity: 'low' },
      { id: '2', type: 'failed_login', user: 'unknown@test.com', timestamp: new Date(Date.now() - 3600000).toISOString(), ip: '41.200.23.12', location: 'Oran', severity: 'high' },
      { id: '3', type: 'password_change', user: 'pharmacist@pharma.dz', timestamp: new Date(Date.now() - 7200000).toISOString(), ip: '197.200.15.78', location: 'Constantine', severity: 'medium' },
      { id: '4', type: 'role_change', user: 'user@pharma.dz', timestamp: new Date(Date.now() - 10800000).toISOString(), ip: '197.200.10.45', location: 'Alger', severity: 'medium' },
      { id: '5', type: 'logout', user: 'patient@pharma.dz', timestamp: new Date(Date.now() - 14400000).toISOString(), ip: '197.200.20.33', location: 'Blida', severity: 'low' },
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  const securityChecks = [
    { label: 'Database Encryption', status: true, description: 'AES-256 encryption enabled' },
    { label: 'RLS Policies', status: true, description: 'Row Level Security active' },
    { label: 'OAuth2 Authentication', status: true, description: 'Secure login protocols' },
    { label: 'Audit Logging', status: true, description: 'All actions tracked' },
    { label: '2FA Enabled', status: false, description: 'Two-factor auth not configured' },
    { label: 'API Rate Limiting', status: true, description: 'Protection against abuse' },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'logout': return <Eye className="w-4 h-4 text-muted-foreground" />;
      case 'failed_login': return <UserX className="w-4 h-4 text-destructive" />;
      case 'password_change': return <Key className="w-4 h-4 text-warning" />;
      case 'role_change': return <Shield className="w-4 h-4 text-info" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-success/20 text-success';
      case 'medium': return 'bg-warning/20 text-warning';
      case 'high': return 'bg-destructive/20 text-destructive';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
        >
          Security <span className="text-gradient">Center</span>
        </motion.h1>
        <p className="text-sm md:text-base text-muted-foreground">
          System security monitoring and audit logs
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Security Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold">Security Score</h2>
              <p className="text-sm text-muted-foreground">Overall system health</p>
            </div>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="10"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--success))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 * (1 - securityScore / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold text-success">{securityScore}%</span>
                <span className="text-xs text-muted-foreground">Secure</span>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4">
            Run Security Scan
          </Button>
        </motion.div>

        {/* Security Checks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-elevated p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Security Checklist</h2>
              <p className="text-sm text-muted-foreground">Compliance status</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {securityChecks.map((check, index) => (
              <motion.div
                key={check.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  check.status ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
                }`}
              >
                {check.status ? (
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Security Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-elevated p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold">Security Events</h2>
              <p className="text-sm text-muted-foreground">Recent authentication & security logs</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Export Logs
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Event</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Severity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <motion.tr
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/30 hover:bg-secondary/20"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.type)}
                      <span className="text-sm capitalize">{event.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{event.user}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-muted-foreground">{event.ip}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AIChatWidget userRole="admin" />
    </AdminLayout>
  );
};

export default AdminSecurity;
