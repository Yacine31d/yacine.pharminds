import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { PrescriptionScanner } from '@/components/pharmacist/PrescriptionScanner';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

export default function PharmacistScan() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Scan <span className="text-gradient">Ordonnance</span>
            </h1>
          </motion.div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            OCR TrOCR affiné — reconnaissance de prescriptions manuscrites algériennes
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PrescriptionScanner />
        </motion.div>
      </main>

      <AIChatWidget userRole="pharmacist" />
    </div>
  );
}
