import { HeroSection } from '@/components/landing/HeroSection';
import { Navbar } from '@/components/landing/Navbar';
import { ModulesSection } from '@/components/landing/ModulesSection';
import { FeaturesShowcase } from '@/components/landing/FeaturesShowcase';
import { RolesSection } from '@/components/landing/RolesSection';
import { AlgeriaSection } from '@/components/landing/AlgeriaSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ModulesSection />
      <FeaturesShowcase />
      <RolesSection />
      <AlgeriaSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
      <AIChatWidget />
    </div>
  );
};

export default Index;
