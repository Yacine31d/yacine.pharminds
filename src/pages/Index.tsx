import { HeroSection } from '@/components/landing/HeroSection';
import { ModulesSection } from '@/components/landing/ModulesSection';
import { RolesSection } from '@/components/landing/RolesSection';
import { AlgeriaSection } from '@/components/landing/AlgeriaSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <ModulesSection />
      <RolesSection />
      <AlgeriaSection />
      <FAQSection />
      <CTASection />
      <Footer />
      <AIChatWidget />
    </div>
  );
};

export default Index;
