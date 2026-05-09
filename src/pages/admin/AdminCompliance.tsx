import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileCheck, 
  Scale, 
  Globe, 
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Calendar
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

const AdminCompliance = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'regulations' | 'reports'>('overview');

  const complianceStatus = {
    overall: 92,
    dataProtection: 100,
    healthRegulations: 95,
    localLaws: 85,
    auditReadiness: 88
  };

  const regulations = [
    {
      id: 1,
      name: 'Algerian Health Data Protection Law',
      status: 'compliant',
      lastAudit: '2024-12-01',
      nextAudit: '2025-03-01',
      description: 'Protection of patient health information in Algeria'
    },
    {
      id: 2,
      name: 'CNAS Data Standards',
      status: 'compliant',
      lastAudit: '2024-11-15',
      nextAudit: '2025-02-15',
      description: 'National social security data formatting requirements'
    },
    {
      id: 3,
      name: 'Pharmacy Operation License',
      status: 'pending',
      lastAudit: '2024-10-01',
      nextAudit: '2025-01-15',
      description: 'Digital pharmacy platform operation compliance'
    },
    {
      id: 4,
      name: 'Patient Consent Requirements',
      status: 'compliant',
      lastAudit: '2024-12-10',
      nextAudit: '2025-03-10',
      description: 'Explicit consent for data processing'
    },
    {
      id: 5,
      name: 'AI Ethics Guidelines',
      status: 'review',
      lastAudit: '2024-11-20',
      nextAudit: '2025-02-20',
      description: 'Ethical AI usage in healthcare decisions'
    },
  ];

  const reports = [
    { name: 'Q4 2024 Compliance Report', date: '2024-12-15', type: 'Quarterly', size: '2.4 MB' },
    { name: 'Annual Security Audit', date: '2024-12-01', type: 'Annual', size: '5.1 MB' },
    { name: 'Data Protection Assessment', date: '2024-11-15', type: 'Assessment', size: '1.8 MB' },
    { name: 'User Consent Audit', date: '2024-10-30', type: 'Audit', size: '890 KB' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-success/20 text-success border-success/30">Compliant</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>;
      case 'review':
        return <Badge className="bg-info/20 text-info border-info/30">Under Review</Badge>;
      default:
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Non-Compliant</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-2"
        >
          Compliance <span className="text-gradient">Dashboard</span>
        </motion.h1>
        <p className="text-muted-foreground">
          Algerian healthcare regulations and legal compliance status
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-lg bg-secondary/30 w-fit">
        {['overview', 'regulations', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-secondary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Compliance Score Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <GlowCard glowColor="primary">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <span className="font-medium">Overall Score</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-success">{complianceStatus.overall}%</span>
                <span className="text-sm text-muted-foreground mb-1">compliant</span>
              </div>
              <Progress value={complianceStatus.overall} className="mt-4" />
            </GlowCard>

            <GlowCard glowColor="primary">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Data Protection</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-primary">{complianceStatus.dataProtection}%</span>
              </div>
              <Progress value={complianceStatus.dataProtection} className="mt-4" />
            </GlowCard>

            <GlowCard glowColor="info">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-info" />
                </div>
                <span className="font-medium">Health Regulations</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-info">{complianceStatus.healthRegulations}%</span>
              </div>
              <Progress value={complianceStatus.healthRegulations} className="mt-4" />
            </GlowCard>

            <GlowCard glowColor="warning">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-warning" />
                </div>
                <span className="font-medium">Local Laws</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-warning">{complianceStatus.localLaws}%</span>
              </div>
              <Progress value={complianceStatus.localLaws} className="mt-4" />
            </GlowCard>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card-elevated p-6"
            >
              <h3 className="font-semibold mb-4">Compliance Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">Compliant</span>
                  </div>
                  <span className="font-bold">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="font-bold">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm">Non-Compliant</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card-elevated p-6"
            >
              <h3 className="font-semibold mb-4">Upcoming Audits</h3>
              <div className="space-y-3">
                {regulations.slice(0, 3).map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <span className="text-sm truncate flex-1">{reg.name}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(reg.nextAudit).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card-elevated p-6"
            >
              <h3 className="font-semibold mb-4">Key Principles</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/10">
                  <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Data sovereignty within Algeria</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-info/10">
                  <FileCheck className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                  <span>Patient consent for all processing</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-success/10">
                  <Scale className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>AI explainability in decisions</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {activeTab === 'regulations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">Regulatory Requirements</h2>
            <Button variant="outline" size="sm">
              Add Regulation
            </Button>
          </div>

          <div className="space-y-4">
            {regulations.map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-secondary/20 border border-border/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{reg.name}</h3>
                    <p className="text-sm text-muted-foreground">{reg.description}</p>
                  </div>
                  {getStatusBadge(reg.status)}
                </div>
                <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last: {new Date(reg.lastAudit).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Next: {new Date(reg.nextAudit).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'reports' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">Compliance Reports</h2>
            <Button>
              Generate Report
            </Button>
          </div>

          <div className="space-y-3">
            {reports.map((report, index) => (
              <motion.div
                key={report.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{report.name}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{report.type}</span>
                      <span>{report.date}</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <AIChatWidget userRole="admin" />
    </AdminLayout>
  );
};

export default AdminCompliance;
